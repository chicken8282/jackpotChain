## 날짜

| 날짜 | 작업 |
| --- | --- |
| 2026-03-19 | BE 기반 환경 세팅 |

## 구현 항목

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| Spring 프로필 분리 | 완료 | `application.yml`, `application-local.yml`, `application-prod.yml`을 추가하고 공통/로컬/운영 설정을 분리했다. |
| 로컬 PostgreSQL Compose | 완료 | PostgreSQL 16 컨테이너, 볼륨, health check가 포함된 `BE-ssatto/docker-compose.local.yml`을 추가했다. |
| HikariCP DataSource 기본선 | 완료 | 로컬 및 운영 프로필에 HikariCP 풀 설정을 명시했다. |
| JPA 기본 설정 | 완료 | 로컬/운영에 `ddl-auto=validate`, PostgreSQL dialect, 프로필별 SQL 로깅을 적용했다. |
| 공통 응답 래퍼 | 완료 | `ApiResponse<T>`를 `code/message/data` 계약으로 정리했고, 에러 시 `data: null`을 유지했다. |
| 공통 예외 처리 | 완료 | `@RestControllerAdvice`, `ErrorCode`, `BusinessException` 기반 전역 예외 처리를 구성했다. |
| Lombok 및 Validation 검증 | 완료 | 컴파일과 standalone validation 테스트로 확인했다. |
| Health 엔드포인트 | 완료 | actuator 의존성을 추가하고 `/actuator/health`를 노출했으며, 이번 부트스트랩 단계에서는 Redis/Rabbit health contributor를 비활성화했다. |
| 모듈 패키지 골격 | 완료 | `blockchain`, `wallet`, `exchange`, `lotto`, `mining`, `ops` 하위에 `controller/service/repository/entity/dto` 구조를 추가했다. |
| 패키지 정규화 | 완료 | 시작/컴파일 불일치를 해결하기 위해 코드 기준 패키지를 `ssatto.BE_ssatto`로 통일했다. |

## 테스트 결과

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `./gradlew.bat test --no-daemon` | 통과 | 샌드박스에서 기본 Gradle 캐시 경로를 사용할 수 없어 workspace-local `GRADLE_USER_HOME`으로 실행했다. |
| `ApiResponseTest` | 통과 | 성공/실패 응답 래퍼 포맷을 검증했다. |
| `GlobalExceptionHandlerTest` | 통과 | 비즈니스 예외, 검증 실패, 미처리 예외 응답을 검증했다. |
| `HealthEndpointIntegrationTest` | 통과 | `GET /actuator/health`가 `200 OK`와 `UP` 상태를 반환하는지 검증했다. |
| `PackageStructureTest` | 통과 | 요청한 모듈러 모놀리식 디렉터리 구조 존재 여부를 검증했다. |
| `ApplicationContextTest` | 통과 | `test` 프로필에서 Spring Boot 컨텍스트 로드 성공을 검증했다. |

## Swagger 확인

| 확인 항목 | 결과 | 비고 |
| --- | --- | --- |
| Swagger 설정 로드 | 통과 | 기존 Swagger 설정이 정규화된 패키지 아래에서 정상 컴파일 및 기동된다. |
| 신규 엔드포인트 문서화 필요 여부 | 해당 없음 | 이번 작업에서는 actuator 외에 도메인 REST 컨트롤러를 추가하지 않았다. |

## 요청 대비 체크리스트

| 요청 사항 | 결과 | 비고 |
| --- | --- | --- |
| 영향 레이어 식별 | 완료 | `Controller`와 전역 인프라만 영향이 있었고, `Service`, `Repository`, `RPC Client`, `MQ`는 기능 변경이 없었다. |
| 가정 및 모호점 명시 | 완료 | `docs/plans/be-environment-setup.md`에 기록했고 구현에도 반영했다. |
| 계획/데이터 흐름/트랜잭션 경계/실패 모드 설명 | 완료 | 구현 전 계획 문서에 정리했다. |
| TDD 사이클 적용 | 완료 | 테스트를 먼저 추가하고 실패 조건을 확인한 뒤 구현 후 재실행하여 통과시켰다. |
| 로깅 규칙 준수 | 완료 | 요청 진입/조회 경로에 `log.info()`를 추가하지 않았고, 예외 로깅은 WARN/ERROR 정책을 유지했다. |
| backend-spec 체크리스트 검증 | 일부 완료 | 현재 부트스트랩 범위에 해당하는 항목만 검증했고, 엔드포인트/RPC/비즈니스 이벤트 항목은 아직 구현 대상이 아니다. |
| 결과 문서 작성 | 완료 | 본 문서 작성 완료. |

## Backend Spec 체크리스트 검토

| 체크리스트 항목 | 상태 | 비고 |
| --- | --- | --- |
| Node truth와 서비스 projection 분리 | 해당 없음 | 블록체인 projection 또는 persistence 로직을 추가하지 않았다. |
| Cross-module Repository 주입 없음 | 통과 | Repository나 cross-module 의존성을 도입하지 않았다. |
| 목록 엔드포인트 pagination-ready | 해당 없음 | 이번 작업에서는 목록 엔드포인트를 구현하지 않았다. |
| Write 연산 idempotency 검토 | 해당 없음 | 비즈니스 write API를 구현하지 않았다. |
| 핵심 Service 메서드 단위 테스트 | 해당 없음 | Service 메서드를 새로 도입하지 않았다. |
| Controller MockMvc 테스트 | 통과 | 공통 예외 처리는 standalone MockMvc로, actuator는 integration MockMvc로 검증했다. |
| 모든 클래스와 public 메서드 주석 | 통과 | 이번에 수정한 프로덕션 클래스와 public 메서드에 주석을 추가했다. |
| Swagger UI 신규 엔드포인트 문서화 | 해당 없음 | Swagger 문서화가 필요한 도메인 엔드포인트를 추가하지 않았다. |
| 비즈니스 이벤트 INFO 로그 | 해당 없음 | 비즈니스 이벤트 흐름을 추가하지 않았다. |
| RPC/인프라 실패 ERROR 로그 + context field | 해당 없음 | RPC 클라이언트나 인프라 어댑터를 구현하지 않았다. |
| log `message` 필드에 가변 데이터 없음 | 통과 | 로깅은 정적 메시지 템플릿과 placeholder만 사용한다. |
| 결과 문서 업데이트 | 통과 | 본 문서를 작성했다. |

## 남은 리스크

| 리스크 | 영향도 | 후속 조치 |
| --- | --- | --- |
| 로컬 검증 시 JDK 17 정렬이 필요했다 | 중간 | 팀 표준이 Java 21이라면 로컬에 JDK 21을 설치하거나 환경 구성 이후 toolchain을 다시 맞춰야 한다. |
| 로컬 health에서 Redis/Rabbit contributor를 제외했다 | 중간 | Redis와 RabbitMQ를 로컬 부트스트랩 범위에 포함할 때 health indicator를 다시 활성화해야 한다. |
| `ddl-auto=validate` 기동을 위한 Flyway 마이그레이션이 아직 없다 | 중간 | 새 PostgreSQL 데이터베이스에 로컬 프로필을 적용하기 전에 초기 마이그레이션을 추가해야 한다. |

## 추가 개선 필요 사항

| 개선 사항 | 이유 |
| --- | --- |
| 초기 Flyway 마이그레이션 추가 | 로컬 및 운영 환경에서 `ddl-auto=validate`로 기동하려면 필요하다. |
| 도메인 컨트롤러 및 Swagger 어노테이션 추가 | `docs/reviews/api.md`의 API 계약을 충족하려면 필요하다. |
| Java 버전 ADR 또는 toolchain 결정 문서 추가 | 현재 로컬 검증이 JDK 17 가용성에 의존하고 있어 기준을 명확히 해야 한다. |
