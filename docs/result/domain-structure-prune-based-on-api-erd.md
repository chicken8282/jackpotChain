# Implementation Summary

`docs/reviews/api.md`와 `docs/reviews/erd.md`를 기준으로 `BE-ssatto`의 생성 산출물을 다시 정리했다.

- `auth`, `exchange`, `mining`은 API 계약에는 존재하지만 ERD 테이블이 없으므로 `entity`/`repository` 하위 패키지만 제거했다.
- `ops` 도메인과 `OutboxEvent` 관련 엔티티/리포지토리, Flyway 스키마, 인덱스를 제거했다.
- 패키지 구조 테스트와 마이그레이션 테스트를 명세 기준으로 먼저 수정한 뒤 구현을 정리했다.

제거/수정 대상 요약:

- 제거: `src/main/java/ssatto/BE_ssatto/domain/ops/**`
- 제거: `src/main/java/ssatto/BE_ssatto/domain/auth/entity`, `repository`
- 제거: `src/main/java/ssatto/BE_ssatto/domain/exchange/entity`, `repository`
- 제거: `src/main/java/ssatto/BE_ssatto/domain/mining/entity`, `repository`
- 수정: `src/main/resources/db/migration/V1__init_schema.sql`
- 수정: `src/main/resources/db/migration/V2__add_indexes.sql`
- 수정: `src/test/java/ssatto/BE_ssatto/domain/PackageStructureTest.java`
- 수정: `src/test/java/ssatto/BE_ssatto/persistence/MigrationScriptTest.java`
- 수정: `src/test/java/ssatto/BE_ssatto/persistence/PersistenceMappingTest.java`

# Checklist Results

- 명세 기준 정합성: 충족
  - `api.md`에 있는 도메인만 유지했다.
  - `erd.md`에 없는 영속 계층 산출물은 제거했다.
- 신뢰성: 충족
  - 테스트를 먼저 수정해 실패를 확인한 뒤 구현을 반영했다.
  - 마이그레이션과 코드 구조가 동일한 기준을 바라보도록 맞췄다.
- 가용성: 부분 충족
  - 이번 변경은 런타임 외부 연동을 추가하지 않았고 장애 전파 경로를 넓히지 않았다.
  - 단, 기존에 outbox 기반 비동기 흐름을 전제로 한 향후 요구가 있다면 별도 설계 재도입이 필요하다.
- 성능: 충족
  - 사용되지 않는 영속 계층과 인덱스를 제거해 불필요한 스키마 관리 비용을 줄였다.
- 확장성: 충족
  - API 계약과 ERD 계약을 분리해, 도메인 패키지는 유지하되 영속 계층만 선택적으로 추가하는 구조로 정리했다.
- 로깅 규칙: 충족
  - 새로운 `log.info()`/`log.error()` 호출은 추가하지 않았다.
  - request entry / query 호출에 대한 `log.info()`도 추가하지 않았다.

# Test Results

TDD 순서로 진행했다.

1. 테스트 수정
2. 실패 확인
3. 코드/마이그레이션/패키지 제거
4. 재실행 후 통과 확인

실행 명령:

```powershell
$env:GRADLE_USER_HOME='.gradle-home'; .\gradlew.bat test
```

결과:

- 총 13개 테스트 통과
- 실패 0
- 에러 0
- 스킵 0

검증 범위:

- 패키지 구조가 `api.md`/`erd.md`와 일치하는지 확인
- Flyway 초기 스키마와 인덱스 정의가 현재 ERD 범위와 일치하는지 확인
- 영속성 매핑 테스트가 outbox 제거 이후에도 핵심 엔티티 기준으로 정상 동작하는지 확인

# Remaining Risks

- `api.md`에 `auth`, `exchange`, `mining`이 존재하므로 도메인 패키지는 유지했지만, 현재는 영속 계층이 비어 있다. 이후 요구가 들어오면 ERD와 함께 다시 생성해야 한다.
- `OutboxEvent` 제거는 현재 `api.md`/`erd.md` 기준으로는 맞지만, 비동기 이벤트 전달 정책이 별도 운영 문서나 향후 ADR에 존재한다면 재검토가 필요하다.
- 테스트는 구조/마이그레이션 정합성 중심이다. 실제 서비스 계층에서 `ops` 패키지 의존이 새로 추가되면 컴파일 수준에서는 바로 드러나지만, 운영 설계 관점의 공백은 별도 검토가 필요하다.

# Additional Improvements Needed

- 이벤트 발행이 실제 요구사항으로 복귀하면, `api.md`/`erd.md` 외에 ADR 또는 운영 명세에 outbox 사용 근거를 먼저 명시한 뒤 재도입하는 편이 안전하다.
- 도메인 생성 자동화가 있다면, API 기반 패키지 생성과 ERD 기반 영속 계층 생성을 분리하는 규칙을 템플릿에 반영하는 것이 재발 방지에 유리하다.
