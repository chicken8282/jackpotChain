# BE 모니터링 로깅 설계 메모

> 작성일: 2026-03-20
> 대상: `BE-ssatto`
> 참고 문서: `docs/reviews/architecture.md`

---

## 1. 목적

백엔드 운영 시 아래 두 가지를 빠르게 확인할 수 있도록 로깅 기준을 정리한다.

1. 장애가 났는가
2. 장애 직전과 직후에 어떤 핵심 비즈니스 이벤트가 있었는가

현재 아키텍처 문서에서는 `JSON 로그 + Promtail + Loki + Grafana` 조합을 사용하도록 되어 있으므로, 백엔드 로그도 Loki에서 검색하기 쉬운 구조화 로그를 기준으로 잡는 것이 맞다.

---

## 2. 현재 코드 기준 로그 현황

현재 `BE-ssatto`에는 다음 성격의 로그가 이미 존재한다.

| 위치 | 현재 로그 수준 | 의미 |
|------|----------------|------|
| `GlobalExceptionHandler` | `warn`, `error` | 비즈니스 예외 / 예상치 못한 서버 예외 |
| `WalletService#createWallet` | `info` | 지갑 등록 성공 |
| `ExchangeService#exchangeJackToPot` | `info` | 교환 트랜잭션 제출 성공 |
| `LottoService#commit` | `info` | 로또 커밋 제출 성공 |
| `JackpotChainNodeService#submitSignedTransaction` | `info` | 노드 트랜잭션 제출 성공 |
| `JackpotChainHttpRpcClient` | `error` | JackpotChain RPC 실패 |
| `JwtUtil` | `debug` | 만료/위조 토큰 파싱 실패 |

즉, 이미 방향은 나쁘지 않다.

- 핵심 성공 이벤트는 `info`
- 예상 가능한 비즈니스 실패는 `warn`
- 장애성 실패는 `error`
- 디버깅용 상세 원인은 `debug`

다만 공통 포맷, MDC, 요청 단위 추적값, 어떤 이벤트를 `info`로 남길지에 대한 기준이 아직 없다.

---

## 3. 운영 수집 로그 수준 추천

### 3.1 결론

운영에서 우선 수집할 수준은 아래처럼 가져가는 것이 적절하다.

- `ERROR`: 전량 수집
- `INFO`: 핵심 비즈니스 이벤트만 선별 수집
- `WARN`: 전량 수집까지는 불필요, 단 운영상 의미 있는 경고는 별도 정책 필요
- `DEBUG`: 운영 수집 제외

질문에서 제안한 `error + info(핵심 비즈니스 로직)` 중심 수집은 좋은 출발점이다. 현재 서비스 규모와 코드 상태를 보면 가장 현실적이다.

### 3.2 왜 `ERROR + INFO`가 기본이 맞는가

`ERROR`는 장애 감지의 최소 단위다.

- RPC 타임아웃
- 예상하지 못한 서버 예외
- 외부 시스템 응답 파싱 실패
- 데이터 정합성 깨짐

이 로그는 반드시 수집해야 한다.

`INFO`는 "장애 원인과 비즈니스 흐름을 이어주는 로그"로 쓰는 것이 좋다.

- 누가 어떤 지갑으로 요청했는지
- 어떤 tx가 생성되었는지
- 어떤 비즈니스 액션이 성공했는지
- 장애 시점 직전에 어떤 핵심 액션이 있었는지

반대로 모든 조회 요청을 `info`로 쌓기 시작하면, Loki에서 잡음이 너무 많아지고 실제 중요한 이벤트가 묻힌다.

### 3.3 `WARN`을 어떻게 볼 것인가

현재 `GlobalExceptionHandler`는 `BusinessException`, 검증 실패를 `warn`으로 남긴다. 이 자체는 맞다. 다만 운영 수집 기준을 `error + info`로만 두면 4xx 성격의 실패가 중앙 로그에서 사라질 수 있다.

그래서 권장안은 아래와 같다.

1. 기본 운영 대시보드/장기 보관 기준은 `ERROR + INFO`
2. `WARN`은 전량 장기 보관하지 말고, 아래 두 경우만 선별 관리
3. 보안/외부연동/비정상 반복 징후는 `WARN` 유지
4. 단순 사용자 입력 오류는 알림 대상에서 제외

예시:

- 유지할 `WARN`
  - 동일 주소로 지갑 중복 생성 반복
  - 인증 실패 반복
  - RPC 지연 임계치 초과
  - 응답 파싱은 되었지만 값이 비정상
- 장기 수집 필요가 낮은 `WARN`
  - 단순 필수값 누락
  - 화면에서 잘못 보낸 쿼리 파라미터
  - 사용자가 잘못 입력한 commit hash

즉, 실무적으로는 `WARN`을 "수집 안 한다"보다는 "장애 대응에 의미 있는 경고만 남긴다"가 더 안전하다.

### 3.4 최종 추천 정책

운영 1차안은 아래처럼 정리하는 것을 권장한다.

| 수준 | 운영 수집 | 기준 |
|------|----------|------|
| `ERROR` | 수집 | 장애, 외부 연동 실패, 미처리 예외 |
| `INFO` | 수집 | 핵심 비즈니스 성공 이벤트 |
| `WARN` | 조건부 수집 | 보안/반복실패/성능저하/이상징후만 |
| `DEBUG` | 미수집 | 로컬/개발 환경 전용 |

---

## 4. 어떤 `INFO`를 핵심 비즈니스 로그로 볼 것인가

운영에서 `INFO`로 남길 이벤트는 "조회"가 아니라 "상태 변화" 중심으로 보는 것이 좋다.

### 4.1 반드시 남길 것

| 도메인 | 이벤트 | 예시 |
|--------|--------|------|
| Auth | 토큰 발급 성공 | `AUTH_TOKEN_ISSUED` |
| Wallet | 지갑 등록 성공 | `WALLET_REGISTERED` |
| Exchange | JACK→POT 교환 제출 성공 | `EXCHANGE_TRANSACTION_SUBMITTED` |
| Lotto | 로또 커밋 제출 성공 | `LOTTO_COMMIT_SUBMITTED` |
| Blockchain | 노드 tx 제출 성공 | `JACKPOTCHAIN_TRANSACTION_SUBMITTED` |

### 4.2 필요시 추가할 것

| 도메인 | 이벤트 | 이유 |
|--------|--------|------|
| Lotto | 결과 조회 시 당첨 상태 판정 | 장애 분석 시 commit 이후 흐름 추적 |
| Wallet | 활동 이력 적재/동기화 성공 | 추후 비동기화 도입 시 중요 |
| Exchange | 최소 교환량 미만 요청 반복 | 사용자 오남용/UX 문제 탐지 |

### 4.3 기본적으로 남기지 않을 것

- 단순 조회 성공 (`getOverview`, `getWallets`, `getEntries`, `getExchangeInfo`, `getDashboard`)
- actuator health 성공
- Swagger, 정적 문서 요청

이런 요청은 메트릭으로 보는 편이 낫다.

---

## 5. 로그 포맷 기준

아키텍처 문서 방향대로 JSON 구조화 로그를 기준으로 한다.

최소 포함 필드는 아래 정도가 적절하다.

```json
{
  "timestamp": "2026-03-20T10:15:30.120+09:00",
  "level": "INFO",
  "service": "jackpotchain-backend",
  "profile": "prod",
  "traceId": "9a7c4d7b7f8a4c2b",
  "requestId": "f6f2bb10-ef07-4d2e-8f01-932b4e12e1a1",
  "eventType": "LOTTO_COMMIT_SUBMITTED",
  "uri": "/api/v1/lotto/commit",
  "method": "POST",
  "walletAddress": "jack1...",
  "txId": "abc123...",
  "message": "lotto commit submitted"
}
```

### 필드 원칙

- `traceId`, `requestId`: 요청 단위 추적용
- `eventType`: Grafana/Loki 검색 기준
- `walletAddress`, `txId`, `commitHash`: 도메인 추적용
- `uri`, `method`, `status`: HTTP 문맥
- `errorCode`, `exception`: 실패 원인 추적용

### 민감정보 원칙

아래 값은 로그에 남기지 않는다.

- JWT 원문
- `signedTxHex`
- 비밀번호/시크릿/env 값
- 개인정보가 될 수 있는 전체 사용자 식별값

지갑 주소는 운영 추적상 필요하므로 부분 마스킹 여부만 팀 내에서 결정하면 된다.

---

## 6. 코드 레벨 구현 방향

현재 구조에서는 AOP로 모든 메서드를 자동 로깅하기보다, 아래 두 축으로 가는 것이 더 적절하다.

1. 요청 단위 공통 문맥은 `Filter`에서 세팅
2. 비즈니스 이벤트는 서비스 메서드에서 명시적으로 `info`

이 방식이 좋은 이유는 다음과 같다.

- 자동 로깅보다 잡음이 적다
- 어떤 이벤트를 수집하는지 코드에서 명확하다
- 핵심 비즈니스 로직과 운영 이벤트의 연결이 쉬워진다
- 이후 Loki 쿼리 기준을 `eventType` 중심으로 맞추기 쉽다

---

## 7. 생성/수정할 파일과 역할

아래는 1차 도입 기준으로 추천하는 파일 구성이다.

### 7.1 새로 생성할 파일

| 파일 | 역할 |
|------|------|
| `BE-ssatto/src/main/resources/logback-spring.xml` | JSON 콘솔 로그 포맷, profile별 appender/패턴 관리 |
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/RequestLoggingFilter.java` | 요청 시작/종료 시 `traceId`, `requestId`, `method`, `uri`를 MDC에 저장하고 정리 |
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/LoggingFields.java` | MDC key, eventType key, 공통 필드명 상수 정의 |
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/BusinessEventLogger.java` | 서비스 계층에서 구조화된 `info/warn/error`를 일관된 형태로 남기는 공통 컴포넌트 |

### 7.2 수정할 파일

| 파일 | 수정 목적 |
|------|----------|
| `BE-ssatto/src/main/resources/application.yml` | 기본 로그 정책, profile별 logging 설정 정리 |
| `BE-ssatto/src/main/resources/application-local.yml` | 개발용 `DEBUG/TRACE` 허용 범위 유지 |
| `BE-ssatto/src/main/resources/application-prod.yml` | 운영용 로그 레벨 고정, Hibernate SQL 로그 억제 |
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/exception/GlobalExceptionHandler.java` | 예외 로그를 구조화하고 `errorCode`, `uri`, `requestId` 등 포함 |
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/service/AuthService.java` | 토큰 발급 성공 `info` 추가 |
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java` | 기존 지갑 등록 로그를 공통 포맷으로 정리 |
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/service/ExchangeService.java` | 교환 성공 이벤트 공통 포맷 적용 |
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java` | 커밋 성공 이벤트 공통 포맷 적용 |
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java` | RPC 실패 로그에 method, latency, endpoint 등 추가 |

### 7.3 선택적으로 고려할 파일

| 파일 | 역할 |
|------|------|
| `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/logging/AccessLoggingFilter.java` | 요청/응답 요약 로그를 별도로 남기고 싶을 때 사용 |
| `BE-ssatto/src/test/java/.../logging/...` | 필터, 예외 로그, 이벤트 로그 포맷 검증 |

1차에서는 `RequestLoggingFilter` 하나로 충분하다. `AccessLoggingFilter`까지 분리하면 구조는 깔끔해지지만 지금 규모에서는 과할 수 있다.

---

## 8. 작업 항목 정리

### 8.1 1단계: 공통 로깅 인프라 추가

1. `logback-spring.xml` 추가
2. JSON 콘솔 로그 포맷 정의
3. `traceId`, `requestId`, `eventType`, `uri`, `method` MDC 필드 노출
4. `local`, `prod` profile별 출력 정책 분리

### 8.2 2단계: 요청 추적값 주입

1. `RequestLoggingFilter` 추가
2. 요청 시작 시 `requestId` 생성
3. `X-Request-Id`가 들어오면 재사용, 없으면 서버 생성
4. 응답 후 MDC 정리

### 8.3 3단계: 핵심 비즈니스 이벤트 정리

1. `BusinessEventLogger` 추가
2. `eventType` 기준으로 로그 남기기
3. 아래 이벤트를 우선 적용
4. `AUTH_TOKEN_ISSUED`
5. `WALLET_REGISTERED`
6. `EXCHANGE_TRANSACTION_SUBMITTED`
7. `LOTTO_COMMIT_SUBMITTED`
8. `JACKPOTCHAIN_TRANSACTION_SUBMITTED`

### 8.4 4단계: 예외 로그 구조화

1. `GlobalExceptionHandler`에서 공통 필드 포함
2. `BusinessException`은 `warn`
3. 미처리 예외는 `error + stacktrace`
4. `errorCode`, `status`, `uri`, `requestId` 포함

### 8.5 5단계: RPC 장애 추적 강화

1. `JackpotChainHttpRpcClient`에 호출 시작/실패/지연 로그 기준 추가
2. 실패 로그에 `method`, `latencyMs`, `endpoint` 포함
3. 필요 시 임계치 초과를 `warn`으로 분리

---

## 9. 실제 적용 시 이벤트 명명 규칙

이벤트명은 과하게 세분화하지 말고, 도메인 액션 기준으로 고정하는 것이 좋다.

예시:

- `AUTH_TOKEN_ISSUED`
- `WALLET_REGISTERED`
- `WALLET_DUPLICATE_REJECTED`
- `EXCHANGE_TRANSACTION_SUBMITTED`
- `LOTTO_COMMIT_SUBMITTED`
- `LOTTO_RESULT_CHECKED`
- `JACKPOTCHAIN_RPC_FAILURE`
- `UNHANDLED_EXCEPTION`

규칙:

- 전부 대문자 스네이크 케이스
- 성공/실패를 이벤트명 또는 level 중 하나로만 표현
- 같은 의미의 이름을 여러 형태로 만들지 않기

---

## 10. 테스트/검증 항목

도입 후 아래를 확인해야 한다.

1. `prod`에서 JSON 한 줄 로그가 정상 출력되는지
2. 요청마다 `traceId`, `requestId`가 찍히는지
3. `Wallet`, `Exchange`, `Lotto`, `Auth` 핵심 이벤트가 `INFO`로 검색되는지
4. `BusinessException`과 `Unhandled Exception`이 구분되어 보이는지
5. `signedTxHex`, JWT 원문이 로그에 남지 않는지
6. Loki에서 `eventType`, `traceId`, `walletAddress` 기준 검색이 되는지

---

## 11. 최종 제안

현재 백엔드 상태에서는 운영 로그 수집 기준을 아래처럼 두는 것이 가장 적절하다.

- 기본 수집: `ERROR + INFO(핵심 비즈니스 이벤트)`
- 조건부 수집: `WARN(보안/외부연동/반복실패/이상징후)`
- 미수집: `DEBUG`

즉, 질문에서 말한 "우선 `error`와 `info(핵심 비즈니스 로직)`를 수집하자"는 방향은 맞다.

다만 바로 실행에 옮길 때는 아래 두 점을 같이 반영해야 한다.

1. 현재 `warn`으로 남는 `BusinessException` 중 어떤 것은 운영 의미가 있으므로, `warn` 전량 폐기보다는 선별 기준을 둔다.
2. `info`는 성공한 핵심 액션만 남기고, 단순 조회 성공 로그는 메트릭으로 대체한다.

이 기준으로 가면 로그량을 과도하게 늘리지 않으면서도 장애 대응에 필요한 맥락은 확보할 수 있다.
