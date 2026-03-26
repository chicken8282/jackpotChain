# 로또 참여 시 POT 잔액 즉시 감소 + 실패 복구 모달 + 이중 참여 방지

## 원인

1. **즉시 감소 미반영(WalletPage)**: LottoPage는 이미 local `optimisticPotOffset`으로 즉시 감소 처리가 되어 있으나, WalletPage의 POT 잔액은 `useWalletSummaries` 10초 polling에만 의존해 즉시 반영 안 됨.

2. **실패 복구 알림 부족**: TX 커밋 timeout 시 `setActionStatus`로 배너만 표시하고 모달 없음. WalletPage POT 잔액도 별도 복구 없음.

3. **이중 참여 race condition**: `isSubmitting` state는 React 배치 업데이트로 동일 tick 내 두 번 클릭 시 두 요청이 모두 통과될 수 있음. 두 번째 TX는 double spend로 RPC 오류 발생 → "블록체인 RPC 호출에 실패했습니다." 표시됨.

4. **메시지 부정확**: POT 부족 시 "로또 참여에는 최소 1 POT가 필요합니다." + RPC double spend 오류 → "POT이 부족합니다."로 통일 필요.

## 영향 레이어

| 레이어 | 파일 |
|---|---|
| FE Store | `FE-ssatto/src/stores/useWalletStore.ts` |
| FE Page | `FE-ssatto/src/pages/LottoPage.tsx` |
| FE Page | `FE-ssatto/src/pages/WalletPage.tsx` |
| FE Component | `FE-ssatto/src/components/lotto/HexPicker.tsx` |
| BE Exception | `BE-ssatto/.../global/exception/ErrorCode.java` |
| BE RPC | `BE-ssatto/.../blockchain/rpc/JackpotChainHttpRpcClient.java` |

## 변경 범위

### 1. `useWalletStore.ts`
- `potOptimisticOffsetByAddress: Record<string, number>` 추가 (POT 단위, persist 제외)
- `applyPotOptimisticOffset(address, delta)`, `clearPotOptimisticOffset(address)` 액션 추가
- `partialize` 설정으로 persist 범위 명시

### 2. `LottoPage.tsx`
- local `optimisticPotOffset` state 제거 → `useWalletStore` 전역 offset 사용
- commit 성공: `applyPotOptimisticOffset(address, -1)`
- timeout 실패: `clearPotOptimisticOffset(address)` + 실패 모달 표시
- server potBalance 변경 감지: `clearPotOptimisticOffset(address)`
- 실패 모달: '로또 추첨을 다시 시도해주세요' (기존 setActionStatus 대체)

### 3. `WalletPage.tsx`
- `allWallets` useMemo에 `potOptimisticOffsetByAddress` 반영
- walletSummaries potBalance 변경 감지 → `clearPotOptimisticOffset` 호출

### 4. `HexPicker.tsx`
- `isSubmittingRef` useRef 추가 → 동일 tick double submit 방지
- 메시지 변경: "로또 참여에는 최소 1 POT가 필요합니다." → "POT이 부족합니다."

### 5. `ErrorCode.java`
- `LOTTO_INSUFFICIENT_POT(HttpStatus.CONFLICT, "POT이 부족합니다.")` 추가

### 6. `JackpotChainHttpRpcClient.java`
- `mapRpcError`에 `"double spend"` 패턴 감지 → `LOTTO_INSUFFICIENT_POT` 매핑

## 실패 가능 지점

- WalletPage potBalance 변경 감지 시 offset 초기화 타이밍: TX 미확인 상태에서 polling 응답이 와도 pot 변경이 없으면 offset 유지됨 (의도된 동작)
- Python 블록체인 RPC error message 포맷 변경 시 BE mapRpcError 매핑 실패 가능
- React 렌더링 배치로 인한 isSubmittingRef 초기화 타이밍 이슈 (거의 없음)
