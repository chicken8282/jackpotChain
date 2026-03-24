# 세션 만료 시 WalletUnlockModal 자동 노출 — 구현 결과

> 작성일: 2026-03-24

---

## Overview

### 무엇을 했는가

`WalletPage.tsx`에서 `restoreWalletSession()`이 null을 반환할 때, 기존에는 에러 메시지만 화면에 표시하고 사용자가 수동으로 "잠금 해제" 버튼을 눌러야 `WalletUnlockModal`이 열렸다. 이번 변경으로 null 반환 시점에 모달이 자동으로 열리도록 수정했다.

### 왜 했는가

세션이 만료된 사용자는 에러 배너를 읽고 → 별도 버튼을 찾아 클릭해야 하는 2단계 동작이 필요했다. 이 과정이 불필요한 UX 마찰을 만들어, 자동 모달 노출로 즉시 재인증 경로를 제공한다.

---

## Changed Files

### `FE-ssatto/src/pages/WalletPage.tsx`

**변경 내용:**
- `restoreWalletSession()` then 핸들러의 null 분기에서 `setAuthError("세션이 만료되었습니다...")` 제거
- 대신 `setUnlockModalSessionExpired(true)` + `setShowUnlockModal(true)` 호출로 교체
- `unlockModalSessionExpired` state 추가
- 수동 "잠금 해제" 버튼 클릭 시 `setUnlockModalSessionExpired(false)` 후 모달 오픈 (일반 잠금 해제와 세션 만료 케이스 구분)
- `WalletUnlockModal`에 `sessionExpired` prop 전달, `onClose`에서 `unlockModalSessionExpired` 초기화

**이유:** 세션 만료 감지 지점에서 직접 모달을 열어 에러 배너 없이 즉시 재인증 경로 제공

### `FE-ssatto/src/components/wallet/WalletUnlockModal.tsx`

**변경 내용:**
- `sessionExpired?: boolean` prop 추가 (기본값 `false`)
- `sessionExpired=true`이면 description을 "세션이 만료되었습니다. 계속하려면 {walletName} 지갑의 비밀번호를 입력해주세요."로 표시
- `sessionExpired=false`이면 기존 문구 "서명하려면 비밀번호가 필요합니다." 유지

**이유:** 세션 만료로 자동 오픈된 경우와 수동 잠금 해제 요청을 모달 안내 문구로 구분해 컨텍스트 제공

---

## Tests Run

### TypeScript 타입 검사

```
npx tsc --noEmit
```

- 결과: 오류 0건 (출력 없음 = PASS)

### Docker Compose 통합 빌드

```
docker compose --env-file .env.local -f docker-compose.local.yml up -d --build
```

| 컨테이너 | 최종 상태 |
|----------|-----------|
| jc-frontend-local | healthy |
| jc-backend-local | healthy |
| jc-redis-local | healthy |
| jc-postgres-local | healthy |
| jc-node-local | healthy |
| jc-rabbitmq-local | healthy |

- 전 서비스 `healthy` 확인

---

## Failed / Unresolved

### `secureWallet` 미사용 import (기존 이슈)

- `WalletPage.tsx` line 13의 `secureWallet` import가 선언은 되었지만 읽히지 않는다는 TS6133 hint가 있음
- 이번 변경에서 도입된 것이 아니라 기존에 존재하던 문제로, 변경 범위 밖
- 영향 범위: 빌드 오류 없음, 런타임 영향 없음

### 수동 E2E 시나리오 미검증

- 실제 브라우저에서 세션 만료 시뮬레이션(Redis TTL 조기 만료 등) 후 모달 자동 노출 여부를 수동으로 확인하지 않았음
- Docker 스택이 healthy이므로 `http://localhost:3000`에서 직접 검증 가능

---

## Next Steps

1. **수동 E2E 검증** — `http://localhost:3000/wallet`에서 세션을 강제 만료(Redis flush 또는 refresh cookie 삭제)시킨 뒤 모달이 자동으로 열리고, 비밀번호 입력 후 정상 인증되는지 확인
2. **idle lock 자동 모달** — 장시간 미사용 후 idle lock 발생 시에도 동일하게 모달을 자동 오픈하는 UX 개선 고려 (현재는 에러 배너만 표시)
3. **`secureWallet` 미사용 import 정리** — 기존 이슈이나 코드 청결을 위해 제거 권장
