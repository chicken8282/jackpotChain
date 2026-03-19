# Implementation Summary

- `docs/specs/backend-spec.md`의 최신 기준에 맞춰 `Block` 엔티티와 Flyway SQL의 논리 테이블명을 `block`으로 정렬했다.
- `transaction`은 PostgreSQL 예약어이므로 JPA와 SQL에서 `"transaction"` 인용 식별자를 사용하도록 정렬했다.
- 스펙 정렬을 검증하는 테스트를 먼저 수정해 실패를 확인한 뒤 구현을 반영하고 전체 테스트를 다시 통과시켰다.
- 결과 문서는 backend spec 요구사항에 맞춰 `kebab-case` 파일명과 `File & Class Change Log` 섹션을 포함하도록 재작성했다.

# Checklist Results

- [x] Node truth kept separate from service projections
- [x] No cross-module Repository injection
- [x] Write ops reviewed for idempotency
  실제 write 서비스는 아직 없지만, 본 작업 범위에서 중복 방지 기준은 `UNIQUE` 제약과 향후 outbox 단일 트랜잭션 전제를 유지하도록 정리했다.
- [x] Exception handling follows `ErrorCode + GlobalExceptionHandler`
- [x] Optional domain wrapper exceptions extend `BusinessException` only
- [ ] 429 응답이 필요한 write API의 Redis 분산 락 적용 여부 확인
  이번 작업 범위에 write API 구현이 없어서 후속 과제로 남는다.
- [x] Core Service methods have unit tests
  신규 Service를 추가하지 않았으므로 영향 없음으로 처리했다.
- [x] Controllers have MockMvc tests
  신규 Controller를 추가하지 않았으므로 영향 없음으로 처리했다.
- [x] All classes and public methods have 한국어 comments
- [x] Business events logged at INFO only on completion
  신규 로그를 추가하지 않았다.
- [x] RPC/infra failures logged at ERROR with context fields
  신규 RPC/인프라 로깅 코드를 추가하지 않았다.
- [x] No variable data in log `message` field
- [x] 결과 문서 작성 완료

# Test Results

- TDD 1차: backend spec 기준으로 테스트를 먼저 수정한 뒤 `./gradlew.bat test`를 실행해 3건 실패를 확인했다.
- 실패 원인:
  - `MigrationScriptTest`: `blocks`, `transactions` 문자열 기대값 불일치
  - `PersistenceMappingTest`: `@Table` 이름이 최신 스펙과 불일치
- 구현 반영 후 최종 검증:
  - 실행 명령: `GRADLE_USER_HOME=.gradle-home .\gradlew.bat test`
  - 결과: 전체 테스트 15건 통과

# Remaining Risks

- `transaction`은 인용 식별자를 사용하므로 향후 네이티브 SQL이나 운영 쿼리 작성 시 반드시 동일한 quoting 규칙을 지켜야 한다.
- `wallet_address`, `tx_id`, `commit_hash`처럼 비식별자 컬럼을 참조하는 연관관계는 Hibernate 프록시 최적화 제약이 남아 있으므로, 실제 서비스 쿼리 단에서 N+1 검증이 추가로 필요하다.
- backend spec 본문과 `ops` 도메인 표기가 완전히 일치하지 않으므로, Outbox 패키지 위치는 추후 문서 정합화가 한 번 더 필요하다.

# Additional Improvements Needed

- 실제 PostgreSQL 로컬 환경에서 Flyway를 한 번 실행해 `"transaction"` 인용 테이블 기준으로 `ddl-auto=validate`가 통과하는지 확인한다.
- Service/Webhook 구현 단계에서 `block` 저장, `"transaction"` 저장, projection 반영, outbox 저장이 하나의 로컬 트랜잭션으로 묶이는지 서비스 테스트를 추가한다.
- backend spec 문서에도 `ops` 도메인과 결과 문서 규격 예시를 현재 코드 기준으로 정리해 문서-코드 간 drift를 줄인다.

# File & Class Change Log

### `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/entity/Block.java`

| 클래스 | 역할 | 추가 | 수정 |
|--------|------|------|------|
| `Block` | 블록 인덱싱 projection 엔티티 | - | `@Table(name = "block")`로 최신 스펙 논리 테이블명 반영 |

### `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/entity/Transaction.java`

| 클래스 | 역할 | 추가 | 수정 |
|--------|------|------|------|
| `Transaction` | 트랜잭션 인덱싱 projection 엔티티 | - | `@Table(name = "\"transaction\"")`로 예약어 안전성을 유지하면서 스펙 논리 테이블명 반영 |

### `BE-ssatto/src/test/java/ssatto/BE_ssatto/persistence/MigrationScriptTest.java`

| 클래스 | 역할 | 추가 | 수정 |
|--------|------|------|------|
| `MigrationScriptTest` | Flyway 스크립트 문자열과 핵심 테이블 정의를 검증 | - | `block`, `"transaction"` 기준으로 기대값 변경 |

### `BE-ssatto/src/test/java/ssatto/BE_ssatto/persistence/PersistenceMappingTest.java`

| 클래스 | 역할 | 추가 | 수정 |
|--------|------|------|------|
| `PersistenceMappingTest` | JPA 매핑과 저장소 동작을 검증 | `blockchainEntitiesUseBackendSpecTableNames()` 테스트 | `@Table` 이름 검증 추가 |

### `BE-ssatto/src/main/resources/db/migration/V1__init_schema.sql` _(설정 / 리소스 변경)_

| 항목 | 변경 내용 |
|------|-----------|
| `block` | 테이블명을 `blocks`에서 `block`으로 정렬 |
| `"transaction"` | 테이블명을 `transactions`에서 인용 식별자 `"transaction"`으로 정렬 |
| FK 제약 | `wallet_activity`, `lotto_entry` FK가 `"transaction"`을 참조하도록 수정 |
| 제약명 | `uk_`, `fk_` 명명도 단수 테이블 기준으로 정렬 |

### `BE-ssatto/src/main/resources/db/migration/V2__add_indexes.sql` _(설정 / 리소스 변경)_

| 항목 | 변경 내용 |
|------|-----------|
| `idx_blocks_*` | 인덱스 대상 테이블을 `block`으로 정렬 |
| `idx_transactions_*` | 인덱스 대상 테이블을 `"transaction"`으로 정렬 |

### `docs/plans/erd-jpa-entities-flyway-migration.md` _(설정 / 리소스 변경)_

| 항목 | 변경 내용 |
|------|-----------|
| 계획 문서 | 최신 backend spec 기준 가정, 실패 모드, 구현 단계, 완료 조건으로 전면 갱신 |

### `docs/result/erd-jpa-entities-flyway-migration.md` _(설정 / 리소스 변경)_

| 항목 | 변경 내용 |
|------|-----------|
| 결과 문서 | `kebab-case` 파일명, 체크리스트, 테스트 결과, File & Class Change Log 형식으로 재작성 |

### `docs/result/ERD 기반 JPA 엔티티 + Flyway 마이그레이션.md` _(설정 / 리소스 변경)_

| 항목 | 변경 내용 |
|------|-----------|
| 결과 문서 | backend spec 형식에 맞추기 위해 삭제 후 `erd-jpa-entities-flyway-migration.md`로 대체 |
