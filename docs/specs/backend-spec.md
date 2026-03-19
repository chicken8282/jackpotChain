# Backend Spec - JackpotChain

> Source of truth: `docs/reviews/api.md` (API), `docs/reviews/erd.md` (DB schema), `AGENTS.md` (agent rules), `docs/adrs/adr-04.md` (exception handling)

---

## 1. Hard Rules (Boundaries)

**Backend owns:** API shaping, service orchestration, projection/aggregation, cache, node/RPC adapter.  
**Backend does NOT own:** blockchain canonical truth, private keys, chain validity re-implementation.

**Forbidden:**
- Never store private keys
- Never treat PostgreSQL or Redis as blockchain truth
- Never expose node-internal details to the frontend
- Never inject another module's Repository across domain boundaries
- Never re-implement chain validity without explicit documentation

---

## 2. API Families

> Full contract is defined in `docs/reviews/api.md`.
> Base URL: `/api/v1` (공통 prefix — SecurityConfig에서 `/api/**` 패턴으로 관리)

| Domain | Method | Path | Bearer 인증 | api.md 참조 |
|--------|--------|------|:-----------:|:-----------:|
| Auth | POST | `/auth/token` | 불필요 | Auth |
| Blockchain | GET | `/blockchain/dashboard` | 불필요 | 1-1 |
| Blockchain | GET | `/blockchain/blocks/{height}` | 불필요 | 1-2 |
| Wallet | POST | `/wallet` | 불필요 | 2-1 |
| Wallet | GET | `/wallet` | 불필요 | 2-2 |
| Wallet | GET | `/wallet/{address}/activities` | **필요** | 2-3 |
| Exchange | POST | `/exchange/jack-to-pot` | **필요** | 3-1 |
| Exchange | GET | `/exchange/info` | 불필요 | 3-2 |
| Lotto | GET | `/lotto` | 불필요 | 4-1 |
| Lotto | POST | `/lotto/commit` | **필요** | 4-2 |
| Lotto | GET | `/lotto/entries/{commitHash}/result` | **필요** | 4-3 |
| Lotto | POST | `/lotto/claim` | **필요** | 4-4 |
| Lotto | GET | `/lotto/entries` | **필요** | 4-5 |
| Mining | GET | `/mining/blocks` | **필요** | 5-1 |
| Internal | POST | `/internal/new-block` | 불필요 (내부망) | Webhook |

> **Internal Webhook**: JackpotChain 노드가 새 블록 수신 시 호출하는 내부 전용 엔드포인트.
> Nginx 외부 노출 금지. `blockchain` 도메인의 `BlockWebhookHandler`에서 처리.

---

## 3. Data & Integration Rules

**Per-endpoint decisions must be explicit:** source of truth, cacheability, fallback strategy, staleness tolerance.

**Node integration (JSON-RPC):**
- Controller → Service → RpcClient (Adapter)
- Never call node/RPC directly from Controller
- Read operations may use bounded retry and degraded fallback
- Write operations require idempotency and must never fake success on uncertain node results
- RPC 호출 대상: `getblockchaininfo`, `getblockcount`, `getpeerinfo`, `getmempoolinfo`,
  `listunspent`, `getbalance`, `sendrawtransaction`

**Webhook integration (Node → Backend):**
- JackpotChain 노드가 새 블록 수신 시 `POST /internal/new-block` 을 호출
- `BlockWebhookHandler`가 수신하여 블록·TX를 파싱 후 DB 인덱싱
- 인덱싱 대상 테이블: `block`, `transaction`, `wallet_activity`, `lotto_entry`, `jackpot_pool`, `lotto_ranking`
- 동일 블록 중복 수신 방지: `jackpot_pool.last_synced_height` 비교 후 높이 ≤ 기존 값이면 무시
- 블록 순서 역전 감지: 높이 불연속 시 누락 블록 보완 처리 후 재인덱싱
- Webhook 처리 실패 시 Outbox 패턴으로 재시도 (RabbitMQ 연동)

**Cursor-based pagination:**
- 커서 페이지네이션을 사용하는 API: `GET /wallet/{address}/activities` (2-3), `GET /mining/blocks` (5-1)
- 커서 키: `lastActivityId` (wallet_activity.id), `lastBlockId` (block.id)
- 응답에 `hasNext`, `nextCursor` 포함 필수
- 커서 없는 첫 요청은 최신순으로 `size` 개수만큼 반환

**Cache (cache-aside):**

| Target | TTL | 무효화 트리거 |
|--------|-----|-------------|
| dashboard summary | 5~15s | Webhook 새 블록 수신 |
| recent blocks | 5~30s | Webhook 새 블록 수신 |
| wallet summary | 5~30s | Webhook 새 블록 수신 |
| mining summary | 5~15s | Webhook 새 블록 수신 |
| jackpot pool | 1min | Webhook lotto_entry 파싱 시 |

Rules:
- Define TTL and invalidation trigger explicitly
- Never treat cache as canonical truth

**Persistence layers:**
- PostgreSQL: `wallet`, `block`, `transaction`, `wallet_activity`, `lotto_entry`, `jackpot_pool`, `lotto_ranking`
- Redis: cache, short-lived state, 분산 락 (`lock:commit:{address}`, `lock:claim:{commitHash}`)
- node `data_dir`: canonical blockchain truth (DB는 인덱싱 레이어, 잔액은 RPC 기준)

**MQ (RabbitMQ):**
- Async event delivery only
- Not a replacement for synchronous query paths
- Outbox 패턴: Webhook 처리 실패 이벤트 재처리, 운영 알림 발송

---

## 4. Package Structure

Base package: `ssatto.BE_ssatto`

```text
src/main/java/ssatto/BE_ssatto/
  Application.java
  global/
    config/          SwaggerConfig.java, SecurityConfig.java, JwtAuthFilter.java
    response/        ApiResponse.java
    exception/       ErrorCode.java, BusinessException.java, GlobalExceptionHandler.java
    util/            JwtUtil.java
  domain/
    auth/
      controller/    AuthController.java
      service/       AuthService.java
      dto/           TokenRequestDto.java, TokenResponseDto.java
      exception/
    blockchain/
      controller/    BlockchainController.java
      service/       BlockchainService.java, BlockIndexingService.java
      repository/    BlockRepository.java, TransactionRepository.java
      entity/        Block.java, Transaction.java
      dto/
      exception/
      webhook/       BlockWebhookHandler.java        ← POST /internal/new-block 수신·처리
    wallet/
      controller/    WalletController.java
      service/       WalletService.java, WalletActivityService.java
      repository/    WalletRepository.java, WalletActivityRepository.java
      entity/        Wallet.java, WalletActivity.java
      dto/
      exception/
    exchange/
      controller/    ExchangeController.java
      service/       ExchangeService.java
      dto/
      exception/
    lotto/
      controller/    LottoController.java
      service/       LottoService.java, LottoEntryService.java, JackpotPoolService.java
      repository/    LottoEntryRepository.java, JackpotPoolRepository.java,
                     LottoRankingRepository.java
      entity/        LottoEntry.java, JackpotPool.java, LottoRanking.java
      dto/
      exception/
    mining/
      controller/    MiningController.java
      service/       MiningService.java
      dto/
      exception/
```

**Domain ↔ Entity 매핑 (erd.md 기준):**

| Domain | Entity | DB 테이블 |
|--------|--------|----------|
| `blockchain` | `Block` | `block` |
| `blockchain` | `Transaction` | `transaction` |
| `wallet` | `Wallet` | `wallet` |
| `wallet` | `WalletActivity` | `wallet_activity` |
| `lotto` | `LottoEntry` | `lotto_entry` |
| `lotto` | `JackpotPool` | `jackpot_pool` (단일 레코드 집계) |
| `lotto` | `LottoRanking` | `lotto_ranking` (Top 3 고정) |
| `mining` | (Entity 없음) | `block` — `BlockRepository` 를 `MiningService`에서 조회 |
| `exchange` | (Entity 없음) | RPC 기반, DB 저장 없음 |
| `auth` | (Entity 없음) | `WalletRepository` 조회 후 JWT 발급 |

> **cross-module Repository 접근 허용 예외**: `mining.MiningService`는 `blockchain.BlockRepository`를
> 직접 주입하지 않고, `blockchain.BlockchainService`의 내부 서비스 인터페이스를 통해 조회한다.
> `auth.AuthService`도 동일하게 `wallet.WalletService` 인터페이스를 사용한다.

**Module communication:**
- Intra-module: Controller → Service → Repository
- Cross-module sync: internal service interface only (Repository 직접 주입 금지)
- Cross-module async: RabbitMQ or outbox event
- Never use direct cross-module Repository injection
- Never expose another module's Entity directly

**Exception package rules:**
- Main exception contract lives in `global/exception`
- Optional thin domain-specific wrapper exceptions may live in `domain/{module}/exception`
- Domain wrapper exceptions must extend `BusinessException`
- Domain wrapper exceptions must not bypass `ErrorCode`

---

## 5. Error Handling

### 5-1. Response Format

All API responses use `ApiResponse<T>`.

```json
{ "code": "SUCCESS", "message": "...", "data": { } }
{ "code": "AUTH_EMAIL_DUPLICATE", "message": "이미 사용 중인 이메일입니다.", "data": null }
{ "code": "SUCCESS", "message": "...", "data": { "content": [], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0, "hasNext": false } }
```

### 5-2. ErrorCode Naming

Naming rule: `{DOMAIN}_{PROBLEM}`

Examples:
- `COMMON_INVALID_REQUEST`
- `AUTH_TOKEN_INVALID`
- `AUTH_EMAIL_DUPLICATE`
- `WALLET_NOT_FOUND`
- `LOTTO_NOT_CLAIMABLE`
- `EXCHANGE_BELOW_MINIMUM`

### 5-3. ErrorCode Ownership

`ErrorCode` is the single source of truth for:
- HTTP status
- stable client-facing error code
- default Korean error message

### 5-4. BusinessException Rules

- Service layer throws `BusinessException(ErrorCode)` by default
- Controller must not catch business exceptions
- `GlobalExceptionHandler` converts `BusinessException` to `ApiResponse`
- Infra exceptions (`IOException`, `TimeoutException`, external client exceptions`) must be wrapped into `BusinessException`
- Optional thin wrapper exceptions are allowed only for readability and must extend `BusinessException`

Example:

```java
throw new BusinessException(ErrorCode.WALLET_NOT_FOUND);
```

Optional wrapper:

```java
public class EmailDuplicateException extends BusinessException {
    public EmailDuplicateException() {
        super(ErrorCode.AUTH_EMAIL_DUPLICATE);
    }
}
```

### 5-5. HTTP Mapping

| Prefix | Scope | HTTP |
|---|---|---|
| `COMMON_` | invalid request / server error | 400 / 404 / 500 / 503 |
| `AUTH_` | authentication / authorization | 401 / 403 / 409 |
| `WALLET_` | wallet errors | 404 / 409 |
| `LOTTO_` | lottery errors | 400 / 404 / 409 |
| `EXCHANGE_` | exchange errors | 400 / 409 |
| `MINING_` | mining errors | 404 |
| `BLOCKCHAIN_` | node / RPC errors | 404 / 503 |
| `RATE_LIMIT_` | too many requests | **429** |

> **429 처리**: api.md 공통 응답 코드에 429(과도한 API 호출)가 명시되어 있다.
> Redis 분산 락(`SET NX EX`) 충돌 시 `RATE_LIMIT_TOO_MANY_REQUESTS` 에러코드로 429를 반환한다.
> 적용 대상: `POST /lotto/commit`, `POST /lotto/claim`, `POST /exchange/jack-to-pot`

### 5-6. Validation Handling

- `MethodArgumentNotValidException` -> `COMMON_INVALID_REQUEST`
- `ConstraintViolationException` -> `COMMON_INVALID_REQUEST`
- Validation failure message should be client-readable Korean text

---

## 6. Development Standards

### TDD Cycle

```text
Write test -> ./gradlew test -> confirm failure -> implement -> re-run -> confirm pass
```

| Layer | Test approach | Required |
|---|---|---|
| Controller | `MockMvcBuilders.standaloneSetup()` + `setControllerAdvice()` | yes |
| Service | `@ExtendWith(MockitoExtension.class)` | yes for core logic |
| Repository | `@DataJpaTest` + H2 | complex queries only |
| Integration | `@SpringBootTest` | critical scenarios only |

### Comments

- All classes and public methods require comments
- **주석은 반드시 한국어로 작성한다.** (클래스 Javadoc, 메서드 설명, 인라인 주석 모두 포함)
- 코드 식별자(클래스명, 메서드명, 변수명)는 영어를 유지한다.
- 예외: 외부 라이브러리·프레임워크 어노테이션 속성값 (`description`, `summary` 등 Swagger 값 포함)은 한국어로 작성한다.

```java
/**
 * 지갑 도메인 서비스.
 * 지갑 등록, 목록 조회, 잔액 조회(RPC)를 담당한다.
 */
@Service
public class WalletService {

    /**
     * 지갑을 등록하고 WALLET_CREATED 활동 내역을 저장한다.
     *
     * @param request 지갑 등록 요청 DTO
     * @return 등록된 지갑 응답 DTO
     * @throws BusinessException address가 이미 등록된 경우 WALLET_DUPLICATE
     */
    public WalletResponseDto register(WalletRequestDto request) { ... }
}
```

### Swagger

All Controllers must use Swagger annotations.

```java
@Tag(name = "Wallet", description = "지갑 관련 API")
@Operation(summary = "...", description = "...")
@ApiResponses({ @ApiResponse(responseCode = "200", ...), @ApiResponse(responseCode = "404", ...) })
```

### Result Documentation

After each task, write `docs/result/{kebab-case-name}.md`.

**결과 문서(`.md`) 본문은 전체 한국어로 작성한다.** 표 항목, 설명, 비고 모두 포함.
코드 블록 내 식별자(클래스명, 메서드명)는 영어를 유지한다.

The result document **must** include a **File & Class Change Log** section that lists every file touched in that task.
For each file, list every class (or top-level interface / enum) with three fields:

| 필드 | 설명 |
|------|------|
| **역할** | 이 클래스가 시스템에서 담당하는 책임 한 줄 요약 |
| **추가** | 이번 작업에서 새로 추가한 것 (클래스 자체 신규 생성 포함, 메서드·필드·어노테이션 단위로 명시) |
| **수정** | 이번 작업에서 변경한 것 (기존 메서드 시그니처 변경, 로직 수정, 의존성 추가 등) |

항목이 없으면 `-`로 표기한다. 클래스 변경이 없는 파일(예: `application.yml`, SQL 마이그레이션 파일)은
**설정 / 리소스 변경** 별도 표로 정리한다.

**File & Class Change Log 템플릿:**

```markdown
## File & Class Change Log

### src/main/java/ssatto/BE_ssatto/global/exception/ErrorCode.java

| 클래스 | 역할 | 추가 | 수정 |
|--------|------|------|------|
| `ErrorCode` (enum) | HTTP 상태 코드와 클라이언트 에러 코드·메시지를 단일 진실 공급원으로 관리 | `COMMON_INVALID_REQUEST`, `AUTH_EMAIL_DUPLICATE` 등 초기 에러 코드 정의 | - |

---

### src/main/java/ssatto/BE_ssatto/global/exception/BusinessException.java

| 클래스 | 역할 | 추가 | 수정 |
|--------|------|------|------|
| `BusinessException` | 서비스 계층에서 발생하는 모든 비즈니스 예외의 기반 클래스 | `ErrorCode`를 받는 생성자, `getErrorCode()` 메서드 | - |

---

### src/main/java/ssatto/BE_ssatto/global/exception/GlobalExceptionHandler.java

| 클래스 | 역할 | 추가 | 수정 |
|--------|------|------|------|
| `GlobalExceptionHandler` | `@RestControllerAdvice`로 전역 예외를 `ApiResponse`로 변환하는 단일 진입점 | `handleBusinessException()`, `handleValidationException()`, `handleException()` 핸들러 메서드 | - |

---

### src/main/java/ssatto/BE_ssatto/global/response/ApiResponse.java

| 클래스 | 역할 | 추가 | 수정 |
|--------|------|------|------|
| `ApiResponse<T>` | 모든 API 응답을 `code / message / data` 구조로 통일하는 제네릭 래퍼 | `success()`, `error()` 정적 팩토리 메서드 | - |

---

### src/main/resources/application-local.yml  _(설정 파일)_

| 항목 | 변경 내용 |
|------|-----------|
| `spring.datasource` | HikariCP 풀 크기·타임아웃 초기값 설정 |
| `spring.jpa.show-sql` | `true` (로컬 SQL 로깅) |
| `spring.data.redis.host` | `localhost:6379` |
```

**규칙:**
- 클래스를 **신규 생성**한 경우 추가 열에 `(신규 생성)` 접두사를 붙인다.
- 클래스를 **삭제**한 경우 해당 파일 섹션 상단에 `> ⚠️ 삭제됨` 표시 후 삭제 이유를 한 줄로 기재한다.
- 동일 파일에 클래스가 여럿 있으면 클래스마다 행을 분리한다.
- 테스트 파일도 동일한 방식으로 별도 섹션(`test/`)으로 기재한다.

---

## 7. Logging

### Log Level Policy

| Level | When to use |
|---|---|
| `ERROR` | unhandled exceptions, RPC failures, critical corruption |
| `INFO` | business event completion only |
| `WARN` | business exceptions, degraded fallback, retry exhaustion |
| `DEBUG` | local debugging only |

Rules:
- No `log.info()` on request entry
- No `log.info()` on query execution
- No variable business data in `message` field itself
- Use SLF4J placeholders and structured fields

### Exception Logging Rules

```java
log.warn("BUSINESS_EXCEPTION errorCode={} message={}", errorCode.name(), exception.getMessage());
log.error("UNHANDLED_EXCEPTION errorCode={} message={}", errorCode.name(), exception.getMessage(), exception);
```

Required fields for error logs:
- `errorCode`
- `httpStatus`
- `path`
- `method`
- `traceId` when available

---

## 8. DB / JPA Rules

**Flyway:** `src/main/resources/db/migration/V{n}__{description}.sql`
- Never modify applied migration files

**Entity pattern:**

```java
@Entity
@Table(name = "wallet")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Wallet {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    public static Wallet create(String address) { ... }
}
```

**Test DB:** H2 (`application-test.yaml`, `ddl-auto=create-drop`, Flyway disabled)  
**Prod DB:** PostgreSQL

---

## 9. Build & Config

Key dependencies:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-web'
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
implementation 'org.springframework.boot:spring-boot-starter-validation'
implementation 'org.springframework.boot:spring-boot-starter-security'
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.7.0'
runtimeOnly 'org.postgresql:postgresql'
compileOnly 'org.projectlombok:lombok'
annotationProcessor 'org.projectlombok:lombok'
testImplementation 'org.springframework.boot:spring-boot-starter-test'
testImplementation 'com.h2database:h2'
```

Config files:

```text
application.yml
application-local.yml
application-prod.yml
application-test.yaml
```

---

## 10. NFR & Checklist

Performance targets:
- dashboard P95 <= 500ms
- list/detail P95 <= 700ms
- mutations P95 <= 1000ms (excluding chain confirmation)

Before marking any task done:

**설계 원칙**
- [ ] Node truth kept separate from service projections (잔액은 RPC, 인덱싱은 DB)
- [ ] No cross-module Repository injection (cross-module은 Service 인터페이스로만)
- [ ] Write ops reviewed for idempotency (Redis 락 + DB unique constraint)
- [ ] Exception handling follows `ErrorCode + GlobalExceptionHandler`
- [ ] Optional domain wrapper exceptions extend `BusinessException` only
- [ ] 429 응답이 필요한 write API에 Redis 분산 락 적용 여부 확인

**페이지네이션**
- [ ] 커서 페이지네이션 API (`activities`, `mining/blocks`)는 `hasNext` + `nextCursor` 포함
- [ ] 커서 없는 첫 요청은 최신순으로 `size` 개수 반환 확인

**Webhook**
- [ ] Webhook 수신 핸들러 (`BlockWebhookHandler`)에 중복 블록 방지 로직 포함
- [ ] Webhook 처리 실패 시 Outbox 이벤트로 재시도 경로 확인

**테스트**
- [ ] Core Service methods have unit tests
- [ ] Controllers have MockMvc tests

**코드 품질**
- [ ] All classes and public methods have **한국어** comments (Javadoc 포함)
- [ ] Swagger UI documents all new endpoints (description 한국어)
- [ ] Business events logged at INFO only on completion
- [ ] RPC/infra failures logged at ERROR with context fields
- [ ] No variable data in log `message` field

**결과 문서**
- [ ] `docs/result/{task-name}.md` 작성 완료 (**전체 한국어**)
- [ ] Result doc contains **File & Class Change Log** — 수정된 모든 파일 나열
- [ ] 각 파일마다 클래스 단위로 **역할 / 추가 / 수정** 3개 열 모두 기재
- [ ] 신규 생성 클래스는 추가 열에 `(신규 생성)` 접두사 표기
- [ ] 설정 파일(yml, sql)은 별도 설정/리소스 변경 표로 정리
- [ ] 테스트 파일도 `test/` 섹션으로 동일하게 기재
