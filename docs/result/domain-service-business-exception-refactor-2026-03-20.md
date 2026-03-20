# Overview

- `global.exception.BusinessException`를 유지한 채, 서비스 계층에서 직접 던지던 공통 예외를 도메인별 예외 클래스로 치환했다.
- 목표는 서비스 코드에서 예외 발생 의도를 클래스명만 보고 바로 읽을 수 있게 만드는 것이다.
- 전역 예외 처리 계약(`ErrorCode + BusinessException + GlobalExceptionHandler`)은 그대로 유지했다.

# File & Class Change Log

- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/service/AuthService.java`
  - 공통 예외를 `InvalidAuthTokenRequestException`, `AuthWalletNotFoundException`로 치환했다.
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
  - 공통 예외를 `WalletAddressDuplicatedException`, `WalletNotFoundException`, `InvalidWalletRequestException`로 치환했다.
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java`
  - 공통 예외를 `InvalidLottoRequestException`, `InvalidLottoNumbersException`, `LottoEntryMappingException`로 치환했다.
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/service/ExchangeService.java`
  - 공통 예외를 `InvalidExchangeRequestException`, `ExchangeBelowMinimumException`로 치환했다.

- 신규 예외 클래스
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/exception/AuthWalletNotFoundException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/exception/InvalidAuthTokenRequestException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/exception/InvalidWalletRequestException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/exception/WalletAddressDuplicatedException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/exception/WalletNotFoundException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/exception/InvalidLottoRequestException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/exception/InvalidLottoNumbersException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/exception/LottoEntryMappingException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/exception/InvalidExchangeRequestException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/exception/ExchangeBelowMinimumException.java`

- 테스트
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/auth/service/AuthServiceTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/service/WalletServiceTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/lotto/service/LottoServiceTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/exchange/service/ExchangeServiceTest.java`

# Cross-Layer Impact Summary

- Controller:
  - 변경 없음. 요청/응답 계약 유지.
- Service:
  - 주요 변경 지점. 도메인 예외를 직접 사용하도록 가독성을 높였다.
- Repository:
  - 변경 없음.
- RPC Client:
  - 변경 없음.
- MQ:
  - 변경 없음.
- Global Exception Handling:
  - 모든 도메인 예외가 `BusinessException`를 상속하므로 기존 핸들러와 HTTP 응답 계약은 유지된다.

# Implemented Changes

- 서비스 계층에서 `throw new BusinessException(...)`를 직접 쓰던 부분을 도메인 의미가 드러나는 클래스명으로 바꿨다.
- 도메인 예외는 각 도메인 `exception` 패키지에 배치했다.
- 에러 코드는 바꾸지 않고, 예외 타입만 분리해 기존 응답 스펙을 깨지 않도록 했다.
- `AuthService` 예외 검증용 단위 테스트를 신규 추가했다.
- 기존 서비스 테스트는 구체 도메인 예외 타입을 기대하도록 수정했다.

# Tests Run

- Command: `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.domain.lotto.service.LottoServiceTest' --tests 'ssatto.BE_ssatto.domain.exchange.service.ExchangeServiceTest' --tests 'ssatto.BE_ssatto.domain.auth.service.AuthServiceTest'`
  - passed tests:
    - `WalletServiceTest`
    - `LottoServiceTest`
    - `ExchangeServiceTest`
    - `AuthServiceTest`
  - failed tests:
    - 첫 시도 컴파일 실패
  - brief failure symptoms/messages:
    - 신규 예외 클래스 import 대상이 아직 없어서 `package ... does not exist`, `cannot find symbol`
  - whether failures are reproducible or environment-dependent:
    - 재현성 있음. 구현 전 단계의 정상적인 TDD 실패

- Command: `cd BE-ssatto && ./gradlew test`
  - passed tests:
    - backend 전체 테스트 통과
  - failed tests:
    - 없음
  - brief failure symptoms/messages:
    - 없음
  - whether failures are reproducible or environment-dependent:
    - 재현성 있음

# Failed Tests / Unresolved Issues

- 현재 기준 실패 테스트 없음
  - what was tested:
    - 서비스 단위 테스트와 backend 전체 테스트
  - why it failed:
    - 해당 없음
  - suspected root cause:
    - 해당 없음
  - impact scope:
    - 해당 없음
  - what should be improved next:
    - controller나 RPC 계층에도 같은 예외 명명 규칙을 확장할지 팀 기준을 정하면 좋다

# Risks / Assumptions

- 이번 작업은 서비스 계층 가독성 개선에 집중했으므로, controller와 RPC client는 기존 `BusinessException` 사용을 유지했다.
- 에러 코드와 HTTP 상태는 유지되므로 외부 API 계약 변화는 없다고 가정했다.
- 도메인 예외 수가 늘어났기 때문에, 향후 너무 세분화되지 않도록 명명 기준을 문서화하는 편이 좋다.

# Next Steps

- `blockchain/controller`, `blockchain/rpc`처럼 아직 공통 예외를 직접 쓰는 영역에 같은 규칙을 적용할지 결정한다.
- 도메인 예외 클래스 네이밍 가이드를 간단히 정리해 신규 서비스 구현 시 일관성을 맞춘다.

# Prompt for Next Fix

`BE-ssatto`에서 service 계층에 적용한 도메인 예외 명명 규칙을 controller / rpc 계층으로 확장할지 검토하고 필요한 최소 범위만 적용해줘. likely files/layers involved: `domain/blockchain/controller/BlockchainController.java`, `domain/blockchain/rpc/JackpotChainHttpRpcClient.java`, `global/exception/*`, 관련 테스트. current failing behavior: 현재 실패는 없지만 일부 계층은 여전히 `BusinessException`를 직접 사용해 규칙이 혼재돼 있다. suspected cause: 이번 작업 범위를 service로 제한했기 때문이다. required fixes: 계층 경계를 해치지 않으면서 가독성이 필요한 지점만 도메인 예외 또는 계층 예외로 치환하고, 기존 `ErrorCode`/HTTP 계약은 유지한다. tests that must pass: `cd BE-ssatto && ./gradlew test`. remaining spec constraints: Controller는 request/response만 담당, Service는 유즈케이스/트랜잭션 경계 유지, RPC 실패는 `ERROR`, request entry/query `log.info()` 금지. 
