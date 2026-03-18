# ADR-02: Backend 데이터베이스 선택 — PostgreSQL

| 항목 | 내용 |
|------|------|
| 상태 | ✅ 채택 |
| 날짜 | 2026-03-19 |
| 결정자 | 백엔드 팀 |

---

## 결정 주제

JackpotChain Backend(Spring Boot 3.x / Java 21)의 **주 관계형 데이터베이스**를 무엇으로 선택할 것인가.

---

## 상황 / 문제

Backend는 다음과 같은 데이터 정합성 요구를 가진다.

- **지갑(Wallet) 잔액 변경**: 채굴 보상, 로또 구매, 잭팟 수령 등 여러 이벤트가 동시에 잔액을 수정한다.
- **상태 전이 무결성**: 블록 커밋 프로세스는 `issued → pending_commit → committed → ready_to_claim → claimed` 5단계 상태를 거친다. 중간 단계에서 중복 처리·순서 역전이 발생하면 잔액 오염이 일어난다.
- **Outbox 패턴**: 트랜잭션 내에서 비즈니스 데이터와 outbox 이벤트를 원자적으로 저장해야 한다. DB 수준의 트랜잭션 격리가 신뢰의 토대다.
- **부분 인덱스 / 조건부 인덱스 필요**: `status = 'pending'` 인 행만 인덱싱해 Dispatcher 폴링 성능을 최적화하고 싶다.
- **Advisory Lock 필요**: 분산 환경에서 동일 블록에 대한 이중 커밋을 DB 레벨에서 방지하기 위해 세션 단위 Advisory Lock이 필요하다.

SSAFY 프로젝트이므로 **포트폴리오 면접 가치**도 기술 선택의 기준이 된다.

---

## 선택지

### A. MySQL 8.x

SSAFY 프로젝트에서 가장 많이 쓰이는 RDBMS. InnoDB 스토리지 엔진으로 ACID 트랜잭션을 지원한다.

```
Spring Boot → MySQL 8.x (InnoDB)
  - Hibernate Dialect: MySQL8Dialect
  - 기본 격리 수준: REPEATABLE READ
  - 부분 인덱스: 미지원 (Functional Index로 우회 가능하나 제한적)
  - Advisory Lock: GET_LOCK() / RELEASE_LOCK() 지원 (문자열 기반, 정수 기반 pg_advisory_lock 대비 제한적)
```

### B. PostgreSQL 16 (채택)

오픈소스 RDBMS 중 기능이 가장 풍부한 선택지. MVCC 구현 수준, 격리 레벨 다양성, 부분 인덱스, Advisory Lock 등 엔터프라이즈급 기능을 제공한다.

```
Spring Boot → PostgreSQL 16
  - Hibernate Dialect: PostgreSQLDialect
  - 기본 격리 수준: READ COMMITTED
  - 높은 격리가 필요한 트랜잭션: REPEATABLE READ / SERIALIZABLE 선택 적용
  - 부분 인덱스: CREATE INDEX idx_outbox_pending ON outbox_events(created_at) WHERE status = 'pending';
  - Advisory Lock: pg_advisory_xact_lock(block_height) — 트랜잭션 종료 시 자동 해제
```

### C. MongoDB (NoSQL)

스키마 유연성과 수평 확장이 장점인 Document DB. 블록체인 원시 데이터(JSON 구조) 저장에 친화적이다.

```
Spring Boot → MongoDB
  - Spring Data MongoDB 사용
  - 트랜잭션: 4.0+ Multi-Document Transaction 지원하나 성능 오버헤드 큼
  - JOIN 없음 → 지갑-거래내역-로또 간 관계는 애플리케이션 레벨에서 처리
  - 복잡한 집계는 Aggregation Pipeline으로 처리
```

---

## 비교 기준

### 성능

| 선택지 | 평가 |
|--------|------|
| A. MySQL | REPEATABLE READ 기본값 → 갭 락(Gap Lock) 발생 가능. 동시 INSERT 시 불필요한 잠금 경합 |
| **B. PostgreSQL** | **MVCC로 읽기-쓰기 간 잠금 없음. 격리 수준별 성능 트레이드오프를 명시적으로 선택 가능** |
| C. MongoDB | 단순 Document 조회는 빠르나, 지갑-거래내역 조인 쿼리를 애플리케이션에서 처리하면 N+1 문제 발생 |

### 단순성

| 선택지 | 평가 |
|--------|------|
| A. MySQL | 팀 친숙도 최고. Hibernate + JPA 그대로 사용 가능 |
| **B. PostgreSQL** | **JPA/Hibernate 그대로 사용. 방언(Dialect)만 교체. 학습 비용 낮음** |
| C. MongoDB | Spring Data MongoDB 별도 학습 필요. 관계형 설계를 NoSQL 모델로 재설계해야 함 |

### 유지보수성

| 선택지 | 평가 |
|--------|------|
| A. MySQL | Flyway 마이그레이션 가능. 부분 인덱스 미지원으로 인덱스 전략이 제한적 |
| **B. PostgreSQL** | **Flyway 완전 지원. 부분 인덱스로 인덱스 수 최소화. EXPLAIN ANALYZE 출력이 직관적** |
| C. MongoDB | 스키마 마이그레이션 도구(Mongock 등) 별도 필요. 관계 데이터 정합성 유지가 개발자 책임 |

### 운영성

| 선택지 | 평가 |
|--------|------|
| A. MySQL | AWS RDS, Docker 이미지 모두 성숙. 운영 자료 풍부 |
| **B. PostgreSQL** | **Docker 공식 이미지 안정. Prometheus exporter(postgres_exporter) 공식 지원. 운영 자료 풍부** |
| C. MongoDB | 복제셋 구성 없으면 단일 장애 지점. 단일 노드 운영 시 트랜잭션 성능 저하 |

### 팀 숙련도

| 선택지 | 평가 |
|--------|------|
| A. MySQL | SSAFY 수업에서 주로 사용. 팀 친숙도 최고 |
| **B. PostgreSQL** | **JPA 인터페이스 동일. SQL 문법 95% 호환. Advisory Lock·부분 인덱스 학습 비용 낮음** |
| C. MongoDB | NoSQL 설계 경험 부족. 프로젝트 초반 설계 변경 비용 높음 |

---

## 최종 선택

**B. PostgreSQL 16**

---

## 선택 이유

1. **상태 전이 무결성 보장**: `issued → pending_commit → committed → ready_to_claim → claimed` 상태 전이는 중복 처리 시 잔액 오염으로 이어진다. PostgreSQL의 `SERIALIZABLE` 격리 수준과 트랜잭션 단위 Advisory Lock(`pg_advisory_xact_lock`)을 활용하면 동일 블록에 대한 이중 커밋을 DB 레벨에서 차단할 수 있다. MySQL의 `GET_LOCK()`은 문자열 기반으로 동작하고 연결이 끊기면 자동 해제가 보장되지 않아 동일 수준의 보장이 어렵다.

2. **부분 인덱스(Partial Index)로 Outbox 폴링 최적화**: Outbox Dispatcher는 `status = 'pending'` 인 이벤트만 주기적으로 폴링한다. 전체 인덱스 대신 부분 인덱스를 사용하면 인덱스 크기가 전체 레코드 수가 아닌 미처리 이벤트 수에 비례하므로 폴링 쿼리 성능이 일정하게 유지된다.

   ```sql
   CREATE INDEX idx_outbox_pending
     ON outbox_events(created_at ASC)
     WHERE status = 'pending';
   ```

3. **MVCC 설계로 읽기-쓰기 동시성 극대화**: PostgreSQL의 MVCC는 읽기 트랜잭션이 쓰기 트랜잭션을 블로킹하지 않는다. 잔액 조회(READ)와 잔액 갱신(WRITE)이 잠금 경합 없이 병렬 처리된다. MySQL InnoDB의 갭 락(Gap Lock)은 범위 조건 DELETE/INSERT 시 불필요한 잠금 경합을 유발할 수 있다.

4. **격리 수준 선택적 적용**: 대부분의 API는 기본값인 `READ COMMITTED`로 충분히 빠르게 동작한다. 잔액 차감처럼 정합성이 중요한 트랜잭션에만 `REPEATABLE READ` 또는 `SERIALIZABLE`을 명시적으로 적용해 성능과 정합성의 균형을 맞출 수 있다.

5. **포트폴리오 면접 가치**: PostgreSQL은 엔터프라이즈 환경(토스, 카카오페이 등)에서 사실상의 표준으로 사용된다. 부분 인덱스, Advisory Lock, MVCC 격리 수준을 직접 활용한 경험은 MySQL 사용 경험보다 기술 면접에서 차별화된 답변 소재가 된다.

---

## 감수한 단점 (트레이드오프)

### 1. 팀 초기 학습 비용

MySQL에 비해 PostgreSQL에 익숙하지 않은 팀원이 있다. 특히 Advisory Lock, EXPLAIN ANALYZE 해석, Vacuum 등 PostgreSQL 고유 개념에 대한 학습이 필요하다.

**보완책**: JPA 인터페이스는 동일하므로 일반 CRUD는 즉시 작성 가능하다. Advisory Lock과 부분 인덱스는 성능 최적화 단계에서 집중적으로 학습한다.

### 2. Docker 리소스 사용량

MySQL 대비 PostgreSQL의 기본 메모리 사용량이 약간 높다. 단일 EC2에서 여러 컨테이너를 운영할 때 메모리 계획이 필요하다.

**보완책**: `shared_buffers = 128MB`, `max_connections = 50` 등 Docker Compose 환경 변수로 메모리 사용량을 제어한다.

### 3. AUTO_INCREMENT 대신 SEQUENCE

MySQL의 `AUTO_INCREMENT`가 PostgreSQL에서는 `SERIAL` 또는 `GENERATED ALWAYS AS IDENTITY`로 대체된다. 기존 MySQL 경험자는 DDL 문법 차이에 주의해야 한다.

**보완책**: JPA `@GeneratedValue(strategy = GenerationType.IDENTITY)` 를 사용하면 방언 차이를 Hibernate가 자동 처리한다.

---

## 재검토 조건

아래 상황 중 하나라도 발생하면 DB 선택을 재검토한다.

| 조건 | 설명 |
|------|------|
| EC2 메모리 부족 | PostgreSQL 프로세스가 다른 컨테이너에 영향을 줄 정도로 메모리를 점유할 경우 |
| 팀 학습 비용 초과 | Advisory Lock·부분 인덱스 학습에 2일 이상 소요되어 일정이 밀릴 경우 |
| 블록체인 원시 데이터 저장 주도 | 블록 원시 JSON 저장 비중이 높아지고 스키마가 빈번히 변경된다면 MongoDB 혼용 검토 |

---

## 면접용 3줄 요약

1. **잔액 상태 전이(issued → claimed)의 중복 처리를 DB 레벨에서 차단하기 위해 PostgreSQL의 트랜잭션 Advisory Lock과 SERIALIZABLE 격리 수준을 채택했습니다.**

2. **Outbox 패턴의 미처리 이벤트 폴링 성능을 일정하게 유지하기 위해 `WHERE status = 'pending'` 부분 인덱스를 활용했으며, MVCC 덕분에 잔액 조회와 갱신 트랜잭션이 잠금 경합 없이 병렬 처리됩니다.**

3. **MySQL 대비 팀 학습 비용이 있으나 JPA 인터페이스가 동일해 전환 비용이 낮고, 부분 인덱스·Advisory Lock 직접 활용 경험이 면접에서 차별화된 포트폴리오 소재가 됩니다.**
