# Goal

`docs/reviews/erd.md`와 수정된 `docs/specs/backend-spec.md`를 기준으로 `BE-ssatto`의 JPA 엔티티, `JpaRepository`, Flyway 마이그레이션, 테스트, 결과 문서를 현재 스펙에 맞게 정렬한다.

# Scope

- `Wallet`, `Block`, `Transaction`, `WalletActivity`, `LottoEntry`, `JackpotPool`, `LottoRanking`, `OutboxEvent` 엔티티 및 저장소 정렬
- `V1__init_schema.sql`, `V2__add_indexes.sql` 스펙 정렬
- `@DataJpaTest` 기반 테스트 정렬
- 결과 문서 형식 정렬

범위 제외:

- Controller, Service, RPC Client, MQ Dispatcher 신규 구현
- Redis 분산 락, Rate limit, Webhook 서비스 로직 구현
- Swagger, DTO, API 핸들러 추가

# Reference Specs

- `AGENTS.md`
- `docs/specs/backend-spec.md`
- `docs/reviews/erd.md`
- `docs/reviews/architecture.md`
- `docs/reviews/plan.md`

# Impacted Layers

- Controller: 직접 수정 없음. 기존 API 계층이 참조할 영속 모델 계약만 정렬
- Service: 직접 수정 없음. 트랜잭션 경계와 향후 저장 순서만 문서로 명시
- Repository: 직접 수정 대상. 엔티티별 저장소와 테이블/조회 계약 정렬
- RPC Client: 직접 수정 없음. RPC/Webhook 결과 저장 구조만 정렬
- MQ: 직접 구현 없음. `OutboxEvent` 스키마와 outbox 저장 계약만 정렬
- DB/Flyway: 직접 수정 대상. 스키마와 인덱스 정의 정렬

# Failure Points

- backend spec와 코드의 테이블명 불일치로 인한 `ddl-auto=validate` 실패
- PostgreSQL 예약어 `transaction` 충돌로 인한 DDL 실패
- 테스트가 구 스키마(`blocks`, `transactions`)를 계속 참조하는 문제
- 결과 문서가 backend spec의 `kebab-case`/`File & Class Change Log` 형식을 만족하지 못하는 문제
- 비식별자 FK 기반 연관관계의 런타임 LAZY 동작을 과대 가정하는 문제

# Implementation Steps

1. backend spec 기준으로 직접 영향 계층과 가정을 재정리한다.
2. 테스트를 먼저 수정해 `block`, `transaction` 논리 테이블명과 마이그레이션 문자열을 검증하도록 바꾼다.
3. `./gradlew test`를 실행해 실패를 확인한다.
4. 엔티티 `@Table`, Flyway SQL, 테스트 보조 검증을 스펙에 맞게 수정한다.
5. 전체 테스트를 다시 실행해 통과를 확인한다.
6. backend spec 체크리스트와 결과 문서를 갱신한다.

# Test Checklist

- [ ] backend spec 기준 테스트 수정 후 실패 확인
- [ ] 엔티티 논리 테이블명 검증 테스트 통과
- [ ] 마이그레이션 문자열 검증 테스트 통과
- [ ] 전체 `./gradlew test` 통과

# Observability Checklist

- [ ] 신규 `INFO` 로그를 추가하지 않는다
- [ ] 신규 `ERROR` 로그를 추가하지 않는다
- [ ] request entry / query 실행 `log.info()`를 추가하지 않는다
- [ ] Outbox 저장 구조는 유지하되 MQ 발행 로직은 이번 범위에서 다루지 않는다

# Done Criteria

- `Block`과 `Transaction`의 논리 테이블명이 backend spec과 일치한다
- PostgreSQL 예약어 충돌은 인용 식별자로 안전하게 처리된다
- Flyway와 테스트가 같은 테이블명을 기준으로 통과한다
- 결과 문서가 backend spec 형식을 만족한다
- 전체 테스트가 통과한다

# Assumptions

- 사용자가 언급한 `docs/reviews/backend-spec.md`는 실제 존재하지 않으므로 `docs/specs/backend-spec.md`를 최신 기준 문서로 간주한다
- backend spec의 논리 테이블명 `transaction`은 PostgreSQL 예약어라서 실제 DDL/JPA에서는 `"transaction"` 인용 식별자를 사용한다
- backend spec 표에 `ops` 도메인이 누락됐지만 사용자 요구사항의 `OutboxEvent`는 `ops` 패키지에 유지한다
- 이번 작업은 스펙 정렬 작업이므로 서비스 구현 없이 영속 계층과 문서만 수정한다
