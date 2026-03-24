# 지갑 생성 직후 1 POT 잔액 미표시 수정 계획

> 작성일: 2026-03-24

---

## 원인

### 원인 1 — stale closure in `refetchWalletSummaries()`

`persistWallet` 흐름:

```
upsertWallet(...)        ← Zustand 상태 업데이트 (동기)
↓
await refetchWalletSummaries()  ← React re-render 전
```

`refetchWalletSummaries`는 `useWalletSummaries`에서 반환된 `refetch`다.
`refetch` 내부는 `useEffectEvent`로 감싸진 `execute`를 호출하는데,
`useEffectEvent`는 "마지막 커밋된 렌더"의 값을 읽는다.

`upsertWallet()` 직후에는 React가 아직 re-render를 완료하지 않은 상태이므로,
`execute` 안의 `queryFn`은 여전히 `addresses = []`를 캡처한 클로저다.
결과: `getWallets([])` 호출 → 빈 응답 → 새 지갑 잔액이 반영되지 않음.

### 원인 2 — addresses 변경 시 즉시 refetch 없음

`usePollingQuery`의 effect 의존성: `[enabled, intervalMs]`.

- `wallets: [] → [w1]` (첫 지갑): `enabled false → true` 전환으로 effect 재실행 → `execute()` 즉시 호출 (이미 처리됨).
- `wallets: [w1] → [w1, w2]` (추가 지갑): `enabled` 불변 → effect 재실행 없음 → 다음 interval 틱까지 대기.

`useEffectEvent`가 항상 최신 `queryFn`을 읽으므로, interval이 돌아오면 새 주소는 반영되지만 즉각적인 업데이트가 없다.

---

## 영향 레이어

| 레이어 | 파일 | 변경 사항 |
|--------|------|----------|
| Hook | `src/hooks/useWalletSummaries.ts` | `queryKey` 변경 시 즉시 `refetch()` 트리거 `useEffect` 추가 |
| Page | `src/pages/WalletPage.tsx` | stale `refetchWalletSummaries()` 제거, 메시지 수정, writeStatus auto-dismiss 추가 |

---

## 변경 범위

### `useWalletSummaries.ts`

```ts
// useEffect 추가: queryKey(addresses 문자열)가 바뀌면 즉시 refetch()
useEffect(() => {
  if (addresses.length === 0) return;
  void refetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [queryKey]); // refetch 는 매 렌더마다 새 참조지만 useEffectEvent 래퍼라 안전
```

- `pauseWhenHidden`: `usePollingQuery` 기본값(`true`)으로 이미 처리됨.
- 기존 10초 interval: 이미 `usePollingQuery` 기반으로 구현됨, 변경 없음.

### `WalletPage.tsx`

1. `await refetchWalletSummaries()` 제거
   → re-render 후 `useWalletSummaries`의 `queryKey` effect가 즉시 올바른 주소로 refetch.

2. onboarding 메시지 변경:
   - `onboardingRewardGranted === true` → `"1 POT 생성 중입니다. 잔액이 곧 반영됩니다."`
   - `onboardingRewardGranted === false` → `"지갑이 등록되었습니다."`

3. `writeStatus` auto-dismiss: `writeStatusTimerRef` (setTimeout 30초)
   → 메시지가 자연히 사라짐.

---

## 실패 가능 지점

| 지점 | 위험 | 대응 |
|------|------|------|
| `refetch()` stale 가능성 | `queryKey` effect는 commit 후 실행되므로 `useEffectEvent`가 최신 `queryFn`을 읽음. 안전. | 검증: 첫 지갑 생성 후 10초 내 잔액 확인 |
| double-fetch (첫 지갑) | `enabled false→true` + `queryKey` effect 동시 발화 | `inFlightRef.current` 체크로 중복 실행 차단 |
| onboarding reward 블록 미확정 | 지갑 등록 직후 잔액이 0일 수 있음 | "잔액이 곧 반영됩니다" 메시지로 UX 커버; polling이 10초 내 갱신 |
| writeStatusTimer 누수 | 페이지 언마운트 시 timer가 살아있을 수 있음 | cleanup `useEffect`로 clearTimeout |
