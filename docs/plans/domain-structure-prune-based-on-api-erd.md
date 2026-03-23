# Goal

`docs/reviews/api.md`와 `docs/reviews/erd.md`만을 기준으로 `BE-ssatto`의 도메인 폴더/파일 구조를 재정렬한다. API에 존재하지 않거나 ERD에 대응하지 않는 불필요한 폴더와 파일을 제거해 구조 drift를 줄인다.

# Scope

- `domain` 하위 폴더 구조를 `api.md`와 `erd.md` 기준으로 정리
- `ops` 도메인 및 `OutboxEvent` 관련 파일 제거
- `auth`, `exchange`, `mining`에서 ERD 비대응 `entity`/`repository` 골격 제거
- 관련 테스트, 마이그레이션, 결과 문서 정리

범위 제외:

- 신규 Controller, Service, RPC Client, MQ 구현
- 비즈니스 로직 추가
- Swagger/API 계약 변경

# Reference Specs

- `AGENTS.md`
- `docs/reviews/api.md`
- `docs/reviews/erd.md`
- `docs/specs/backend-spec.md`

# Impacted Layers

- Controller: 직접 수정 없음. 폴더 구조 기준만 정리
- Service: 직접 수정 없음. 일부 빈 폴더만 정리
- Repository: 직접 수정 대상. ERD 비대응 `OutboxEventRepository` 제거
- RPC Client: 직접 수정 없음
- MQ: 직접 수정 대상. `ops` 도메인과 outbox 영속 모델 제거
- DB/Flyway: 직접 수정 대상. `outbox_events` 스키마와 인덱스 제거

# Failure Points

- 테스트가 기존 `ops`/`outbox` 구조를 계속 기대하는 문제
- 마이그레이션에서 제거된 테이블 문자열을 여전히 검증하는 문제
- 실제 삭제 후 빈 디렉터리나 `.gitkeep`가 남아 구조가 완전히 정리되지 않는 문제
- `auth` 도메인 전체를 지워 버려 API 기반 구조까지 훼손하는 문제

# Implementation Steps

1. `api.md`와 `erd.md` 기준으로 유지 도메인/제거 대상 폴더를 명시한다.
2. 테스트를 먼저 수정해 불필요 구조가 없어야 통과하도록 바꾼다.
3. `./gradlew test`를 실행해 실패를 확인한다.
4. 불필요한 파일과 폴더, 마이그레이션 정의를 제거한다.
5. 전체 테스트를 다시 실행해 통과를 확인한다.
6. 결과 문서에 제거 내역과 남은 위험을 기록한다.

# Test Checklist

- [ ] `PackageStructureTest`가 제거 대상 도메인/폴더 부재를 검증한다
- [ ] `MigrationScriptTest`가 `outbox_events` 제거를 반영한다
- [ ] `PersistenceMappingTest`가 outbox 의존 없이 통과한다
- [ ] 전체 `./gradlew test` 통과

# Observability Checklist

- [ ] 신규 `INFO` 로그를 추가하지 않는다
- [ ] 신규 `ERROR` 로그를 추가하지 않는다
- [ ] request entry / query `log.info()`를 추가하지 않는다

# Done Criteria

- `ops` 도메인과 `OutboxEvent` 관련 코드가 제거된다
- `auth`, `exchange`, `mining`의 ERD 비대응 `entity`/`repository` 골격이 제거된다
- 테스트가 새 구조 기준으로 통과한다
- 결과 문서가 추가된다

# Assumptions

- `api.md`에 존재하는 `auth` API는 유지 대상이므로 `domain/auth` 자체는 제거하지 않는다
- `auth`, `exchange`, `mining`은 API 기반 도메인이지만 ERD 테이블이 없으므로 `entity`/`repository` 폴더는 불필요하다
- `ops`와 `OutboxEvent`는 현재 `api.md`, `erd.md` 기준에 없으므로 제거 대상으로 본다
