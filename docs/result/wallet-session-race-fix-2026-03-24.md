# 결과 보고: 지갑 세션 race condition / UX 복구 누락 수정

> 작성일: 2026-03-24
> 관련 계획: `docs/plans/wallet-session-race-fix-2026-03-24.md`

---

## Overview

refresh token이 무효화되는 모든 상황(볼륨 삭제, 서버 재배포, 세션 만료)에서 사용자가 영구적으로 인증 실패 상태에 빠지는 문제를 해결했다.

이전 대화에서 계획된 4가지 수정이 미적용 상태였고, 이번에 모두 적용했다.

핵심 문제는 두 가지였다:
1. **race condition**: 동일 refresh sessionHandle로 동시 호출 시 token rotation으로 두 번째 요청이 실패하여 강제 로그아웃
2. **UX 누락**: refresh 실패 후 사용자에게 아무 안내 없이 인증 화면이 멈춤

---

## Changed Files

### 1. `FE-ssatto/src/stores/useWalletStore.ts`

**변경 내용:** `upsertWallet`에서 `activeAddress` 갱신을 신규 지갑일 때만 수행

```diff
- activeAddress: wallet.address,
+ activeAddress: existingIndex < 0 ? wallet.address : state.activeAddress,
```

**이유:** 기존 지갑의 `refreshSessionHandle` 업데이트(`upsertWallet` 호출) 시 사용자가 선택한 `activeAddress`가 의도치 않게 덮여쓰이는 현상 방지. 다중 지갑 환경에서 지갑 전환 후 세션 복구 중 원래 지갑 포커스가 사라지는 버그.

---

### 2. `FE-ssatto/src/services/walletSessionService.ts`

**변경 내용:** 모듈 레벨 `refreshInFlight: Map<string, Promise<AuthRefreshResponse>>` 추가. 동일 `sessionHandle`에 대한 동시 refresh 요청을 하나의 Promise로 합쳐 처리.

```ts
const refreshInFlight = new Map<string, Promise<AuthRefreshResponse>>();
// ...
if (!refreshInFlight.has(handle)) {
  const promise = refreshAuthSession({ sessionHandle: handle }).finally(() => {
    refreshInFlight.delete(handle);
  });
  refreshInFlight.set(handle, promise);
}
const refreshResponse = await refreshInFlight.get(handle)!;
```

**이유:** refresh token rotation 구조에서 동시 2회 refresh 시 두 번째 요청은 이미 rotate된 무효 토큰으로 실패 → 세션 유실. 서버 재배포나 볼륨 삭제 직후 여러 탭/컴포넌트에서 동시에 세션 복구를 시도할 때 발생.

---

### 3. `FE-ssatto/src/pages/WalletPage.tsx`

**변경 내용 A:** useEffect에 `cancelled` cleanup 추가

```ts
let cancelled = false;
// ...async 핸들러에서 if (cancelled) return; 체크
return () => { cancelled = true; };
```

**이유:** `activeWallet?.walletId` 변경 시 이전 effect의 비동기 완료 결과가 도착하면 현재 지갑의 accessSession/authError state를 오염시킴. 지갑 전환 시 이전 지갑의 에러가 현재 지갑 화면에 표시되는 문제.

**변경 내용 B:** `response === null` 시 UX 복구 메시지 표시

```ts
if (!response) {
  clearAccessSession(wallet.walletId);
  setAuthError("세션이 만료되었습니다. 비밀번호로 잠금을 해제하여 다시 인증해 주세요.");
  return;
}
```

**이유:** refresh 무효 + unlock 없음 상태에서 `response`가 `null`로 반환되는데 사용자에게 안내 없이 인증 상태만 초기화됨. 사용자가 왜 인증이 안 되는지 알 수 없어 UI가 멈춘 것처럼 보임.

---

## Tests Run

```bash
docker compose --env-file .env.local -f docker-compose.local.yml up -d --build
```

| 서비스 | 결과 |
|--------|------|
| jc-postgres-local | healthy |
| jc-redis-local | healthy |
| jc-rabbitmq-local | healthy |
| jc-node-local | healthy |
| jc-backend-local | healthy |
| jc-frontend-local | started |

- Frontend SPA: `GET http://localhost:13000/` → HTML 200 ✅
- Backend actuator: `GET http://localhost:8080/actuator/health` → `{"status":"UP"}` ✅
- Auth endpoint: `POST http://localhost:8080/api/v1/auth/challenge` → 400 validation (지갑 미존재) ✅
- TypeScript 빌드: `tsc -b && vite build` → 에러 없음, 1205 모듈 변환 완료 ✅

---

## Failed / Unresolved

없음. 4가지 수정 모두 적용 완료, 빌드 및 스택 기동 정상.

단, 아래 상황은 브라우저에서 수동으로만 검증 가능하며 자동화 테스트 커버리지 없음:
- 실제 세션 만료 → `response === null` 경로 UX 확인
- 다중 탭에서 동시 refresh 시 mutex 동작 확인

---

## Next Steps

1. **WalletPage refreshSessionHandle 만료 후 자동 재로그인 플로우**: `response === null` 메시지를 보고 unlock modal을 여는 버튼을 함께 표시하면 UX가 더 부드러워짐
2. **refreshInFlight Map 테스트**: 단위 테스트에서 동일 handle 동시 호출 시 `refreshAuthSession`이 1회만 호출되는지 검증 추가 권장
3. **polling 미구현 API 추가**: `fe-be-api.md` 권장 polling 대상(`/wallet`, `/lotto/entries` 등) 구현
