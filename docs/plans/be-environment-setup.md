# 목표

`BE-ssatto`의 로컬 및 운영 환경을 위한 안정적인 Spring Boot 백엔드 기준선을 수립한다. 범위에는 프로필 분리 설정, 로컬 PostgreSQL Compose 지원, 공통 API 응답 및 예외 처리, Actuator health 노출, 초기 모듈러 모놀리식 패키지 골격 구성이 포함된다.

# 범위

- 설정 파일을 `application.yml`, `application-local.yml`, `application-prod.yml`로 정리
- 로컬 PostgreSQL Docker Compose 설정 추가
- HikariCP 기반 DataSource 연결 구성과 기본 JPA 설정 검증
- `ApiResponse<T>`와 공통 예외 처리 정의
- Lombok 및 Bean Validation이 정상 컴파일되고 동작하는지 확인
- `/actuator/health` 노출 및 검증
- `blockchain`, `wallet`, `exchange`, `lotto`, `mining`, `ops` 도메인 패키지 골격 생성

범위 제외:

- 도메인 엔드포인트 구현
- Repository 쿼리 및 트랜잭션 비즈니스 로직
- RPC 클라이언트, Redis, RabbitMQ 런타임 연동
- 테스트 기동에 필요한 수준을 넘어서는 Flyway 마이그레이션

# 참고 명세

- `AGENTS.md`
- `docs/specs/backend-spec.md`
- `docs/reviews/plan.md`
- `docs/reviews/api.md`

# 영향 레이어

- Controller: 검증 및 예외 매핑 확인용 테스트 전용 더미 컨트롤러, actuator 엔드포인트 노출
- Service: 없음
- Repository: 없음
- RPC Client: 없음
- MQ: 없음
- 전역 인프라: Spring Boot 설정, 응답 모델, 예외 처리, 보안 허용 경로, 패키지 레이아웃

# 실패 지점

- 패키지 불일치로 인해 Spring 컴포넌트 스캔 또는 테스트 기동 실패
- 프로필 연결이 잘못되어 잘못된 DataSource에 바인딩됨
- Actuator 의존성 누락으로 `/actuator/health` 미노출
- 검증 실패 응답 포맷이 일관되지 않음
- 처리되지 않은 예외가 내부 구현 정보를 노출하거나 비일관된 상태 코드를 반환함
- PostgreSQL 컨테이너 설정이 없어 로컬 개발 환경 구성이 막힘
- 비테스트 환경에서 스키마가 없을 때 `ddl-auto=validate`가 실패함

# 구현 단계

1. 패키지 선언을 하나의 기준 패키지로 통일하고 현재 골격이 컴파일되도록 정리한다.
2. 공통 응답, 예외 처리, 검증, health 노출을 검증하는 테스트를 먼저 추가한다.
3. Lombok 및 Validation을 유지하면서 Actuator 지원이 포함되도록 Gradle 의존성을 조정한다.
4. 공통, 로컬, 운영, 테스트 프로필별 설정을 정리한다.
5. PostgreSQL 로컬 개발용 `docker-compose.local.yml`을 추가한다.
6. `ApiResponse`, `ErrorCode`, `BusinessException`, `GlobalExceptionHandler`를 구현 또는 정리한다.
7. 추적 가능한 placeholder와 함께 모듈러 모놀리식 도메인 패키지 디렉터리를 생성한다.
8. 테스트를 실행하고 결과, 체크리스트 반영 여부, 잔여 리스크를 문서화한다.

# 테스트 체크리스트

- [ ] `ApiResponse` 성공/실패 응답 테스트 통과
- [ ] `GlobalExceptionHandler`가 `BusinessException`, 검증 실패, 미처리 예외를 올바르게 매핑
- [ ] `/actuator/health`가 노출되고 `200 OK`를 반환
- [ ] 테스트 프로필에서 Spring 애플리케이션 컨텍스트 로드 성공
- [ ] 요청된 모든 도메인 패키지 골격 존재

# 관측성 체크리스트

- [ ] 요청 진입 또는 조회 호출에 대한 `log.info()` 추가 없음
- [ ] 예외 처리기가 비즈니스 예외는 WARN, 예상치 못한 실패는 ERROR로 기록
- [ ] health 엔드포인트 노출 설정이 명시적임
- [ ] 잘못된 DataSource/JPA 설정에 대해 기동 실패가 fail-fast로 유지됨

# 완료 기준

- 요청된 설정 파일과 로컬 compose 파일이 존재하고 서로 일관됨
- 공통 응답 및 예외 처리가 테스트로 검증됨
- 테스트에서 actuator health 엔드포인트 사용 가능
- 요청된 모든 모듈 패키지 골격 존재
- 결과 문서가 `docs/result`에 작성됨
- 남은 리스크와 후속 작업이 명시적으로 기록됨
