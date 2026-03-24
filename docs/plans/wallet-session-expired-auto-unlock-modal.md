# 세션 만료 시 WalletUnlockModal 자동 노출 계획

## 원인

`WalletPage.tsx`의 `restoreWalletSession()` then 핸들러에서 null이 반환되면
`setAuthError(...)` 만 호출하고 `showUnlockModal`은 false 상태로 유지된다.
사용자는 수동으로 "잠금 해제" 버튼을 눌러야 모달을 열 수 있어 UX가 끊긴다.

## 영향 레이어

| 레이어 | 파일 | 변경 여부 |
|--------|------|-----------|
| Page | `FE-ssatto/src/pages/WalletPage.tsx` | 수정 |
| Component | `FE-ssatto/src/components/wallet/WalletUnlockModal.tsx` | 수정 (hint prop 추가) |
| Service | `walletSessionService` | 없음 |
| Store | `useWalletSessionStore` | 없음 |

## 변경 범위

### WalletPage.tsx
- `restoreWalletSession()` then 핸들러에서 null 반환 시:
  - `setAuthError("세션이 만료되었습니다...")` 제거
  - `setShowUnlockModal(true)` 추가
- WalletUnlockModal 렌더링 시 `sessionExpired` prop 전달

### WalletUnlockModal.tsx
- optional `sessionExpired?: boolean` prop 추가
- `sessionExpired=true`이면 description 문구를 "세션이 만료되었습니다. 다시 인증하려면 비밀번호를 입력해주세요."로 표시

## 실패 가능 지점

1. **모달 닫기 후 authError 잔재** — 이번 변경에서 `setAuthError`를 호출하지 않으므로 발생 없음
2. **activeWallet=undefined 시 모달 노출** — 조건 `showUnlockModal && activeWallet`이 false → 안전
3. **idle lock 케이스와의 충돌** — idle lock은 `setAuthError`만 사용; 이번 변경 범위 밖
4. **Suspense 경계** — 모달이 lazy import이므로 `showUnlockModal=true` 즉시 청크 로드 시작 → 기존과 동일 패턴
