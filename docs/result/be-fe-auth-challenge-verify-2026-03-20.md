## Overview

`docs/plans/be-fe_auth.md`를 기준으로 인증 전환 작업을 backend-first 수직 슬라이스로 시작했다. 이번 범위에서는 `BE-ssatto`에 `challenge -> verify -> access token 발급` 흐름을 추가하고, `FE-ssatto`에는 이 계약을 소비할 auth service 어댑터를 추가했다. 기존 `/auth/token` 레거시 API는 FE 전환 완료 전까지 유지한다.

## File & Class Change Log

- `BE-ssatto/build.gradle`
  - secp256k1/RIPEMD160 검증용 BouncyCastle 의존성 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/controller/AuthController.java`
  - `POST /api/v1/auth/challenge`
  - `POST /api/v1/auth/verify`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/service/AuthService.java`
  - 챌린지 발급/검증 유즈케이스 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/dto/AuthChallengeRequest.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/dto/AuthChallengeResponse.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/dto/AuthVerifyRequest.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/dto/AuthVerifyResponse.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/exception/AuthChallengeNotFoundException.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/exception/InvalidAuthChallengeRequestException.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/exception/InvalidAuthSignatureException.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/model/AuthChallenge.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/repository/AuthChallengeRepository.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/repository/RedisAuthChallengeRepository.java`
  - Redis TTL 기반 챌린지 저장소 추가
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/util/WalletAuthCrypto.java`
  - Base58Check 주소 검증
  - compressed public key -> address 재유도
  - DER 서명 검증
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/exception/ErrorCode.java`
  - auth challenge/signature 에러 코드 추가
- `BE-ssatto/src/main/resources/application.yml`
  - `auth.challenge-ttl-seconds` 설정 추가
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/auth/controller/AuthControllerTest.java`
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/auth/service/AuthServiceTest.java`
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/auth/util/WalletAuthCryptoTest.java`
  - challenge/verify 및 Python fixture parity 테스트 추가
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/PackageStructureTest.java`
  - auth 저장소/유틸/모델 디렉터리 허용
- `FE-ssatto/src/services/authService.ts`
  - `requestAuthChallenge`, `verifyAuthChallenge` 어댑터 추가
- `docs/reviews/api.md`
  - challenge/verify 인증 API 문서 반영
- `docs/reviews/erd.md`
  - Redis TTL `auth_challenge` 저장 구조 반영

## Cross-Layer Impact Summary

- Controller
  - AuthController에 challenge/verify 엔드포인트 추가
- Service
  - AuthService에 nonce 생성, canonical message 구성, 서명 검증 흐름 추가
- Repository
  - auth challenge용 Redis 저장소 추가
- RPC Client
  - 변경 없음
- MQ
  - 변경 없음
- Frontend Service/Adapter
  - 새 인증 API 호출 어댑터 추가
- Docs
  - API/ERD 문서를 실제 구현 계약에 맞춰 갱신

## Implemented Changes

- `POST /api/v1/auth/challenge` 구현
  - 등록된 지갑 + 유효한 Base58Check 주소만 챌린지 발급
  - 5분 TTL 챌린지 저장
  - canonical 로그인 메시지 반환
- `POST /api/v1/auth/verify` 구현
  - 챌린지 존재/만료/재사용 검증
  - compressed public key에서 주소 재유도
  - DER secp256k1 서명 검증
  - 성공 시 access token 발급
- Python `blockchain` 구현에서 생성한 고정 벡터로 주소/서명 정합성 테스트 추가
- FE auth service에 새 API 어댑터 추가
- `/auth/token`은 레거시 호환 API로 유지

## Tests Run

- exact commands
  - `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerTest' --tests 'ssatto.BE_ssatto.domain.auth.service.AuthServiceTest' --tests 'ssatto.BE_ssatto.domain.auth.util.WalletAuthCryptoTest'`
  - `cd BE-ssatto && ./gradlew test`
  - `cd FE-ssatto && npm run build`
- passed tests
  - auth controller/service/crypto 타깃 테스트 통과
  - `BE-ssatto` 전체 테스트 통과
  - `FE-ssatto` production build 통과
- failed tests
  - TDD 초기 단계에서 auth 관련 테스트가 `compileTestJava` 실패
  - 구현 중간 단계에서 `AuthServiceTest > 챌린지가 없으면 검증 시 도메인 예외를 던진다` 실패
  - 전체 테스트 1차 실행에서 `PackageStructureTest > requestedDomainDirectoriesExist()` 실패
- brief failure symptoms/messages
  - 초기 실패: challenge/verify DTO, 예외, 저장소, 유틸, service 메서드가 없어 symbol not found
  - 중간 실패: `walletAuthCrypto.isValidAddress()` mock 누락으로 예상보다 앞단 검증에서 예외 발생
  - 전체 테스트 실패: auth 도메인에 `repository/util/model` 추가 후 구조 테스트 기대값 미갱신
- whether failures are reproducible or environment-dependent
  - 모두 재현 가능
  - 환경 의존이 아니라 코드/테스트 불일치에서 발생한 구조적 실패

## Failed Tests / Unresolved Issues

- what was tested
  - 새 auth challenge/verify 계약, Python blockchain crypto parity, 전체 백엔드 회귀, FE 타입/빌드 정합성
- why it failed
  - TDD 단계에서 아직 구현되지 않은 타입/메서드 부재
  - 중간 단계에서 단위 테스트 mock 설정 부족
  - 패키지 구조 테스트가 새 auth 저장소 구조를 허용하지 않았음
- suspected root cause
  - 인증 설계가 기존 `auth/controller/service/dto/exception` 한정 구조에 고정돼 있었음
  - auth 전환에 필요한 저장소/유틸/모델 계층이 새로 생기면서 테스트 기대와 어긋남
- impact scope
  - auth 도메인 전체, 패키지 구조 테스트, FE auth service 타입
- what should be improved next
  - FE 실제 로그인 UI를 `challenge/verify`로 전환
  - Redis 통합 테스트 추가
  - `/auth/token` 제거 시점 정리

현재 미해결 이슈:

- FE `WalletPage`와 지갑 생성/복구 UI는 아직 새 `challenge/verify`를 사용하지 않고 기존 `/auth/token` 흐름에 머물러 있다.
- FE 지갑 생성은 여전히 `Math.random()` mock 주소/키를 사용하므로, 새 인증 API를 실제로 붙이려면 crypto parity 구현이 선행돼야 한다.
- Redis 실환경 통합 테스트는 아직 추가하지 않았다.

## Risks / Assumptions

- `.agents/rules/domain.md`, `.agents/rules/infra.md`는 현재 워크스페이스에 존재하지 않아 적용하지 못했다.
- 이번 문서 갱신은 현재 구현된 `challenge/verify`와 레거시 `/auth/token` 병행 상태를 기준으로 작성했다.
- `RedisAuthChallengeRepository`는 실제 Redis 서버가 없는 테스트 환경에서는 mock 기반으로만 검증했다.
- refresh token, logout, protected endpoint 강제는 이번 범위에 포함하지 않았다.

## Next Steps

- FE crypto parity 구현 (`secp256k1 + Base58Check`)으로 mock wallet 제거
- FE `WalletPage` 로그인 흐름을 `challenge -> sign -> verify`로 전환
- Redis 통합 테스트 및 challenge 재사용/만료 시나리오 보강
- 이후 refresh token/session handle 단계로 확장

## Prompt for Next Fix

다음 작업으로 `docs/plans/be-fe_auth.md`의 다음 단계에 맞춰 FE 실제 로그인 흐름을 `challenge/verify`로 전환해줘. 주요 대상은 `FE-ssatto/src/pages/WalletPage.tsx`, `FE-ssatto/src/components/wallet/WalletCreate.tsx`, `FE-ssatto/src/components/wallet/WalletInfo.tsx`, `FE-ssatto/src/stores/useWalletStore.ts`, `FE-ssatto/src/services/authService.ts`, 그리고 필요 시 새 `src/lib/crypto/*` 모듈이다. 현재 failing behavior는 백엔드에는 `/api/v1/auth/challenge`, `/api/v1/auth/verify`가 생겼지만 FE가 여전히 `/auth/token`과 `Math.random()` 기반 mock 주소/키를 사용한다는 점이다. suspected cause는 FE crypto parity와 개인키 기반 서명 로직이 아직 없기 때문이다. required fixes는 `blockchain/crypto/signature.py`, `blockchain/crypto/address.py`, `blockchain/crypto/encryption.py`와 정합한 FE keypair/address/signature 구현, restore 검증, challenge 메시지 서명, verify 로그인 연결이다. tests that must pass는 `cd BE-ssatto && ./gradlew test`, `cd FE-ssatto && npm run build`, 그리고 FE에 추가하는 crypto/address/auth adapter 테스트다. remaining spec constraints는 private key를 서버에 보내지 말 것, Controller -> RPC direct call 금지, user-facing text는 한국어, FE page/widget/entity/service/adapter 분리를 유지할 것, `/auth/token`는 완전 전환 전까지만 호환용으로 유지할 것이다.
