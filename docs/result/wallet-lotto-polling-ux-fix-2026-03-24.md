# WLT-01 — 지갑 잔액 polling / 로또 낙관적 업데이트 / 페이지 전환 버그 수정

> 작성일: 2026-03-24
> 브랜치: BE
> 변경 범위: FE-ssatto (BE·DB·blockchain 무변경)

---

## Overview — 무엇을 왜 했는가

스크린샷에 나타난 세 가지 결함을 FE 레이어만 수정해 해결했다.

| 코드 | 현상 | 원인 |
|------|------|------|
| S1 | 교환 성공 후 지갑 잔액이 즉시 갱신되지 않음 | `handleExchangeJackToPot` 완료 후 polling refetch를 트리거하지 않았음 |
| S2 | 로또 참여 후 POT 잔액이 즉시 차감되지 않음 | 낙관적 업데이트 미구현; 블록 확정 전까지 UI 반응 없음 |
| S3 | 로또 → 지갑 페이지 이동 시 401→400 이중 refresh + 잠재적 빈 화면 | `activeWalletIndex` 초기값 `0`으로 두면 마운트 시 session restore effect가 두 번 실행됨 (wallets[0] → activeAddress 지갑 순) |

---

## 근본 원인 분석

### S3 (401→400 cascade)

`WalletPage.tsx` 에서 `activeWalletIndex` 를 `useState(0)` 으로 초기화했다.
마운트 직후 두 개의 effect가 거의 동시에 실행된다.

1. **`setActiveWalletIndex` effect** (`[activeAddress, wallets]` dep):
   `wallets.findIndex(activeAddress)` → 올바른 인덱스로 state 업데이트 → re-render 발생
2. **session restore effect** (`[activeWallet?.walletId, ...]` dep):
   첫 render 에서 `wallets[0]` walletId로 한 번 실행,
   re-render 후 `wallets[correctIndex]` walletId로 다시 실행
   → **두 개의 `POST /auth/refresh` 요청이 서로 다른 sessionHandle로 전송됨**
   - 첫 번째: 서버에서 세션 만료 처리 → 401
   - 두 번째: 이미 무효화된 handle로 재시도 → 400

**Fix**: `useState` lazy initializer 를 사용해 `activeWalletIndex` 를 초기 렌더링 시부터 정확한 인덱스로 설정 → session restore effect가 한 번만 실행됨.

---

## Changed Files

### 1. `FE-ssatto/src/hooks/useLottoOverview.ts`

**변경 내용**: `usePollingQuery` 의 `refetch` 를 외부로 노출
**이유**: LottoPage 에서 commit/claim 성공 직후 즉시 refetch 를 트리거할 수 있어야 하기 때문

```diff
- interface UseLottoOverviewResult {
-   overview: LottoOverview | null;
-   isLoading: boolean;
-   error: string | null;
- }
+ interface UseLottoOverviewResult {
+   overview: LottoOverview | null;
+   isLoading: boolean;
+   error: string | null;
+   refetch: () => Promise<void>;
+ }
```

---

### 2. `FE-ssatto/src/pages/WalletPage.tsx`

**변경 내용 (S3)**: `activeWalletIndex` lazy initialization

```diff
- const [activeWalletIndex, setActiveWalletIndex] = useState(0);
+ const [activeWalletIndex, setActiveWalletIndex] = useState(() => {
+   if (!activeAddress) return 0;
+   const idx = wallets.findIndex((w) => w.address === activeAddress);
+   return idx >= 0 ? idx : 0;
+ });
```

**변경 내용 (S1)**: 교환 성공 직후 wallet summaries 즉시 refetch

```diff
- const { walletSummaries } = useWalletSummaries(wallets);
+ const { walletSummaries, refetch: refetchWalletSummaries } = useWalletSummaries(wallets);

  // handleExchangeJackToPot 내부:
  setWriteStatus(`... JACK 교환 트랜잭션을 제출했습니다.`);
+ void refetchWalletSummaries();
```

---

### 3. `FE-ssatto/src/pages/LottoPage.tsx`

**변경 내용 (S2 — 낙관적 업데이트)**:

- `optimisticPotOffset` state 추가 (display 단위, 1 = 1 POT)
- commit 성공 즉시 `-1` 적용 → `potBalance` 표시에 반영
- `overview.potBalance` 가 server polling 에서 변경될 때 `setOptimisticPotOffset(0)` → server 값으로 자동 override

**변경 내용 (S2 — 실패 감지)**:

- entries polling cycle(10s)마다 pending 항목 점검
- pending 항목의 id (`pending-${Date.now()}`) 에 내장된 타임스탬프로 60s timeout 판별
- timeout 감지 시: `setActionStatus("로또 추첨에 실패했습니다.")` + `optimisticPotOffset` 복구

```ts
// entries poll마다 실행
useEffect(() => {
  // pendingEntriesRef (항상 최신값) 에서 confirmed/timed-out 분류
  // timedOutIds가 있으면 실패 알림 + 잔액 복구
}, [entries]); // pendingEntries 는 ref로 읽어 update loop 방지
```

**변경 내용 (S1)**: commit/claim 성공 후 `refetchLottoOverview()` 즉시 호출

```ts
void refetchLottoOverview(); // commit, claim 각각
```

**display**:

```diff
- potBalance={Math.floor((overview?.potBalance ?? 0) / 100_000_000)}
+ potBalance={Math.max(0, Math.floor((overview?.potBalance ?? 0) / 100_000_000) + optimisticPotOffset)}
```

---

## Tests Run

### 시나리오별 Before/After

| # | 시나리오 | Before | After |
|---|---------|--------|-------|
| 1 | 지갑 생성 후 잔액 확인 | 0 POT 고정 | 0 POT 표시 (온보딩 보상 대기 중) |
| 2 | 30~60초 대기 후 잔액 자동 갱신 | 수동 새로고침 필요 | `useWalletSummaries` 10s polling으로 자동 갱신 ✓ |
| 3 | 교환(JACK→POT) 후 즉시 잔액 반영 | 최대 10s 지연 | `refetchWalletSummaries()` 즉시 호출 ✓ |
| 4 | 로또 참여 직후 POT 잔액 변화 | 변화 없음(블록 대기) | optimisticPotOffset -1 → 즉시 차감 표시 ✓ |
| 5 | 지갑→로또→지갑 페이지 전환 | 401→400 cascade, 잠재적 빈화면 | single refresh 시도 (401만), unlock modal 정상 표시 ✓ |
| 6 | 세션 만료 상태 지갑 페이지 진입 | 이중 refresh 전송, 화면 불안정 | lazy init으로 단일 session restore, unlock modal ✓ |

### 네트워크 패턴 (After)

```
GET /wallet?addresses=... → 200 (10s polling 정상)
POST /auth/refresh        → 401 (1회만, 세션 만료 시)
→ unlock modal 표시
activities?size=20        → 200 (polling 정상)
```

---

## Failed / Unresolved

| 항목 | 상태 | 비고 |
|------|------|------|
| `GET /wallet?addresses=Wom...` 404 | **미해결 (BE 이슈)** | FE에서 호출하는 주소가 BE에 미등록된 경우 발생. `usePollingQuery` 가 error를 catch해 UI는 0 잔액으로 graceful degradation 처리됨. BE 지갑 등록 완료 후 자동 복구 |
| 낙관적 실패 감지가 entries polling 의존 | **설계 제약** | 60s timeout 판정은 10s polling 주기에 묶임. 최악 70s 지연. 허용 범위로 판단 |
| activities polling 401 | **미해결** | access token 만료 후 activities는 stale token으로 계속 polling하다 401 반환. session restore 후 자동 복구됨. 세션 복구 중 error 표시는 없음 |

---

## Next Steps

없음 — 요청된 세 가지 결함(S1/S2/S3)이 FE 레이어 내에서 수정 완료.
