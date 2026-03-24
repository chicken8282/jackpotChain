# 지갑 생성 직후 1 POT 잔액 미표시 수정 결과

> 작성일: 2026-03-24
> 수정 계획: `docs/plans/wallet-onboarding-balance-fix.md`

---

## 문제 요약

지갑 최초 생성(온보딩 보상 `grantOnboardingReward: true`) 직후 잔액이 즉시 표시되지 않는 문제.

---

## 근본 원인

### 원인 1 — stale closure (`WalletPage.tsx`)

`persistWallet` 함수가 `upsertWallet()` 직후 `refetchWalletSummaries()` 를 호출했다.

```
upsertWallet(...)             // Zustand 상태 업데이트 (동기)
await refetchWalletSummaries()  // ← React re-render 완료 전 호출
```

`refetchWalletSummaries` 는 `useEffectEvent` 로 감싸진 `execute` 를 호출하는데,
`useEffectEvent` 는 "마지막 커밋된 렌더" 의 값을 읽는다. Re-render 가 완료되지 않은 시점에서는
`queryFn` 이 여전히 `addresses = []` 를 캡처 → `getWallets([])` 호출 → 빈 응답.

### 원인 2 — 두 번째 이상 지갑 추가 시 즉시 갱신 없음 (`useWalletSummaries.ts`)

`usePollingQuery` 의 effect 의존성: `[enabled, intervalMs]`.

- 첫 지갑 (`wallets: [] → [w1]`): `enabled false → true` 전환 시 effect 재실행 → 즉시 `execute()` (이미 처리됨).
- 두 번째 지갑 (`wallets: [w1] → [w1, w2]`): `enabled` 불변 → 다음 interval 틱까지 새 주소가 조회 대상에 미포함.

---

## 수정 내용

### 1. `FE-ssatto/src/hooks/useWalletSummaries.ts`

`queryKey`(addresses 문자열) 변경 시 즉시 `refetch()` 를 트리거하는 `useEffect` 추가.

```ts
useEffect(() => {
  if (addresses.length === 0) return;
  void refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [queryKey]); // refetch는 useEffectEvent 래퍼라 안전
```

- 첫 지갑 추가: `enabled false→true` 로 `usePollingQuery` effect도 재실행. `inFlightRef` 로 중복 실행 차단.
- 두 번째+ 지갑 추가: `queryKey` 변경 → 즉시 refetch, 새 주소 포함.

### 2. `FE-ssatto/src/pages/WalletPage.tsx`

- `await refetchWalletSummaries()` 제거 (stale closure 원인)
  → `upsertWallet()` 이후 re-render 가 트리거되면 `useWalletSummaries` 의 `queryKey` effect 가
    올바른 주소로 즉시 refetch 함.
- `onboardingRewardGranted === true` 메시지 변경:
  - 이전: `"지갑이 등록되었고 1 POT이 지급되었습니다. 바로 로또에 참여할 수 있습니다."`
  - 이후: `"1 POT 생성 중입니다. 잔액이 곧 반영됩니다."`
- `writeStatusTimerRef` 추가: 30초 후 `writeStatus` 자동 해제(타임아웃).
- 미사용 `refetchWalletSummaries` 심볼 제거.

---

## 검증

| 항목 | 결과 | 비고 |
|------|------|------|
| TypeScript 빌드 (`npm run build`) | ✅ PASS | 에러 없음, 5.61s |
| Docker Compose 스택 기동 | ✅ PASS | 전 서비스 healthy (frontend healthcheck 제외 — 기존 이슈) |
| BE `/v1/blockchain/dashboard` 응답 | ✅ 200 | 블록 3,380+ |
| BE `/v1/wallet?addresses=...` 응답 | ✅ 200/404 | API 라우팅 정상 |
| 지갑 생성 UI 런타임 테스트 | ⚠️ 부분 검증 | 아래 참조 |

### 런타임 테스트 제한 사항

`FE-ssatto/nginx.conf` 에서 `/api/` 역방향 프록시 블록이 누락된 상태로 빌드되어
브라우저 → nginx → backend API 연결이 차단됨.

```
# 현재 nginx.conf (미포함)
location /api/ {
    proxy_pass http://backend:8080/;
}
```

이 문제는 오늘 작업 범위 밖의 **기존 설정 이슈**이며, 당 PR 의 로직 변경과 무관하다.
별도 수정 필요 (`proxy_pass http://backend:8080/` 경로 추가, 현재 nginx.conf 반영).

---

## 수정 흐름 정리

```
[지갑 생성 버튼 클릭]
  → registerWalletWithRollback()
  → upsertWallet() → Zustand 업데이트
  → unlockWallet()
  → setWriteStatus("1 POT 생성 중입니다. 잔액이 곧 반영됩니다.")  [onboardingRewardGranted=true]
  → (30초 타이머 시작)
  ← React re-render (wallets: [] → [newWallet])
    → useWalletSummaries queryKey 변경 effect 발화
    → refetch() 호출 → getWallets([newAddress])
    → walletSummaries 갱신 (이 시점에 잔액이 0일 수 있음 — 블록 미확정)
  ← 10초 interval (usePollingQuery) → 블록 확정 후 잔액 1 POT 반영
  ← 30초 후 writeStatus 자동 해제
```

---

## 추가 확인 권장 사항

- `nginx.conf` 에 `/api/` 프록시 블록 추가 후 전체 E2E 시나리오 재검증
- 온보딩 보상 TX 블록 확정 시간(~15–30초) 내 10초 polling 으로 잔액 반영 확인
