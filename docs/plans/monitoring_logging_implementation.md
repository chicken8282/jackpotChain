# Monitoring Logging Implementation Plan

> 작성일: 2026-03-21
> 기준 문서: `docs/reviews/monitoring.md`
> 대상: `BE-ssatto`

## 목표

1차 구현 범위에서 아래를 완료한다.

1. 운영 수집 기준에 맞는 구조화 로그 기반을 만든다.
2. 요청 단위 추적값(`traceId`, `requestId`, `uri`, `method`)을 모든 로그에 싣는다.
3. 핵심 비즈니스 성공 이벤트를 `INFO`로 일관되게 남긴다.
4. 비즈니스 예외와 장애성 예외를 구분해 기록한다.
5. JackpotChain RPC 실패 로그에 원인과 문맥을 더한다.

## 1차 구현 범위

- `logback-spring.xml` 추가
- MDC 기반 요청 로깅 필터 추가
- 공통 필드/이벤트명을 다루는 logging 패키지 추가
- 서비스 계층 핵심 이벤트 로그 공통화
- `GlobalExceptionHandler` 구조화
- `JackpotChainHttpRpcClient` RPC 실패 로그 강화

## 제외 범위

- Promtail/Loki/Grafana 설정
- WARN 선별 수집 정책의 운영 필터링
- 메트릭, tracing, OpenTelemetry
- Redis/RabbitMQ 이벤트 발행 연동
- 전수 테스트 추가

## 구현 순서

1. `global/logging` 패키지 추가
2. `RequestLoggingFilter`로 MDC 필드 주입
3. `SecurityConfig`에 필터 연결
4. `logback-spring.xml`로 local/prod 출력 포맷 분리
5. `BusinessEventLogger`로 핵심 성공 이벤트 통일
6. `GlobalExceptionHandler`에 공통 필드 추가
7. `JackpotChainHttpRpcClient`에 RPC 실패/지연 로그 추가
8. 빌드 또는 테스트로 컴파일 검증

## 수정 대상 파일

- `BE-ssatto/build.gradle`
- `BE-ssatto/src/main/resources/logback-spring.xml`
- `BE-ssatto/src/main/resources/application.yml`
- `BE-ssatto/src/main/resources/application-local.yml`
- `BE-ssatto/src/main/resources/application-prod.yml`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/exception/GlobalExceptionHandler.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/service/AuthService.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/service/ExchangeService.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/service/JackpotChainNodeService.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`

## 새로 만들 파일

- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/LoggingFields.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/LoggingEventType.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/LoggingUtils.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/BusinessEventLogger.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/RequestLoggingFilter.java`

## 완료 기준

- 서버 로그에 `traceId`, `requestId`, `method`, `uri`가 찍힌다.
- 아래 이벤트가 구조화된 `INFO`로 찍힌다.
  - `AUTH_TOKEN_ISSUED`
  - `WALLET_REGISTERED`
  - `EXCHANGE_TRANSACTION_SUBMITTED`
  - `LOTTO_COMMIT_SUBMITTED`
  - `LOTTO_CLAIM_SUBMITTED`
  - `JACKPOTCHAIN_TRANSACTION_SUBMITTED`
- 비즈니스 예외는 `WARN`, 미처리 예외는 `ERROR`로 구분된다.
- RPC 실패 로그에 `method`, `message`, `latencyMs`가 포함된다.
