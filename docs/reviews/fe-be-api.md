# FE → BE API Polling 정리

> 기준 문서: `FE-ssatto`, `BE-ssatto`, `docs/reviews/api.md`
> 기준일: 2026-03-20

---

## 판단 기준

- **FE polling 구현 여부**: FE가 같은 API를 `setInterval` 등으로 주기 재호출하는지
- **BE polling 구현 여부**: 해당 API 응답을 위해 BE 내부에 별도 polling worker/scheduler가 있는지
- **polling 권장 여부**: 화면 특성상 사용자가 페이지를 열어둔 동안 주기 갱신이 UX에 유리한지
- **권장 재호출 시간(second)**: 권장되는 기본 주기. `-` 는 polling 비권장

현재 코드 기준으로 FE에서 실제 polling이 구현된 것은 대시보드 계열뿐이다.

---

## API별 표

| api명 | polling 구현 여부(FE, BE) | polling 권장 여부 | 권장 재호출 시간(second) |
|------|---------------------------|------------------|--------------------------|
| `POST /api/v1/auth/token` | FE: 아니오 / BE: 아니오 | 아니오 | - |
| `GET /api/v1/blockchain/dashboard` | FE: 예 / BE: 아니오 | 예 | 10 |
| `GET /api/v1/blockchain/blocks/{height}` | FE: 예 / BE: 아니오 | 조건부 | 10 |
| `POST /api/v1/wallet` | FE: 아니오 / BE: 아니오 | 아니오 | - |
| `GET /api/v1/wallet?addresses=...` | FE: 아니오 / BE: 아니오 | 예 | 10 |
| `GET /api/v1/wallet/{address}/activities` | FE: 미구현 / BE: 아니오 | 예 | 10 |
| `POST /api/v1/exchange/jack-to-pot` | FE: 미구현 / BE: 아니오 | 아니오 | - |
| `GET /api/v1/exchange/info?address=...` | FE: 미구현 / BE: 아니오 | 예 | 10 |
| `GET /api/v1/lotto?address=...` | FE: 아니오 / BE: 아니오 | 예 | 10 |
| `POST /api/v1/lotto/commit` | FE: 미구현 / BE: 아니오 | 아니오 | - |
| `GET /api/v1/lotto/entries/{commitHash}/result` | FE: 미구현 / BE: 아니오 | 예 | 10 |
| `POST /api/v1/lotto/claim` | FE: 미구현 / BE: 미구현 | 아니오 | - |
| `GET /api/v1/lotto/entries?address=...` | FE: 미구현 / BE: 아니오 | 예 | 10 |
| `GET /api/v1/mining/blocks?address=...` | FE: 미구현 / BE: 미구현 | 예 | 15 |

> 참고 1: `GET /api/v1/lotto` 는 현재 FE에서 `activeAddress` 변경 시 1회 호출만 하고 있어 polling은 미구현 상태다.
>
> 참고 2: `GET /api/v1/blockchain/blocks/{height}` 는 FE에서 개별 modal polling 용도가 아니라 `dashboard` polling 루프 안에서 최근 블록 개수만큼 재호출되고 있다.

---

## 현재 구현 상태 요약

### FE에서 실제 polling 중인 것

- `GET /api/v1/blockchain/dashboard`
- `GET /api/v1/blockchain/blocks/{height}`

근거:

- `FE-ssatto/src/hooks/useDashboardData.ts` 에서 10초 interval로 `dashboard` 를 다시 호출한다.
- 같은 훅 안에서 내려받은 최근 블록 목록 각각에 대해 `blocks/{height}` 상세를 다시 호출한다.

### FE에서 1회 호출만 하는 것

- `POST /api/v1/auth/token`
- `POST /api/v1/wallet`
- `GET /api/v1/wallet?addresses=...`
- `GET /api/v1/lotto?address=...`

### FE/BE 미구현 또는 미연결 상태

- `GET /api/v1/wallet/{address}/activities`
- `GET /api/v1/exchange/info`
- `POST /api/v1/exchange/jack-to-pot`
- `POST /api/v1/lotto/commit`
- `GET /api/v1/lotto/entries/{commitHash}/result`
- `GET /api/v1/lotto/entries`
- `GET /api/v1/mining/blocks`
- `POST /api/v1/lotto/claim`

---

## 왜 polling을 권장하는가

현재 구조에서는 다음 이유로 polling이 가장 현실적이다.

1. **블록체인 상태가 FE 바깥에서 바뀐다.**  
   채굴, 교환, 로또 결과, 잭팟 풀, 지갑 잔액은 사용자가 아무 행동을 하지 않아도 외부 블록 생성으로 변한다.

2. **SSE/WebSocket이 아직 없다.**  
   현재 FE-BE 통신은 REST 기반이고, BE도 FE로 push하는 채널이 없다.

3. **조회성 화면은 eventual consistency로 충분하다.**  
   대시보드, 잔액, 활동 내역, 로또 결과는 1~15초 내 반영이면 UX상 충분하다.

4. **명령 API는 polling 대상이 아니다.**  
   `POST /wallet`, `POST /lotto/commit`, `POST /exchange/jack-to-pot`, `POST /lotto/claim` 는 1회 요청 후, 관련 조회 API를 invalidation/polling 하는 편이 맞다.

---

## polling 권장인데 아직 구현되지 않은 부분

## 1. `GET /api/v1/wallet?addresses=...`

### 왜 polling 권장인가

- 잔액은 on-chain 상태라 채굴/교환/로또 결과 반영으로 수시 변경된다.
- Wallet UI는 다중 지갑 카드 스위치 구조라 현재 활성 지갑뿐 아니라 등록된 지갑 목록 전체가 최신이어야 한다.

### 어떻게 구현하면 좋은가

- `WalletPage.tsx` 에서 현재 1회 호출만 하는 `getWallets(...)` 를 polling으로 전환
- 기본 주기 10초
- `document.visibilityState !== "visible"` 이면 일시 중지
- `POST /exchange/jack-to-pot`, `POST /lotto/commit`, `POST /lotto/claim` 성공 직후 즉시 refetch

권장 패턴:

```ts
useEffect(() => {
  if (wallets.length === 0) return;

  const load = () => getWallets(wallets.map((wallet) => wallet.address)).then(...);
  void load();

  const intervalId = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      void load();
    }
  }, 10_000);

  return () => window.clearInterval(intervalId);
}, [wallets]);
```

## 2. `GET /api/v1/wallet/{address}/activities`

### 왜 polling 권장인가

- 활동 내역은 블록 확정 후 뒤늦게 들어오는 read-model 성격이다.
- 채굴 보상, 교환, 로또 참여/수령이 다른 화면에서 발생해도 Wallet 활동 리스트에는 자동 반영되어야 한다.

### 어떻게 구현하면 좋은가

- Wallet 페이지에서 active wallet 기준 첫 페이지를 10초 polling
- 무한 스크롤로 내려간 페이지는 polling하지 않고, 첫 페이지(head)만 polling
- 새 activity가 생기면 상단 prepend

추가 권장:

- 필터(`type`) 변경 시 interval 재시작
- 사용자가 목록 하단을 보고 있어도 새 항목 도착 표시 배지 제공

## 3. `GET /api/v1/exchange/info?address=...`

### 왜 polling 권장인가

- 잔액은 지갑 화면/로또 화면/채굴 보상 수령 등 외부 이벤트로 바뀐다.
- 교환 화면에서 잔액이 stale 하면 버튼 활성화 조건과 실제 on-chain 잔액이 어긋난다.

### 어떻게 구현하면 좋은가

- Exchange 화면 또는 Wallet 내 exchange panel 진입 중일 때만 10초 polling
- active wallet이 바뀌면 즉시 refetch
- 교환 성공 직후 즉시 refetch

## 4. `GET /api/v1/lotto?address=...`

### 왜 polling 권장인가

- `poolBalanceJack`, `totalEntries`, `totalWinners`, 사용자 잔액은 블록 진행에 따라 바뀐다.
- 로또 페이지는 "현재 잭팟 규모"가 핵심 정보라 one-shot 조회만으로는 stale 되기 쉽다.

### 어떻게 구현하면 좋은가

- Lotto 페이지 진입 중 10초 polling
- active wallet 변경 시 즉시 refetch
- commit 성공 직후 즉시 refetch

현재 FE는 `activeAddress` 변경 시 1회 호출만 하고 있으므로 polling 추가가 필요하다.

## 5. `GET /api/v1/lotto/entries`

### 왜 polling 권장인가

- `api.md` 자체가 `POST /lotto/commit` 성공 후 결과는 `GET /lotto/entries` 로 polling 하도록 가정한다.
- 방금 참여한 항목이 `DRAWING` 에서 `WINNING`/`LOSING` 으로 바뀌는 시점은 미래 블록 생성 시점이라 클라이언트가 예측할 수 없다.

### 어떻게 구현하면 좋은가

- Lotto 페이지에서 active wallet의 최근 엔트리 목록을 10초 polling
- 최신 엔트리 중 `status === "DRAWING"` 이 하나라도 있으면 polling 유지
- 전부 `DRAWING` 이 아니면 30초로 완화하거나 중지

권장 stop 조건:

```text
DRAWING entry 존재 -> 10초 polling
모두 확정됨 -> 30초 polling 또는 pause
페이지 이탈 -> stop
```

## 6. `GET /api/v1/lotto/entries/{commitHash}/result`

### 왜 polling 권장인가

- 특정 커밋 결과만 보고 싶을 때 가장 직접적인 상태 확인 API다.
- 역시 결과 확정 시점이 미래 블록 높이에 달려 있어 push가 없으면 polling이 필요하다.

### 어떻게 구현하면 좋은가

- 상세 modal 또는 결과 확인 UI가 열려 있는 동안 10초 polling
- `status !== "DRAWING"` 이 되면 즉시 stop
- `EXPIRED` 또는 claim 완료 시 stop

권장 구현:

```ts
if (result.status === "DRAWING") {
  startPolling(10_000);
} else {
  stopPolling();
}
```

## 7. `GET /api/v1/mining/blocks?address=...`

### 왜 polling 권장인가

- 채굴 블록은 새 블록이 생성될 때마다 추가된다.
- Mining 페이지는 누적 보상과 최근 채굴 이력을 보는 화면이므로 자동 갱신이 UX에 중요하다.

### 어떻게 구현하면 좋은가

- Mining 페이지 진입 중 15초 polling
- 최신 head page만 polling, 하위 페이지는 필요 시 수동 more
- 새 블록 감지 시 total reward와 목록 head만 갱신

`/mining/blocks` 는 현재 BE도 미구현이라 controller/service/read-model 적재부터 필요하다.

---

## 현재 구현은 되어 있지만 조정이 필요한 부분

## `GET /api/v1/blockchain/blocks/{height}`

현재 FE는 `dashboard` polling 때마다 최근 블록 수만큼 `blocks/{height}` 를 다시 호출한다.
즉, 최근 5개 블록을 보여주면 10초마다 `dashboard` 1회 + `block detail` 5회를 날린다.

### 문제

- API 호출 수가 빠르게 늘어난다.
- 대시보드 카드에 필요한 정보 대부분은 `/blockchain/dashboard` 에 이미 있다.
- block detail은 modal open 시점에만 필요한 경우가 많다.

### 권장 조정안

- 기본 대시보드 polling은 `/blockchain/dashboard` 하나만 유지
- `GET /blockchain/blocks/{height}` 는 아래 경우에만 호출
  - block detail modal open 시
  - 또는 dashboard summary에 없는 필드가 필요할 때만
- modal open 중 최신 블록 detail을 보여줘야 하면 그때만 10초 polling

즉, `blocks/{height}` 는 "항상 polling" 이 아니라 **조건부 polling** 이 맞다.

---

## 공통 구현 권장안

polling이 필요한 API가 늘어나면 각 페이지마다 `setInterval` 을 흩뿌리기보다 공통 훅으로 묶는 편이 좋다.

추천 훅:

```text
FE-ssatto/src/hooks/usePollingQuery.ts
```

핵심 기능:

- `intervalMs`
- `enabled`
- `stopWhen`
- `refetchOnWindowFocus`
- `pauseWhenHidden`
- `onSuccess`, `onError`
- `AbortController` 로 이전 요청 취소

예시 인터페이스:

```ts
usePollingQuery({
  enabled: Boolean(activeAddress),
  intervalMs: 10_000,
  pauseWhenHidden: true,
  queryFn: () => getLottoEntries(activeAddress!),
  stopWhen: (data) => data.entries.every((entry) => entry.status !== "DRAWING"),
});
```

---

## 최종 정리

1. 현재 FE에서 실제 polling 중인 API는 `GET /blockchain/dashboard` 와 그에 따라 연쇄 호출되는 `GET /blockchain/blocks/{height}` 뿐이다.
2. polling이 실제로 더 필요한 영역은 `wallet balances`, `wallet activities`, `lotto overview`, `lotto entries`, `lotto result`, `mining blocks` 이다.
3. 명령 API(`POST`)는 polling 대상이 아니라, 성공 후 관련 조회 API를 즉시 refetch 하도록 설계하는 것이 맞다.
4. SSE/WebSocket이 없는 현재 구조에서는 polling이 가장 단순하고 운영 부담이 낮은 실시간 근사 전략이다.
