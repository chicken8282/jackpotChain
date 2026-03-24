# Goal

`docs/reviews/auth.md`와 현재 `FE-ssatto`, `BE-ssatto` 구현을 대조해 지갑 생성/복구/재접속 플로우가 실제 코드와 일치하는지 확인하고, 이후 미구현 구간을 `nonce + signature + refresh token` 구조로 전환하기 위한 BE/FE 구현 계획을 수립한다.

# Review Result

기준일: 2026-03-20

## 1. 현재 지갑 생성 플로우 검증

결론: 질문에 적어둔 `9-1`, `9-2`, `9-3` 흐름은 현재 코드와 대체로 일치한다.

### 9-1. 처음 접속해서 새 지갑을 만드는 경우

현재 FE 흐름은 아래와 같다.

1. FE가 새 address/private key를 생성한다.
2. FE store에 지갑을 저장한다.
3. `POST /api/v1/wallet` 호출
4. BE DB에 지갑 메타데이터 저장
5. `POST /api/v1/auth/token` 호출
6. BE가 address 존재 여부만 확인하고 JWT 발급

근거:

- [FE-ssatto/src/components/wallet/WalletCreate.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/components/wallet/WalletCreate.tsx) 가 `makeAddress()` 와 `makePrivateKey()` 로 생성값을 만든 뒤 `onCreate(...)` 로 넘긴다.
- [FE-ssatto/src/pages/WalletPage.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/pages/WalletPage.tsx) 의 `persistWallet()` 이 먼저 `createWallet(...)` 로 store에 저장하고, 이어 `registerWallet(...)`, `issueAuthToken(...)` 을 순서대로 호출한다.
- [BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java) 가 DB에 wallet row를 저장한다.
- [BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/service/AuthService.java](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/service/AuthService.java) 가 address 존재 여부만 확인하고 JWT를 발급한다.

판정:

- 질문에 적은 순서가 맞다.
- 다만 "지갑 생성"이 실제 blockchain 규칙이 아니라 `Math.random()` 기반 mock 생성이라는 점은 별도 문제다.

### 9-2. 기존 지갑을 복구하는 경우

현재 FE 흐름도 사실상 동일하다.

1. 사용자가 address/private key를 입력한다.
2. FE store에 지갑을 저장한다.
3. `POST /api/v1/wallet` 호출
4. DB에 있으면 `409` 가 날 수 있고 FE는 이를 정상 흐름으로 처리한다.
5. `POST /api/v1/auth/token` 호출
6. BE는 DB에 address가 존재하는지만 확인하고 JWT 발급

근거:

- [FE-ssatto/src/components/wallet/WalletCreate.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/components/wallet/WalletCreate.tsx) 의 restore 모달은 address와 private key를 함께 입력받는다.
- [FE-ssatto/src/pages/WalletPage.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/pages/WalletPage.tsx) 의 `persistWallet()` 은 restore 시 `restoreWallet(...)` 로 로컬 store에 먼저 넣고, 이어 `registerWallet(...)` 호출 시 `409` 는 무시한다.
- 그 뒤 동일하게 `issueAuthToken(...)` 을 호출한다.

판정:

- 질문에 적은 흐름이 맞다.
- 다만 restore 시 private key에서 address를 재유도해 검증하지 않기 때문에 진짜 지갑 복구라고 보기 어렵다.

### 9-3. 브라우저에 저장된 지갑이 있어서 다시 앱을 열 때

현재 FE는 지갑이 있으면 등록 API를 다시 부르지 않고 바로 `issueAuthToken(...)` 을 호출한다.

근거:

- [FE-ssatto/src/stores/useWalletStore.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/stores/useWalletStore.ts) 는 Zustand `persist` 로 지갑과 token을 브라우저 저장소에 유지한다.
- [FE-ssatto/src/pages/WalletPage.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/pages/WalletPage.tsx) 의 `useEffect` 는 active wallet이 정해지면 `issueAuthToken({ address: currentWallet.address })` 를 바로 호출한다.
- [BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/service/AuthService.java](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/service/AuthService.java) 는 DB에서 address를 조회하고, 없으면 실패한다.

판정:

- 질문에 적은 흐름이 맞다.
- 브라우저에 지갑이 남아 있어도 DB에 없는 주소면 토큰 발급은 실패한다.

## 2. 현재 플로우에서 확인된 추가 사실

### FE 쪽

- 지갑 생성이 실제 blockchain address 규칙이 아니라 `0x...` mock 생성이다.
- private key가 [FE-ssatto/src/stores/useWalletStore.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/stores/useWalletStore.ts) 의 persisted store에 평문 저장된다.
- 지갑 추가 모달도 [FE-ssatto/src/components/wallet/WalletInfo.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/components/wallet/WalletInfo.tsx) 에서 같은 `Math.random()` 기반 생성 로직을 한 번 더 갖고 있다.
- 현재 UI는 이미 여러 지갑을 등록하고 카드 캐러셀 형태로 스위치하는 구조를 갖고 있다.

### BE 쪽

- [BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/controller/AuthController.java](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/controller/AuthController.java) 에는 아직 `/auth/token` 하나만 있다.
- [BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java) 는 address가 비어있는지만 확인한다. blockchain 주소 형식 검증이 없다.
- [BE-ssatto/src/main/java/ssatto/BE_ssatto/global/util/JwtUtil.java](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/global/util/JwtUtil.java) 은 access token만 발급한다.
- [BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java) 는 현재 모든 요청을 사실상 `permitAll` 로 열어둔다.

# Gap Matrix

## 1. `auth.md` 기준으로 이미 구현된 부분

- FE에서 지갑을 만들고 로컬에 저장하는 1차 흐름
- `POST /api/v1/wallet` 로 wallet metadata 등록
- `POST /api/v1/auth/token` 로 address 기반 JWT 발급
- 브라우저 재접속 시 active wallet 기준 재인증 시도

## 2. `auth.md` 기준으로 아직 구현되지 않은 부분

### 지갑 생성/복구

- blockchain과 동일한 `secp256k1 + Base58Check(version=0x4A)` address 생성
- private key -> public key -> address 재유도 로직
- restore 시 address 일치 검증
- `Math.random()` mock 생성 제거

### private key 저장

- IndexedDB keystore 저장소
- `PBKDF2-HMAC-SHA256 + AES-256-GCM` 암복호화
- 평문 private key의 메모리 전용 관리
- store/localStorage 에서 private key 제거

### 인증

- `/api/v1/auth/challenge`
- `/api/v1/auth/verify`
- nonce TTL / used 처리
- public key 기반 signature 검증
- public key -> address 재생성 검증

### 토큰/세션

- refresh token 발급
- refresh token rotation
- logout/revoke
- access token 짧은 만료 정책
- FE의 앱 시작 시 refresh 재발급 흐름

### 보안 설정

- JWT 인증 필터
- 보호 API 접근 제어
- auth open endpoint와 protected endpoint 분리

# Implementation Plan

## Phase 1. 현재 플로우 정리와 저장 구조 분리

목표:

- 현재 `register -> token` 순서를 유지하되, private key 저장 구조를 별도 keystore 계층으로 분리한다.

작업:

- FE에 `wallet keystore repository` 추상화 추가
- Zustand store에서 `privateKey` 제거
- store에는 `address`, `nickname`, `walletColor`, `keystoreId` 같은 메타데이터만 남긴다
- active wallet token 상태와 wallet metadata 상태를 분리한다

완료 조건:

- FE persisted store에 plain private key가 남지 않는다
- 현재 기능은 깨지지 않고 기존 `/wallet`, `/auth/token` 흐름으로 동작한다

## Phase 2. FE crypto parity 구현

목표:

- FE 지갑 생성/복구가 blockchain 규칙과 동일하게 동작하게 만든다.

작업:

- `src/lib/crypto/hash.ts`
  - `sha256`, `doubleSha256`, `hash160`
- `src/lib/crypto/base58.ts`
  - Base58, Base58Check
- `src/lib/crypto/address.ts`
  - `pubkeyToAddress`, `validateAddress`
- `src/lib/crypto/signature.ts`
  - keypair 생성
  - compressed public key 유도
  - login message 서명
- `WalletCreate.tsx`, `WalletInfo.tsx`
  - `Math.random()` 생성 제거
  - create 시 실제 wallet generator 사용
  - restore 시 private key만 입력받거나 address 일치 검증 추가

완료 조건:

- FE에서 만든 address가 blockchain 구현과 동일한 형식이다
- restore 시 private key와 address가 다르면 실패한다

## Phase 3. 브라우저 keystore 도입

목표:

- private key를 암호화된 keystore로만 브라우저에 저장한다.

작업:

- IndexedDB 저장 계층 구현
- `PBKDF2-HMAC-SHA256(100000)` + `AES-256-GCM` 구현
- keystore schema 설계
- wallet unlock / lock UX 추가
- 일정 시간 미사용 시 메모리 내 decrypted key 제거

완료 조건:

- private key는 IndexedDB keystore로만 저장된다
- FE store/localStorage에는 private key 원문이 없다

## Phase 4. BE nonce challenge 인증 API 추가

목표:

- address-only JWT 발급을 challenge-response 인증으로 대체할 준비를 한다.

작업:

- `POST /api/v1/auth/challenge`
- `POST /api/v1/auth/verify`
- challenge 저장소 추가
  - 우선 Redis TTL 권장
- canonical login message 생성 규칙 확정
- 서명 검증 유틸 추가
  - secp256k1 verify
  - compressed public key 처리
  - public key -> address 재유도
- wallet address 포맷 검증 강화

완료 조건:

- private key 없이 address만 알아서는 인증할 수 없다
- challenge 재사용과 만료 challenge 사용이 차단된다

## Phase 5. Refresh token 14일 세션 도입

목표:

- access token 만료 후 재로그인 강제 대신 refresh 기반 세션 유지 구조를 만들고, 지갑별 세션을 지원한다.

작업:

- access token 만료: 15분
- refresh token 만료: 14일
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- refresh token hash 저장용 세션 테이블 추가
- refresh rotation 적용
- wallet별 refresh session handle 발급
- refresh cookie 정책 적용
  - `HttpOnly`
  - `Secure`
  - `SameSite=Lax` 또는 `Strict`

완료 조건:

- 앱 재접속 시 refresh로 access token 재발급 가능
- refresh token 탈취 재사용 리스크가 rotation으로 완화된다
- 여러 지갑이 같은 브라우저에 저장되어도 wallet별로 재인증/세션 복구가 가능하다

## Phase 6. BE 보호 자원 인증 적용

목표:

- 발급한 JWT가 실제로 접근 제어에 쓰이게 만든다.

작업:

- JWT 인증 필터 추가
- SecurityConfig 재구성
- open endpoint
  - `/auth/challenge`
  - `/auth/verify`
  - `/auth/refresh`
  - health/swagger
- protected endpoint
  - wallet 활동, exchange, lotto commit, 이후 서명 기반 명령 API
- controller/service 에서 인증된 wallet subject 사용 가능하게 정리

완료 조건:

- 토큰 없이 보호 API 호출 시 401
- 다른 wallet subject로 권한 우회가 불가능하다

## Phase 7. FE 인증 UX 전환

목표:

- 새 인증 구조에 맞게 create/restore/reopen/switch UX를 정리한다.

작업:

- create 후:
  - keystore 저장
  - `/wallet` 등록
  - challenge/verify 로그인
- restore 후:
  - address 재유도 검증
  - 필요 시 `/wallet` 등록
  - challenge/verify 로그인
- reopen 시:
  - 저장된 wallet metadata 목록 로드
  - wallet별 session handle을 읽고 복구 가능한 세션부터 상태 반영
  - active wallet은 우선 refresh 시도
  - 실패한 wallet만 unlock + 재서명 요구
- switch 시:
  - target wallet의 access token이 유효하면 즉시 전환
  - access token이 없고 refresh session이 있으면 wallet별 refresh 수행
  - 둘 다 없으면 해당 wallet만 unlock + challenge login 수행

완료 조건:

- 질문의 `9-1`, `9-2`, `9-3` 흐름이 `auth.md` 목표 구조에 맞게 자연스럽게 대체된다

# Recommended Delivery Order

1. FE store에서 private key 제거
2. FE crypto parity 구현
3. IndexedDB keystore 도입
4. BE challenge/verify API
5. FE challenge 로그인
6. BE wallet별 refresh/logout/session 저장
7. FE wallet switch / session restore
8. SecurityConfig/JWT 필터 적용

# Risk Removal Design

아래 3개는 "주의사항"으로 두지 않고, 구현 단계에서 제거하는 전제로 설계한다.

## 1. Risk 1 제거: FE/Blockchain 주소 규칙 불일치 방지

핵심 원인:

- FE와 blockchain이 서로 다른 crypto/address 규칙을 쓰면 같은 private key가 다른 address로 해석될 수 있다.

제거 방법:

### A. 기준 구현을 Python blockchain으로 고정

- `blockchain/crypto/signature.py`
- `blockchain/crypto/address.py`
- `blockchain/crypto/encryption.py`

이 3개를 단일 source of truth로 둔다.

### B. 공용 fixture 기반 golden test 추가

golden test는 "고정 입력 -> 고정 출력"이 blockchain과 완전히 같아야 통과하는 테스트다.

추가 산출물:

```text
docs/fixtures/wallet_vectors.json
```

fixture 예시:

```json
[
  {
    "privateKeyHex": "...",
    "publicKeyHex": "...",
    "address": "J...",
    "loginMessage": "SSATTO Login\n...",
    "loginMessageSha256Hex": "...",
    "signatureHex": "..."
  }
]
```

생성 방식:

- Python 스크립트로 fixture를 만든다.
- FE 테스트는 같은 입력으로 같은 public key/address/signature가 나오는지 검증한다.
- BE 테스트는 FE fixture의 `publicKey + signature + address` 조합이 서버에서 그대로 검증되는지 확인한다.

### C. 암호화는 round-trip + fixed vector를 분리

- `encrypt -> decrypt -> same private key` round-trip 테스트
- salt/nonce가 고정된 fixture 기반 복호화 테스트

랜덤 salt/nonce 때문에 암호문 전체가 항상 같을 필요는 없지만,
고정 salt/nonce를 쓰는 fixture에서는 결과가 같아야 한다.

완료 기준:

- FE unit test: keypair/address/signature/encryption parity 통과
- BE integration test: FE 생성 signature 검증 통과
- 주소 규칙 불일치 리스크를 배포 전에 테스트로 차단

## 2. Risk 2 제거: 기존 localStorage 세션 데이터 충돌 방지

핵심 원인:

- 현재 persisted store는 `wallets[].privateKey` 를 직접 들고 있다.
- 새 구조는 `wallet metadata + keystore reference + wallet session metadata` 로 바뀐다.
- 구버전 데이터를 변환하지 않으면 새 코드가 잘못된 shape을 읽게 된다.

제거 방법:

### A. store schema version 명시

persisted store에 `schemaVersion` 필드를 둔다.

- `v1`: plain private key 포함
- `v2`: private key 제거, `keystoreId`, `walletId`, `sessionHandles` 포함

### B. 첫 실행 시 마이그레이션 전용 부트스트랩

앱 시작 시:

1. `ssatto-wallet-session` 읽기
2. `schemaVersion < 2` 인지 확인
3. legacy wallet 목록 추출
4. 사용자에게 "지갑 보안 업그레이드" 모달 표시
5. 사용자 입력 비밀번호로 각 legacy private key를 keystore로 암호화
6. IndexedDB에 keystore 저장
7. Zustand persisted store를 `v2` 구조로 교체
8. 기존 plain private key 필드를 삭제
9. migration 완료 플래그 기록

### C. 실패 시 롤백 가능한 임시 백업 키 사용

중간 실패 대응:

- migration 시작 전에 legacy payload를 임시 backup key로 복사
- 전체 wallet 변환 성공 후 backup key 삭제
- 실패 시 다음 앱 시작에서 backup 기준으로 재시도

### D. 마이그레이션 이후 구조

FE persisted store 예시:

```json
{
  "schemaVersion": 2,
  "wallets": [
    {
      "walletId": "uuid",
      "address": "J...",
      "nickname": "내 지갑",
      "walletColor": "gray",
      "keystoreId": "uuid",
      "sessionHandle": "uuid-or-null"
    }
  ],
  "activeWalletId": "uuid"
}
```

해결되는 이유:

- 새 코드는 더 이상 plain private key shape를 읽지 않는다.
- legacy 데이터는 한 번만 변환되고 이후에는 새 schema만 유지된다.
- 충돌의 원인인 "구조 불일치"를 제거한다.

## 3. Risk 3 제거: 멀티 월렛과 refresh 세션 충돌 방지

핵심 원인:

- UI는 이미 multi-wallet switch를 지원한다.
- 그런데 refresh token을 브라우저 단일 세션 하나로만 설계하면 지갑 전환 시 세션 충돌이 생긴다.

제거 방법:

### A. wallet 저장과 wallet 인증 세션을 분리

FE는 아래 두 상태를 별도로 가진다.

1. wallet registry
   - 로컬에 저장된 지갑 목록
   - `walletId`, `address`, `nickname`, `walletColor`, `keystoreId`
2. wallet auth session
   - 각 wallet의 인증 상태
   - `sessionHandle`, `accessToken(in-memory)`, `accessExpiresAt`, `needsUnlock`

### B. wallet별 refresh session 도입

한 브라우저에서 여러 지갑을 유지하려면 refresh도 wallet별로 분리해야 한다.

권장 구조:

- BE가 로그인 성공 시 `sessionHandle` 을 발급
- refresh token은 `HttpOnly` 쿠키로 저장
- FE는 비민감 정보인 `sessionHandle` 만 wallet metadata에 저장
- refresh 요청 시 FE가 `walletId` 또는 `sessionHandle` 을 함께 보낸다
- BE는 해당 handle에 매핑된 refresh session만 검증/회전한다

즉, secret은 쿠키에 두고, wallet 선택은 handle로 분기한다.

### C. wallet switch 동작 규칙

지갑 전환 시:

1. target wallet의 access token이 메모리에 있으면 즉시 사용
2. 없으면 `sessionHandle` 기반 refresh 시도
3. refresh 불가면 해당 wallet만 unlock + challenge login

이 구조면 "지갑 여러 개 저장"과 "지갑 전환"이 자연스럽게 연결된다.

### D. logout도 wallet별 revoke

- `logout(walletId)` 는 해당 wallet session만 revoke
- 다른 wallet의 로그인 상태는 유지

이렇게 해야 multi-wallet UI와 세션 모델이 맞는다.

## 4. 멀티 월렛 지원을 위한 FE/BE/ERD 수정안

### FE 수정안

현재 코드 기반 영향 파일:

- [FE-ssatto/src/stores/useWalletStore.ts](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/stores/useWalletStore.ts)
- [FE-ssatto/src/pages/WalletPage.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/pages/WalletPage.tsx)
- [FE-ssatto/src/components/wallet/WalletCreate.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/components/wallet/WalletCreate.tsx)
- [FE-ssatto/src/components/wallet/WalletInfo.tsx](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/src/components/wallet/WalletInfo.tsx)

필수 수정:

- `wallets[]` 를 metadata-only 구조로 변경
- `walletId`, `keystoreId`, `sessionHandle` 필드 추가
- `token: string | null` 단일 필드 제거
- wallet별 in-memory access token 캐시 도입
- active wallet 전환 시 wallet별 refresh/login 로직 추가
- create/restore/add modal 모두 실제 wallet generator 사용
- restore는 address 수동 입력 제거 또는 검증 필수화

### BE 수정안

필수 추가 API:

- `POST /api/v1/auth/challenge`
- `POST /api/v1/auth/verify`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/sessions` 또는 wallet summary 응답 내 session state 포함 여부 검토

필수 추가 로직:

- address format 검증
- public key -> address 재유도
- wallet별 refresh session rotation
- wallet별 logout/revoke
- JWT subject + session handle 기반 인증 문맥 정리

### ERD 수정안

현재 [docs/reviews/erd.md](/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/reviews/erd.md) 에는 auth/session 테이블이 없다.
multi-wallet 세션을 지원하려면 최소 아래 테이블을 추가해야 한다.

#### `wallet_auth_session`

| 컬럼                 | 설명                                 |
| -------------------- | ------------------------------------ |
| `id`                 | PK                                   |
| `session_handle`     | FE가 참조하는 공개 세션 핸들         |
| `wallet_address`     | 지갑 주소 (`wallet.address` FK)      |
| `refresh_token_hash` | refresh token hash                   |
| `device_id`          | 브라우저/디바이스 식별자             |
| `user_agent`         | 세션 식별 보조                       |
| `status`             | ACTIVE / REVOKED / EXPIRED / ROTATED |
| `expires_at`         | refresh 만료 시각                    |
| `last_used_at`       | 마지막 사용 시각                     |
| `rotated_from_id`    | rotation 계보                        |
| `created_at`         | 생성 시각                            |
| `revoked_at`         | revoke 시각                          |

관계:

- `wallet` 1 : N `wallet_auth_session`

설계 이유:

- `wallet` 테이블은 원래부터 다중 지갑을 허용한다.
- 부족한 것은 지갑별 인증 세션 모델뿐이다.
- 따라서 ERD는 `wallet` 을 건드리기보다 `wallet_auth_session` 을 추가하는 쪽이 자연스럽다.

#### `wallet_auth_challenge`

DB 대신 Redis 권장:

- TTL 5분
- `challengeId`, `walletAddress`, `nonce`, `message`, `expiresAt`, `used`

이 항목은 영속 ERD보다는 인메모리 인증 저장소로 두는 것이 맞다.

# Done Criteria

- FE가 blockchain 규칙과 동일한 wallet을 생성/복구한다
- private key는 IndexedDB keystore 외에는 저장되지 않는다
- BE 인증은 address-only 방식이 아니라 nonce signature 검증을 사용한다
- access token 15분, refresh token 14일 구조가 동작한다
- 보호 API는 JWT subject 기반으로 통제된다
