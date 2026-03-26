# DB 설계 — PostgreSQL, Flyway, JPA, HikariCP

> 작성일: 2026-03-26
> 대상: BE-ssatto (Spring Boot)

---

## 왜 이 설계인가 — 블록체인 프로젝트에서 관계형 DB가 필요한 이유

JackpotChain은 UTXO 기반 블록체인이다. 이론적으로는 모든 상태가 체인 위에 있다. 그렇다면 PostgreSQL은 왜 필요한가?

문제는 조회 방식에 있다. 블록체인 노드 RPC는 **단건 질의**를 위해 설계되어 있다. "지갑 A의 최근 활동 50건을 커서 기반으로 조회하라", "잭팟 풀 잔액 변화 히스토리를 보여라", "특정 블록 높이 기준으로 아직 claim하지 않은 로또 항목은 몇 개인가" — 이런 질의를 RPC만으로 처리하면 수십 번의 왕복이 필요하고, 인덱스도 없으며, 정렬·페이지네이션이 불가능하다.

해답은 **읽기 모델(Read Model)**이다. 블록체인 노드가 새 블록을 확정할 때마다 Webhook으로 BE를 호출하고, BE는 그 데이터를 PostgreSQL에 비정규화해서 저장한다. PostgreSQL은 on-chain 데이터를 복사한 읽기 전용 캐시 레이어이며, 지갑 잔액 같은 실시간 상태는 여전히 RPC로 직접 조회한다.

> **읽기 모델(Read Model):** CQRS 패턴에서 조회 전용으로 구성된 데이터 저장소. 쓰기 모델(여기서는 블록체인 UTXO)과 분리되어 조회에 최적화된 형태로 데이터를 보관한다.

> **CQRS (Command Query Responsibility Segregation):** 명령(쓰기)과 조회(읽기)의 책임을 완전히 분리하는 아키텍처 패턴. 쓰기 경로와 읽기 경로가 서로 다른 모델, 다른 저장소를 사용할 수 있다.

---

## 왜 PostgreSQL인가 — MySQL 대신 선택한 이유

PostgreSQL을 선택한 데는 세 가지 실질적인 이유가 있다.

**첫째, 완전한 ACID 보장이다.** PostgreSQL은 DDL(CREATE, ALTER, DROP)을 트랜잭션 안에서 실행할 수 있다. MySQL은 DDL을 자동 커밋한다. Flyway 마이그레이션이 실패했을 때 롤백이 가능한 환경이 필요했기 때문에 이 차이가 중요했다.

**둘째, 더 강력한 복합 인덱스 전략이다.** `idx_wallet_activity_wallet_created_at ON wallet_activity (wallet_address, created_at DESC)` 같이 커서 기반 페이지네이션을 위한 복합 인덱스가 V2 마이그레이션에 명시되어 있다. PostgreSQL의 인덱스 플래너는 이 패턴을 MySQL보다 더 일관성 있게 처리한다.

**셋째, 엄격한 타입 시스템이다.** MySQL은 날짜/시간 연산이 느슨하게 동작하는 경우가 있다. PostgreSQL은 `timestamp not null` 컬럼에 null을 묵시적으로 허용하지 않으며, check constraint도 실제로 강제 적용한다. `jackpot_pool`의 `CONSTRAINT ck_jackpot_pool_singleton CHECK (id = 1)` 같은 싱글톤 강제 패턴이 그 예다.

---

## 스키마 설계 — 테이블별 설계 의도

### wallet — UI 메타데이터 분리

```sql
create table wallet (
    id bigserial primary key,
    address varchar(64) not null,
    nickname varchar(50),
    wallet_color varchar(20) not null default 'DEFAULT',
    created_at timestamp not null default current_timestamp,
    constraint uk_wallet_address unique (address)
);
```

`address`가 PK가 아니라 별도 `id`(bigserial)를 PK로 둔 이유는 JPA 관계 매핑의 안정성 때문이다. 문자열 PK는 외래 키 조인 비용이 높다. `wallet_activity`와 `lotto_entry`는 `wallet_address`(문자열)로 외래 키를 맺고 있지만, JPA 엔티티 내부에서는 `@ManyToOne`으로 `Wallet` 객체를 참조한다.

**지갑 잔액은 이 테이블에 없다.** 잔액은 RPC `listunspent`로 on-chain 기준으로만 조회한다. PostgreSQL에 잔액을 캐싱하면 체인 상태와 동기화 지연 문제가 발생하므로 의도적으로 제외했다.

V5 마이그레이션에서 온보딩 보상 컬럼이 추가되었다:

```sql
alter table wallet
    add column onboarding_reward_granted boolean not null default false,
    add column onboarding_reward_tx_id varchar(64),
    add column onboarding_reward_granted_at timestamp;
```

기존 테이블을 재생성하지 않고 `ALTER TABLE`로 컬럼을 추가한다는 점이 Flyway의 핵심이다 — 운영 중인 서버를 재시작하지 않고 스키마를 확장할 수 있다.

### block / transaction — 인덱싱 레이어

```sql
create table block (
    id bigserial primary key,
    height bigint not null,
    hash varchar(64) not null,
    ...
    constraint uk_block_height unique (height),
    constraint uk_block_hash unique (hash)
);
```

`height`와 `hash` 모두 UNIQUE constraint가 걸려 있다. Webhook 중복 수신 시 upsert 또는 중복 삽입 방지를 위해서다. 블록체인 특성상 같은 높이의 블록이 재조직(reorg)될 수 있어 `is_main_chain` 컬럼으로 메인체인 여부를 관리한다.

`transaction` 테이블에서 버전 분류가 중요하다:

| version | 의미 |
|---------|------|
| 1 | 일반 JACK 전송 |
| 2 | JACK→POT 교환 |
| 3 | 로또 commit |
| 5 | 로또 claim |

이 버전 정보는 블록 인덱싱 시 파싱되어 `wallet_activity` 타입 분류에도 활용된다.

### lotto_entry — commit-reveal 상태 머신

```sql
create table lotto_entry (
    commit_hash varchar(64) not null,
    commit_block_height bigint not null,
    claimable_from_height bigint not null,
    claimable_until_height bigint not null,
    status varchar(10) not null default 'DRAWING',
    ...
    constraint fk_lotto_entry_commit_hash
        foreign key (commit_hash) references "transaction" (tx_id)
);
```

로또는 commit-reveal 방식이다. 블록 N에서 commit TX가 확정되면 `lotto_entry`가 생성된다. 블록 N+18이 되면 결과 번호가 확정되고 상태가 `DRAWING → WINNING/LOSING`으로 전환된다. N+68까지 claim하지 않으면 `EXPIRED`가 된다.

`claimable_from_height`와 `claimable_until_height`를 컬럼으로 저장하는 이유는 쿼리 최적화 때문이다. 현재 블록 높이를 알면 `status = 'DRAWING' AND claimable_from_height <= :currentHeight` 같은 조건으로 인덱스를 활용해 결과 업데이트 대상을 빠르게 찾을 수 있다.

### jackpot_pool — 싱글톤 캐시

```sql
create table jackpot_pool (
    id bigint primary key,
    balance_jack bigint not null default 0,
    ...
    constraint ck_jackpot_pool_singleton check (id = 1)
);
```

잭팟 풀은 항상 하나의 row만 존재한다. CHECK constraint로 이를 강제한다. 매 요청마다 RPC를 호출하는 대신 Webhook 수신 시 이 row를 갱신하고, 조회는 PostgreSQL에서 한다.

---

## Flyway — 스키마 버전 관리

> **Flyway:** 데이터베이스 스키마 변경을 버전 관리하는 마이그레이션 도구. SQL 파일에 버전 번호를 붙여 순서대로 실행하고 `flyway_schema_history` 테이블에 실행 이력을 기록한다.

### 왜 Flyway인가

개발 초기에 `spring.jpa.hibernate.ddl-auto=create` 또는 `update`로 JPA가 스키마를 자동 관리하는 방식은 편리하다. 하지만 운영 환경에서는 치명적이다:

- `update`는 컬럼 추가는 하지만 컬럼 삭제나 타입 변경은 하지 않는다
- 팀원마다 로컬 스키마 상태가 달라질 수 있다
- CI/CD 파이프라인에서 정확히 어떤 변경이 적용되었는지 추적할 수 없다

Flyway는 이 문제를 해결한다. `V1__init_schema.sql` → `V2__add_indexes.sql` → `V3__add_auth_refresh_session.sql` → `V4__add_learning_tables.sql` → `V5__add_wallet_onboarding_reward_columns.sql` 순으로 실행되며, 이미 실행된 파일은 체크섬으로 변경 감지 후 재실행하지 않는다.

실제 마이그레이션 파일 구조:

```
BE-ssatto/src/main/resources/db/migration/
├── V1__init_schema.sql          ← 전체 초기 스키마
├── V2__add_indexes.sql          ← 성능 인덱스 추가
├── V3__add_auth_refresh_session.sql   ← 세션 테이블 추가
├── V4__add_learning_tables.sql  ← 학습 기능 테이블
└── V5__add_wallet_onboarding_reward_columns.sql  ← ALTER TABLE
```

### Flyway vs Liquibase 트레이드오프

| 항목 | Flyway | Liquibase |
|------|--------|-----------|
| 마이그레이션 형식 | SQL 파일 (또는 Java) | XML/YAML/JSON/SQL |
| 학습 곡선 | 낮다 — SQL 그대로 작성 | XML 문법 학습 필요 |
| 롤백 | 지원 안 함 (Community) | 자동 롤백 지원 |
| DB 중립성 | 낮다 — SQL dialect 노출 | 높다 — 추상화 레이어 |
| 가독성 | 높다 — 실제 SQL이 그대로 보임 | 낮다 — XML wrapping |

JackpotChain은 PostgreSQL만 사용하므로 DB 중립성이 불필요하고, SQL 직접 제어가 더 중요해서 Flyway를 선택했다. 실행 실패 시 해당 버전 파일을 수정하면 안 되고, 새 버전 파일(V6 등)로 수정 마이그레이션을 추가해야 한다.

### Flyway 마이그레이션 실패 처리

마이그레이션이 중간에 실패하면 `flyway_schema_history`에 실패 기록이 남고 애플리케이션 기동이 중단된다. 처리 방법:

1. 실패한 SQL 원인 파악
2. 수동으로 DB 상태를 정리하거나 `flyway repair` 실행
3. 실패 기록을 제거하고 재기동

PostgreSQL의 DDL 트랜잭션 지원 덕분에 마이그레이션 전체를 하나의 트랜잭션으로 실행할 수 있어, 중간 실패 시 부분 적용 없이 롤백된다.

---

## JPA 엔티티 설계

> **JPA (Java Persistence API):** Java 객체와 관계형 DB 테이블을 매핑하는 표준 인터페이스. Hibernate가 구현체로 동작한다.

### Block 엔티티 — @NoArgsConstructor(PROTECTED) 패턴

```java
@Getter
@Entity
@Table(name = "block")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Block {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "height", nullable = false, unique = true)
    private Long height;

    @Column(name = "hash", nullable = false, unique = true, length = 64)
    private String hash;
    // ...

    public static Block create(Long height, String hash, ...) {
        return new Block(height, hash, ...);
    }
}
```

세 가지 설계 결정이 중요하다:

1. **`@NoArgsConstructor(access = PROTECTED)`**: JPA 스펙상 기본 생성자가 필요하지만, 외부에서 `new Block()`으로 빈 객체를 만드는 것을 막는다. 불변식이 깨진 객체 생성을 방지한다.

2. **`@Data` 금지**: `@Data`는 `equals()`/`hashCode()`를 모든 필드 기준으로 생성한다. JPA 연관 관계가 있을 경우 무한 순환 호출이 발생한다. `@Getter`만 사용한다.

3. **정적 팩토리 메서드 `create()`**: 생성 의도를 명시하고 필수 필드를 강제한다. `Block.create(height, hash, ...)` 호출부에서 어떤 값이 필요한지 컴파일 시점에 알 수 있다.

### LottoEntry — 연관 관계 매핑

```java
@OneToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "commit_hash", referencedColumnName = "tx_id", nullable = false, unique = true)
private Transaction commitTransaction;

@ManyToOne(fetch = FetchType.LAZY, optional = false)
@JoinColumn(name = "wallet_address", referencedColumnName = "address", nullable = false)
private Wallet wallet;
```

`fetch = FetchType.LAZY`가 기본값이어야 한다. EAGER로 하면 `LottoEntry`를 하나 조회할 때 `Transaction`과 `Wallet`이 자동으로 조인 조회된다. 목록 조회에서 N+1 문제로 직결된다.

> **N+1 문제:** 목록 쿼리 1번 실행 후 각 항목에 대해 연관 객체를 조회하는 쿼리가 N번 추가 실행되는 성능 문제. 100개 항목을 조회하면 총 101번의 쿼리가 실행된다.

N+1 해결 방법은 두 가지다:

- **JPQL `JOIN FETCH`**: 한 번의 쿼리로 연관 객체를 함께 조회
- **Projection**: 엔티티 대신 DTO 인터페이스로 조회해 필요한 컬럼만 가져옴

Repository에서 조회 전용 엔드포인트에는 projection을 우선 적용한다.

---

## HikariCP — 커넥션 풀

> **커넥션 풀(Connection Pool):** DB 연결을 미리 만들어 놓고 재사용하는 구조. TCP 연결 수립(handshake, authentication)에는 수십~수백 ms가 소요되므로, 매 요청마다 새로 연결하면 처리량이 급감한다.

> **HikariCP:** Spring Boot의 기본 커넥션 풀 라이브러리. "Light-speed Connection Pool"을 표방하며 자바 커넥션 풀 중 가장 낮은 오버헤드를 가진다.

### 왜 풀이 필요한가

PostgreSQL 연결 하나는 서버 프로세스 하나를 점유한다. 연결 생성 비용:

1. TCP 3-way handshake
2. PostgreSQL 인증 프로토콜
3. SSL 핸드셰이크 (운영 환경)

이 과정이 수십 ms다. 초당 1000 req를 처리한다면 커넥션 생성만으로 수십 GB의 메모리와 시간이 낭비된다. HikariCP는 이 연결을 풀에 유지해 재사용한다.

### 풀 크기 공식

HikariCP 공식 권장 공식:

```
pool_size = Tn × (Cm - 1) + 1
```

- `Tn`: 최대 동시 스레드 수 (= VU 수)
- `Cm`: 단일 트랜잭션이 동시에 점유하는 최대 커넥션 수 (일반적으로 1)

예: VU=100, 단일 커넥션 사용이면 `pool_size = 100 × (1-1) + 1 = 1`이 이론값이지만, 실제로는 DB 쿼리 응답 시간 동안 커넥션을 점유하므로 응답 시간 비율로 조정한다.

실질적인 공식:
```
pool_size ≈ (평균 쿼리 시간 / 평균 요청 처리 시간) × 동시 요청 수
```

부하 테스트 시 `hikaricp_pending_connections` 메트릭이 급증한다면 풀이 부족한 신호다. 이때는 풀 크기 확대보다 먼저 슬로우 쿼리를 제거해야 한다 — 풀을 키워도 슬로우 쿼리가 남아 있으면 결국 다시 포화된다.

### 주요 설정값

| 설정 | 의미 | 기본값 |
|------|------|--------|
| `maximumPoolSize` | 최대 커넥션 수 | 10 |
| `minimumIdle` | 유휴 유지 커넥션 수 | maximumPoolSize와 동일 |
| `connectionTimeout` | 풀에서 커넥션 대기 제한 | 30,000ms |
| `idleTimeout` | 유휴 커넥션 유지 시간 | 600,000ms |
| `maxLifetime` | 커넥션 최대 수명 | 1,800,000ms |

`minimumIdle`을 `maximumPoolSize`와 동일하게 설정하면 "고정 크기 풀"이 된다 — 항상 일정 수의 연결을 유지해 연결 생성 지연을 없앤다.

---

## 블록 인덱싱의 배치 삽입

새 블록 Webhook 수신 시 한 블록에 수십~수백 개의 트랜잭션이 포함될 수 있다. 각 트랜잭션을 개별 `INSERT`로 처리하면 수백 번의 네트워크 왕복이 발생한다.

배치 삽입 최적화:

```java
// application.properties
spring.jpa.properties.hibernate.jdbc.batch_size=50
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true
```

`batch_size=50`으로 설정하면 50개의 INSERT가 하나의 PreparedStatement 배치로 묶여 DB로 전송된다. `order_inserts=true`는 동일 테이블의 INSERT를 모아서 배치로 보내기 위해 정렬한다.

단, JPA에서 배치 삽입이 동작하려면 `GenerationType.IDENTITY`가 아닌 `SEQUENCE` 전략을 사용해야 한다 — IDENTITY는 INSERT 직후 DB에서 생성된 ID를 가져와야 하므로 배치가 깨진다. 이 트레이드오프가 있어 실제로는 `saveAll()`과 `flush()`를 명시적으로 관리하는 방식으로도 배치를 구현한다.

---

## 읽기 모델과 CQRS — 왜 이 구조인가

### 쓰기 모델과 읽기 모델의 분리

```
[JackpotChain Node] ──── 새 블록 확정
        │
        ▼ POST /internal/new-block (Webhook)
[BlockchainReadModelSyncService]
        ├── block 테이블 INSERT
        ├── transaction 테이블 INSERT
        ├── wallet_activity 테이블 INSERT
        ├── lotto_entry 상태 UPDATE
        └── jackpot_pool 잔액 UPDATE
```

블록체인 UTXO가 "쓰기 모델(Write Model)"이다. PostgreSQL은 그 상태를 조회에 최적화해서 복사한 "읽기 모델(Read Model)"이다.

이 분리의 장점:

- 복잡한 페이지네이션, 정렬, 필터링을 SQL로 처리할 수 있다
- RPC 호출 없이 빠른 응답이 가능하다
- DB 인덱스를 자유롭게 설계할 수 있다

단점은 **동기화 지연**이다. Webhook이 지연되면 읽기 모델이 일시적으로 구식 상태가 된다. 이를 보완하기 위해 `BlockchainSyncScheduler`가 주기적으로 블록 높이를 확인하고 누락된 블록을 재처리한다.

### 읽기 모델이 동기화 불일치 상태가 되면

Webhook 누락 또는 처리 실패로 읽기 모델과 체인 상태가 어긋날 수 있다. 이 시나리오에서의 대응:

1. `@Scheduled` 스케줄러가 현재 체인 높이와 DB의 최대 `block.height`를 비교
2. 누락된 높이 범위를 발견하면 RPC로 해당 블록을 재조회
3. `BlockchainReadModelSyncService`를 통해 재처리

잔액 같은 정밀한 실시간 상태는 여전히 RPC로 조회하므로, 읽기 모델 불일치는 활동 내역·랭킹 같은 히스토리 데이터에만 영향을 미친다.

---

## 면접 Q&A

**Q1. 블록체인에 모든 데이터가 있는데 왜 PostgreSQL 읽기 모델이 필요한가?**

블록체인 노드 RPC는 단건 조회를 위한 인터페이스다. "지갑 A의 최근 활동 20건을 시간순 역순으로 페이지네이션해서 반환하라" 같은 질의를 RPC만으로 처리하려면, 모든 블록을 순회하며 해당 지갑의 TX를 필터링해야 한다 — O(블록 수) 시간 복잡도다. PostgreSQL `wallet_activity` 테이블에 `(wallet_address, created_at DESC)` 복합 인덱스가 있으면 동일 질의가 O(log N + 결과 수)로 처리된다. 조회 응답 시간 차이는 수십 배다.

**Q2. CQRS 트레이드오프는 무엇인가?**

CQRS는 조회 성능과 쓰기 단순성을 맞바꾸는 패턴이다. 이점은 읽기 모델을 조회에 최적화할 수 있다는 점이고, 비용은 읽기 모델과 쓰기 모델의 일관성이 eventually consistent(결과적 일관성)가 된다는 점이다. JackpotChain의 경우 Webhook 지연 또는 누락 시 읽기 모델이 구식 상태가 된다. 잔액 같은 정밀 상태는 RPC로 직접 조회해 이 위험을 최소화했고, 히스토리 데이터는 스케줄러 재처리로 결국 일치시킨다.

**Q3. Flyway 마이그레이션이 운영 중에 실패하면 어떻게 되는가?**

Flyway는 기동 시 마이그레이션을 실행한다. PostgreSQL은 DDL 트랜잭션을 지원하므로 V5 마이그레이션이 중간에 실패하면 해당 마이그레이션 전체가 롤백된다. `flyway_schema_history` 테이블에 FAILED 상태로 기록이 남고 애플리케이션 기동이 중단된다. 이후 원인 수정 후 `flyway repair`로 실패 기록을 제거하거나, 수동으로 DB 상태를 수정하고 재기동한다. 절대 기존 V번호 파일을 수정하면 안 된다 — 이미 다른 서버에 적용된 체크섬과 불일치가 발생한다.

**Q4. N+1 문제가 실제로 발생할 수 있는 상황과 해결책은?**

`lotto_entry` 목록 조회 시 `LottoEntry.commitTransaction` (연관 `Transaction`) 접근이 N+1을 유발할 수 있다. `FetchType.LAZY`이므로 실제 접근 시점에 쿼리가 발생한다. 목록 100건이면 100번의 추가 쿼리가 실행된다.

해결책은 두 가지다. JPQL `JOIN FETCH`로 한 번에 조회하거나:
```java
@Query("SELECT le FROM LottoEntry le JOIN FETCH le.commitTransaction WHERE le.wallet.address = :address")
List<LottoEntry> findByWalletAddressWithTx(@Param("address") String address);
```
또는 조회 전용 Projection DTO를 사용해 연관 객체 자체를 로드하지 않는 방법이 있다.

**Q5. HikariCP pending connections가 급증한다는 것은 무슨 의미인가?**

`hikaricp_pending_connections` 메트릭은 커넥션 풀에서 사용 가능한 커넥션을 기다리고 있는 스레드 수다. 이 값이 급증한다는 것은 두 가지 중 하나다: (1) 동시 요청 수가 풀 크기를 초과했거나, (2) 일부 커넥션이 오래 점유되고 있다(슬로우 쿼리). `connectionTimeout` (기본 30초) 이내에 커넥션을 얻지 못하면 예외가 발생한다. 해결 순서는 먼저 슬로우 쿼리를 제거하고, 그 다음에 필요하다면 `maximumPoolSize`를 조정한다. 풀만 키우면 DB 서버에 과부하가 걸릴 수 있다.

**Q6. `@Transactional`이 읽기 모델 동기화에서 왜 중요한가?**

Webhook으로 새 블록을 수신할 때 `BlockchainReadModelSyncService`는 `block`, `transaction`, `wallet_activity`, `lotto_entry`, `jackpot_pool`을 한 번에 갱신한다. `@Transactional`이 없으면 `block`은 저장됐지만 `wallet_activity`는 저장 실패한 부분 성공 상태가 가능하다. 읽기 모델이 불일치 상태로 남는다. `@Transactional`을 서비스 메서드에 선언하면 이 모든 작업이 하나의 트랜잭션으로 묶여 전부 성공하거나 전부 롤백된다.

**Q7. Flyway vs Liquibase를 다시 선택한다면?**

PostgreSQL 단일 환경, 팀 규모 소규모, SQL 직접 제어가 필요한 상황에서는 Flyway가 맞다. SQL 파일을 그대로 작성하므로 DBA가 검토하기 쉽고, 실제 실행될 SQL이 코드에 그대로 드러난다. 만약 다중 DB를 지원해야 하거나, 자동 롤백이 필요하거나, 마이그레이션을 Java 코드로 표현해야 한다면 Liquibase가 더 적합하다. 현재 프로젝트에서 Flyway의 가장 큰 한계는 롤백 미지원이다 — 잘못된 마이그레이션은 항상 새 버전으로 수정해야 한다.
