# 수정 계획: 지갑 세션 race condition / UX 복구 누락 수정

> 작성일: 2026-03-24
> 대상 브랜치: BE (FE 전용 수정)

---

## 원인

refresh token이 무효화되는 모든 상황(볼륨 삭제, 서버 재배포, 세션 만료)에서 아래 4개 결함이 함께 작동하여 사용자가 인증 실패 이유를 알 수 없고 반복적으로 동일 현상이 재현된다.

---

## 영향 레이어

| 레이어 | 파일 | 결함 |
|--------|------|------|
| Store | `useWalletStore.ts` | `upsertWallet`이 기존 지갑 업데이트 시에도 `activeAddress`를 덮어씀 |
| Service | `walletSessionService.ts` | 동일 `sessionHandle`로 동시 refresh 요청 시 mutex 없음 → token rotation race |
| Page | `WalletPage.tsx` useEffect | 비동기 완료 시점 cleanup(`cancelled`) 없어서 stale 결과가 현재 지갑 상태를 오염 |
| Page | `WalletPage.tsx` | `response === null` (refresh 무효 + unlock 없음) 시 사용자에게 메시지 없음 |

---

## 변경 범위

### 1. `useWalletStore.ts` — upsertWallet activeAddress 조건

**현재:** `activeAddress: wallet.address` (항상 갱신)
**변경:** `existingIndex < 0` (신규 지갑)일 때만 `activeAddress: wallet.address` 갱신, 기존 지갑 업데이트 시는 `state.activeAddress` 유지

**이유:** 기존 지갑의 `refreshSessionHandle` 갱신 호출 시 사용자가 선택한 activeAddress가 의도치 않게 바뀌는 현상 방지

---

### 2. `walletSessionService.ts` — refreshInFlight mutex

**현재:** `refreshAuthSession` 직접 호출
**변경:** 모듈 레벨 `refreshInFlight: Map<string, Promise<AuthRefreshResponse>>` 추가

```
동일 sessionHandle 첫 번째 호출 → promise 생성 + Map에 등록
동일 sessionHandle 두 번째 호출 → 기존 promise await (새 요청 금지)
완료/실패 시 → Map에서 제거
```

**이유:** refresh token rotation 구조에서 동시 2회 refresh 시 두 번째 요청은 이미 rotate된 토큰으로 실패하여 강제 로그아웃 발생

---

### 3. `WalletPage.tsx` useEffect — cancelled cleanup

**현재:** async 완료 후 `cancelled` 체크 없음
**변경:**
```ts
let cancelled = false;
// ...
return () => { cancelled = true; };
```
모든 `.then`, `.catch`, `.finally` 핸들러 앞에 `if (cancelled) return;` 추가

**이유:** `activeWallet?.walletId`가 바뀌면 이전 effect의 async 결과가 도착했을 때 현재 지갑의 state를 덮어쓰는 문제 방지

---

### 4. `WalletPage.tsx` — response === null UX 복구 메시지

**현재:** `clearAccessSession(wallet.walletId)` 후 사용자에게 아무 메시지 없음
**변경:** `setAuthError("세션이 만료되었습니다. 비밀번호로 잠금을 해제하여 다시 인증해 주세요.")`

**이유:** 사용자가 why를 알 수 없어 refresh가 왜 실패했는지 모르고 무한 대기

---

## 실패 가능 지점

| 지점 | 위험 | 대응 |
|------|------|------|
| refreshInFlight Map이 메모리에 유지되는 상황 | 서비스 모듈 단위 재로드 시 Map 초기화 → 문제 없음 | 모듈 레벨이므로 앱 생명주기와 동일 |
| cancelled=true 후 setIsAuthenticating(false) 미호출 | 다음 effect가 setIsAuthenticating(true)를 설정하므로 중간 false 생략은 무해 | 신규 effect가 finally에서 false 설정 |
| upsertWallet activeAddress 조건 변경 | 최초 지갑 생성 플로우에서 activeAddress 미설정 여부 | existingIndex < 0 조건이 신규에만 적용되므로 안전 |
