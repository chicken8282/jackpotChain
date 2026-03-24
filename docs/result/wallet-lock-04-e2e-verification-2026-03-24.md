# WALLET-LOCK-04 — 세션 만료 시 WalletUnlockModal 자동 오픈 E2E 검증

> 작성일: 2026-03-24

---

## Overview

### 검증 목적

`wallet-session-expired-auto-unlock-modal` 구현 결과로 수정된 `WalletPage.tsx` 및 `WalletUnlockModal.tsx`가, 세션 만료 상황에서 모달을 자동으로 오픈하고 올바른 안내 문구를 표시하는지 E2E 관점에서 검증한다.

### 검증 방법

1. **정적 코드 추적**: `restoreWalletSession()` 반환값 처리 로직과 `WalletUnlockModal sessionExpired prop` 분기를 소스 수준에서 추적
2. **인프라 상태 확인**: Docker 컨테이너 상태, PostgreSQL 세션 테이블, Redis 키 현황 확인
3. **API 레이어 검증**: 백엔드 재시작 후 `/v1/auth/refresh` 엔드포인트의 오류 응답 패턴 확인
4. **브라우저 E2E**: 실제 브라우저 조작 (지갑 없음 — 아래 참조)

---

## Changed Files

코드 변경 없음.

이번 태스크는 이전 구현(`wallet-session-expired-auto-unlock-modal-2026-03-24.md`)에서 이미 수정된 코드를 E2E로 검증하는 것이 목적이다.

---

## Tests Run

### 1. 컨테이너 상태 확인

```
NAME                STATUS                    PORTS
jc-backend-local    Up (healthy)              0.0.0.0:8080->8080/tcp
jc-frontend-local   Up (healthy)              0.0.0.0:13000->80/tcp
jc-node-local       Up (healthy)
jc-postgres-local   Up (healthy)              0.0.0.0:15432->5432/tcp
jc-rabbitmq-local   Up (healthy)
jc-redis-local      Up (healthy)              0.0.0.0:16379->6379/tcp
```

전 컨테이너 `healthy` 확인.

### 2. 백엔드 재시작 수행

```
docker compose --env-file .env.local -f docker-compose.local.yml restart backend
```

재시작 후 `jc-backend-local` Up (healthy) 재확인.

### 3. 코드 흐름 정적 추적 — PASS

#### `walletSessionService.ts` null 반환 조건

```ts
// restoreWalletSession 반환 null 조건:
// 1. 메모리 access token 없음 (또는 만료)
// 2. refreshSessionHandle 없거나 refresh API 호출 실패
// 3. unlockedPrivateKey 없음 (지갑이 잠금 상태)
return null;  // walletSessionService.ts:75
```

세 조건이 모두 충족되면 null 반환. 페이지 새로고침(F5) 시 메모리 스토어가 초기화되므로 조건 1·3은 항상 충족되며, 조건 2(refresh 실패)가 세션 만료 여부를 결정한다.

#### `WalletPage.tsx` null 처리 — PASS

```ts
// WalletPage.tsx:199-203
if (!response) {
  clearAccessSession(wallet.walletId);
  setUnlockModalSessionExpired(true);   // ← sessionExpired=true
  setShowUnlockModal(true);             // ← 모달 자동 오픈
  return;
}
```

null 반환 시 즉시 모달을 연다. 에러 배너를 표시하지 않는다.

#### `WalletPage.tsx` 수동 잠금 해제 버튼 — PASS

```ts
// WalletPage.tsx:503-505 (잠금 상태 배너의 "잠금 해제" 버튼)
onClick={() => {
  setUnlockModalSessionExpired(false);  // ← sessionExpired=false
  setShowUnlockModal(true);
}}
```

수동 클릭 시 `unlockModalSessionExpired(false)`를 먼저 호출해 세션 만료 맥락을 제거한다.

#### `WalletUnlockModal.tsx` 문구 분기 — PASS

```tsx
// WalletUnlockModal.tsx:77-85
{sessionExpired ? (
  <p>세션이 만료되었습니다. 계속하려면 <strong>{walletName}</strong> 지갑의 비밀번호를 입력해주세요.</p>
) : (
  <p>{walletName} 지갑으로 서명하려면 비밀번호가 필요합니다.</p>
)}
```

`sessionExpired` prop에 따라 문구가 정확히 분기된다.

### 4. API 레이어 검증 — PASS (오류 응답 패턴 확인)

백엔드 재시작 후 백엔드 로그에서 유효하지 않은 세션 핸들로 refresh 요청 시 `BUSINESS_EXCEPTION` 반환 확인:

```
WARN  POST /v1/auth/refresh eventType=BUSINESS_EXCEPTION
```

`walletSessionService.ts`의 catch 블록이 이 오류를 삼키고 challenge 경로로 넘어가며, private key가 없으면 `null` 반환으로 이어지는 흐름이 코드 수준에서 확인된다.

### 5. 세션 저장 방식 확인 — 핵심 발견

| 저장소 | 대상 | 재시작 후 상태 |
|--------|------|---------------|
| Redis | 인증 챌린지 (일회용, TTL 있음) | 유지됨 (Redis 컨테이너 미재시작) |
| PostgreSQL (JPA) | refresh_session (auth_refresh_session 테이블) | **유지됨** |
| 환경변수 | JWT 서명 키 (`LOCAL_JWT_SECRET`) | **고정값** |

```
PGPASSWORD=jackpot1234 psql -c "SELECT COUNT(*) FROM auth_refresh_session;"
→ 0 (현재 등록된 세션 없음 — 등록된 지갑 없음)
```

**중요**: `restart backend`만으로는 PostgreSQL의 refresh session이 무효화되지 않는다. JWT 서명 키도 고정값이므로 기존 토큰 서명이 유지된다. 따라서 **백엔드 재시작만으로는 세션 만료 플로우가 트리거되지 않는다.**

### 6. 실제 브라우저 E2E — 수행 불가

- DB에 등록된 지갑 없음 (`SELECT COUNT(*) FROM wallet` → 0)
- Playwright / Cypress 등 headless 브라우저 도구 미설치
- 브라우저에서 직접 지갑을 생성하고 잠금 해제 상태를 만든 후 세션 만료를 유도해야 하나, 현재 환경에서 자동화 불가

---

## Failed / Unresolved

### UNRESOLVED-1: 브라우저 E2E 미수행

등록된 지갑이 없어 세션 만료 시나리오 자체를 실행할 수 없었다.

**재현 절차 (수동 검증 가이드):**

1. `http://localhost:13000/wallet` 접속 → 지갑 생성 → 잠금 해제(비밀번호 입력)
2. 잠금 해제 상태 확인: "현재 활성 지갑이 인증된 상태입니다." 배너 표시 여부
3. **세션 강제 만료 방법 (택 1):**
   - **방법 A** (권장): 브라우저 개발자도구 → Application → Cookies → `ssatto_refresh_*` 쿠키 삭제
   - **방법 B**: PostgreSQL에서 세션 revoke:
     ```sql
     UPDATE auth_refresh_session SET revoked_at = NOW() WHERE wallet_address='0x...';
     ```
   - **방법 C**: 브라우저에서 `localStorage.clear()` 후 새로고침 (세션 핸들 제거)
4. F5(새로고침) → **예상: WalletUnlockModal이 "세션이 만료되었습니다. 계속하려면 {지갑명} 지갑의 비밀번호를 입력해주세요." 문구로 자동 오픈**
5. 올바른 비밀번호 입력 → 모달 닫힘, "현재 활성 지갑이 인증된 상태입니다." 배너 재표시 확인
6. 틀린 비밀번호 → 모달 내 에러 메시지, 모달 유지 확인

### UNRESOLVED-2: 테스트 시나리오의 백엔드 재시작 가정

태스크 시나리오에서 "백엔드 컨테이너 재시작 → 세션 만료"를 가정하고 있으나, 이 구현에서는:
- refresh session이 PostgreSQL(JPA)에 저장되어 재시작 후에도 유지됨
- JWT 서명 키가 고정값이어서 재시작 전 발급 토큰도 유효

따라서 단순 재시작만으로는 세션 만료가 발생하지 않는다. 세션 만료 E2E를 재현하려면 위 **방법 A** (쿠키 삭제)가 가장 신뢰성 있는 방법이다.

---

## Next Steps

### 1. 수동 브라우저 E2E 검증 (최우선)

위 UNRESOLVED-1의 수동 검증 가이드를 따라 실제 브라우저에서 검증 완료 필요.
시간 소요: 약 5분.

### 2. idle lock 자동 모달 개선 고려

현재 idle lock 발생 시:
```ts
// WalletPage.tsx:147
const didLock = lockExpiredWallets(WALLET_IDLE_LOCK_MS);
if (didLock) {
  setAuthError("장시간 사용이 없어 지갑 잠금이 해제되었습니다.");
}
```
에러 배너만 표시되고 모달은 자동으로 열리지 않는다. 세션 만료와 동일한 패턴으로 모달 자동 오픈을 적용할 수 있다:
```ts
if (didLock) {
  setUnlockModalSessionExpired(false);  // 또는 별도 idleLock 구분
  setShowUnlockModal(true);
}
```
이 개선은 별도 태스크로 관리 권장.

### 3. `secureWallet` 미사용 import 정리

`WalletPage.tsx:13`의 `secureWallet` import는 기존 이슈로 코드 청결을 위해 제거 권장 (빌드/런타임 영향 없음).

---

## 판정 요약

| 검증 항목 | 방법 | 결과 |
|-----------|------|------|
| null 반환 시 `sessionExpired=true` + 모달 자동 오픈 | 코드 추적 | PASS (코드 정확) |
| sessionExpired 문구 분기 | 코드 추적 | PASS (코드 정확) |
| 수동 잠금 해제 시 일반 문구 | 코드 추적 | PASS (코드 정확) |
| refresh 실패 → null 전파 | 코드 추적 + API 로그 | PASS |
| 실제 브라우저 모달 자동 오픈 확인 | 브라우저 E2E | **UNRESOLVED** (환경 제약) |
| 백엔드 재시작 → 세션 무효화 | 인프라 분석 | **FAIL** (PostgreSQL 세션 유지로 재시작 후에도 refresh 성공) |

코드 로직 자체는 올바르게 구현되어 있다. 브라우저 E2E와 올바른 세션 만료 트리거 방법 확인이 필요하다.
