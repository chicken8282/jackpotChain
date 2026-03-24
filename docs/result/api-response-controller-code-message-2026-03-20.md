## Overview

`BE-ssatto`의 공통 응답 래퍼 `ApiResponse`에서 하드코딩된 성공 코드/메시지를 제거하고, 도메인별 컨트롤러가 각 엔드포인트에 맞는 성공 메시지를 직접 지정하도록 수정했다. 응답 `code` 필드는 문자열이 아니라 숫자 HTTP 상태 코드로 통일했다.

## File & Class Change Log

- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/response/ApiResponse.java`
  - `code` 타입을 `String`에서 `int`로 변경
  - `success/error` 팩토리 메서드를 `code/message` 명시형 시그니처로 변경
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/exception/GlobalExceptionHandler.java`
  - 예외 응답 `code`를 `ErrorCode.name()` 대신 `HttpStatus.value()`로 반환하도록 변경
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/controller/AuthController.java`
  - 토큰 발급 성공 메시지 지정
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/controller/WalletController.java`
  - 지갑 등록/목록/활동 내역 성공 메시지 지정
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/controller/ExchangeController.java`
  - 교환 정보/교환 완료 성공 메시지 지정
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/controller/LottoController.java`
  - 로또 정보/참여/내역/결과 성공 메시지 지정
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/controller/BlockchainController.java`
  - 대시보드/블록 상세 성공 메시지 지정
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/global/response/ApiResponseTest.java`
  - 숫자 코드 기반 응답 계약 테스트로 갱신
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/global/exception/GlobalExceptionHandlerTest.java`
  - 예외 응답의 숫자 코드 계약 테스트로 갱신
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/auth/controller/AuthControllerTest.java`
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/controller/WalletControllerTest.java`
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/exchange/controller/ExchangeControllerTest.java`
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/lotto/controller/LottoControllerTest.java`
- `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/blockchain/controller/BlockchainControllerTest.java`
  - 각 엔드포인트별 숫자 코드와 성공 메시지 검증 추가

## Cross-Layer Impact Summary

- Controller
  - 성공 응답 `code/message`를 엔드포인트 단에서 결정하도록 변경
- Service
  - 변경 없음
- Repository
  - 변경 없음
- RPC Client
  - 변경 없음
- MQ
  - 변경 없음
- Global Exception Handling
  - 실패 응답 `code`도 숫자 HTTP 상태 코드로 통일

## Implemented Changes

- `ApiResponse`의 전역 성공 하드코딩(`SUCCESS`, `Request completed successfully.`) 제거
- 컨트롤러별 성공 메시지를 `docs/reviews/api.md`의 응답 예시와 맞춰 반영
- 예외 응답도 동일한 숫자 코드 체계로 정렬
- 컨트롤러/예외 응답 테스트를 숫자 코드 + 명시 메시지 검증으로 보강

## Tests Run

- 명령어
  - `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.global.response.ApiResponseTest' --tests 'ssatto.BE_ssatto.global.exception.GlobalExceptionHandlerTest' --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest' --tests 'ssatto.BE_ssatto.domain.exchange.controller.ExchangeControllerTest' --tests 'ssatto.BE_ssatto.domain.lotto.controller.LottoControllerTest' --tests 'ssatto.BE_ssatto.domain.blockchain.controller.BlockchainControllerTest'`
  - `cd BE-ssatto && ./gradlew test`
- passed tests
  - 타깃 테스트 7개 클래스 통과
  - 전체 `BE-ssatto` 테스트 통과
- failed tests
  - TDD 첫 단계에서 동일 타깃 테스트 실행 시 컴파일 실패 발생
- brief failure symptoms/messages
  - `ApiResponse.success(int, String, T)` / `ApiResponse.success(int, String)` / `ApiResponse.error(int, String)` 메서드가 존재하지 않아 `compileTestJava` 실패
- whether failures are reproducible or environment-dependent
  - 재현 가능
  - 구현 전 상태에서 항상 동일하게 발생하는 구조적 실패

## Failed Tests / Unresolved Issues

- what was tested
  - 숫자 코드 기반 `ApiResponse` 시그니처와 컨트롤러 응답 계약
- why it failed
  - 구현 전 `ApiResponse`가 문자열 코드와 하드코딩 성공 메시지에 고정돼 있었음
- suspected root cause
  - 성공 응답 생성 책임이 `ApiResponse` 내부에 고정되어 컨트롤러별 계약을 표현할 수 없었음
- impact scope
  - 전 컨트롤러 성공 응답, 전역 예외 응답, 관련 테스트
- what should be improved next
  - 응답 메시지를 컨트롤러 상수 대신 별도 응답 명세 enum 또는 도메인 응답 정책 객체로 분리할지 결정 필요

현재 미해결 런타임 이슈는 없다.

## Risks / Assumptions

- `docs/reviews/api.md`의 성공 메시지를 현재 최종 응답 계약으로 간주했다.
- 성공 HTTP 상태는 현재 구현된 모든 엔드포인트에서 `200`으로 유지했다.
- 기존 워크트리에 이미 존재하던 다른 수정 사항은 이번 작업 범위에 포함하지 않았다.

## Next Steps

- 컨트롤러별 성공 메시지 상수를 별도 응답 계약 레이어로 정리할지 결정
- FE 타입 정의가 `code: string`으로 남아 있다면 숫자 코드 기준으로 정합성 점검

## Prompt for Next Fix

다음 작업으로 FE-ssatto와 API 응답 타입 정합성을 맞춰줘. 대상은 `FE-ssatto`의 API 응답 타입/어댑터 계층과 필요 시 `BE-ssatto`의 응답 문서다. 현재 백엔드는 `ApiResponse.code`를 문자열이 아닌 숫자 HTTP 상태 코드로 내려주고, 컨트롤러별 `message`도 명시적으로 내려준다. 프론트에서 아직 `code: string` 또는 `"SUCCESS"` 기반 분기 로직이 남아 있으면 이를 숫자 코드 기반으로 바꾸고, 각 API 어댑터/서비스/상태 전이 테스트를 갱신해라. 최소 검증은 FE 응답 타입 테스트, API 어댑터 테스트, 필요 시 통합 렌더 테스트이며, 백엔드 스펙의 Controller 책임 분리와 현재 응답 계약을 유지해야 한다.
