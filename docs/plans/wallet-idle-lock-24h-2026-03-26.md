# 지갑 유휴 잠금 타임아웃 24시간 변경

## 원인

`WALLET_IDLE_LOCK_MS = 30 * 60 * 1000` (30분) 으로 설정되어 있어, 사용자가 30분간 비활성 상태이면 지갑이 자동 잠금되고 잠금 해제 모달이 표시된다.

## 영향 레이어

| 레이어 | 파일 | 역할 |
|--------|------|------|
| FE 상태관리 | `FE-ssatto/src/stores/useWalletSessionStore.ts` | `WALLET_IDLE_LOCK_MS` 상수 정의 |
| FE 페이지 | `FE-ssatto/src/pages/WalletPage.tsx` | 30초마다 `lockExpiredWallets(WALLET_IDLE_LOCK_MS)` 호출 |

**BE 무관 이유:**
- Access token (15분): refresh token으로 자동 갱신 → modal 미표시
- Refresh token (14일): 이미 24시간보다 훨씬 길어 변경 불필요

## 변경 범위

`FE-ssatto/src/stores/useWalletSessionStore.ts` line 3:

```diff
- export const WALLET_IDLE_LOCK_MS = 30 * 60 * 1000;
+ export const WALLET_IDLE_LOCK_MS = 24 * 60 * 60 * 1000;
```

## 실패 가능 지점

없음. 단순 상수 변경이며 로직 변경 없음.
