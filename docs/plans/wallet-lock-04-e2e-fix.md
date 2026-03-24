# 계획: wallet-lock-04 E2E 검증 실패 해결

> 작성일: 2026-03-24

---

## 해결 대상 이슈

이전 검증(`wallet-lock-04-e2e-verification-2026-03-24.md`)에서 확인된 FAIL/UNRESOLVED:

| ID | 상태 | 설명 |
|----|------|------|
| FAIL-2 | FAIL | 백엔드 재시작만으로 세션 무효화 안 됨 (PostgreSQL 세션 유지) |
| UNRESOLVED-1 | UNRESOLVED | 실제 브라우저 E2E 미수행 (등록 지갑 없음, headless 브라우저 없음) |
| NEXT-2 | TODO | idle lock 발생 시 모달 자동 오픈 미구현 |
| NEXT-3 | TODO | `secureWallet` 미사용 import 정리 |

---

## 모호한 점 / 가정

- **FAIL-2**는 코드 버그가 아니라 테스트 시나리오의 설계 문제다. PostgreSQL 세션 유지는 의도된 동작(재시작 후 세션 복구 UX 보존). 해결책은 "코드를 변경"하는 것이 아니라 세션을 명시적으로 revoke하여 시나리오를 재현하는 것이다.
- **UNRESOLVED-1** 해결을 위해 Node.js 스크립트로 API 레벨 통합 테스트를 작성한다. FE 코드가 사용하는 `@noble/curves`·`@noble/hashes`가 Node.js에서도 동일하게 동작하므로 실제 서명/주소 파생까지 재현 가능하다.
- idle lock 수정(NEXT-2)은 `setAuthError` 제거 + `setShowUnlockModal(true)` 로 교체한다. 에러 배너 없이 즉시 모달을 열어 UX 마찰을 제거한다. `sessionExpired=false`로 설정해 "서명하려면 비밀번호가 필요합니다." 문구 표시.

---

## 영향받는 파일/레이어

| 레이어 | 파일 | 변경 유형 |
|--------|------|---------|
| FE Page | `FE-ssatto/src/pages/WalletPage.tsx` | idle lock 처리 수정, secureWallet import 제거 |
| Test script | `scripts/e2e-session-expiry-test.mjs` | 신규 (Node.js API 통합 테스트) |

---

## 원인 → 영향 레이어 → 변경 범위

### FAIL-2: 세션 무효화 방법 부재

- **원인**: refresh session이 PostgreSQL(JPA)에 저장 + JWT secret 고정 → 재시작 후에도 유효
- **영향 레이어**: 테스트 절차 (코드 변경 없음, 테스트 스크립트에서 DB revoke로 해결)
- **변경 범위**: 새 통합 테스트 스크립트에서 `UPDATE auth_refresh_session SET revoked_at = NOW()` 후 refresh 실패 확인
- **실패 가능 지점**: PostgreSQL TCP 포트(15432) 접근 가능해야 함

### UNRESOLVED-1: 브라우저 E2E 대체

- **원인**: headless 브라우저 미설치, 등록 지갑 없음
- **영향 레이어**: 테스트 레이어 (FE 코드 미변경)
- **변경 범위**: Node.js 스크립트가 완전한 흐름 수행:
  1. secp256k1로 지갑 생성
  2. `POST /api/v1/wallet` 등록
  3. `POST /api/v1/auth/challenge` + `POST /api/v1/auth/verify` 인증
  4. PostgreSQL에서 refresh session revoke
  5. `POST /api/v1/auth/refresh` 실패 확인 (→ 프론트엔드 null 반환 경로 재현)
  6. DB 정리 (등록 지갑 삭제)
- **실패 가능 지점**:
  - `@noble/curves`·`@noble/hashes` Node.js ESM import
  - `@scure/base` base58check 구현 일치 여부
  - PostgreSQL 접근 권한

### NEXT-2: idle lock 모달 개선

- **원인**: `lockExpiredWallets()` true 반환 시 에러 배너만 표시, 모달 미열림
- **영향 레이어**: FE Page (WalletPage.tsx)
- **변경 범위**:
  ```ts
  // Before
  if (didLock) {
    setAuthError("장시간 사용이 없어 지갑 잠금이 해제되었습니다.");
  }
  // After
  if (didLock) {
    setUnlockModalSessionExpired(false);
    setShowUnlockModal(true);
  }
  ```
- **실패 가능 지점**: `activeWallet`이 없는 상태에서 모달 오픈 조건(`showUnlockModal && activeWallet`) 확인 필요

### NEXT-3: secureWallet import 제거

- **원인**: `secureWallet`이 import만 되고 사용되지 않음 (TS6133 hint)
- **영향 레이어**: FE Page (WalletPage.tsx:13)
- **변경 범위**: import 구문에서 `secureWallet,` 제거
- **실패 가능 지점**: 없음 (타입 제거만)
