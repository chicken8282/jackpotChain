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

| Domain | Method | Path |
|---|---|---|
| Blockchain | GET | `/api/blockchain/dashboard` |
| Blockchain | GET | `/api/blockchain/blocks/{blockHash}` |
| Blockchain | GET | `/api/blockchain/transactions` |
| Auth | POST | `/api/auth/token` |
| Lotto | GET | `/api/lotto/status` |
| Lotto | POST | `/api/lotto/entries` |
| Lotto | GET | `/api/lotto/entries` |
| Lotto | GET | `/api/lotto/entries/{entryId}/claim` |
| Wallet | GET | `/api/wallet` |
| Wallet | GET | `/api/wallet/activities` |
| Exchange | POST | `/api/exchange` |
| Mining | GET | `/api/mining/blocks` |

---

## 3. Data & Integration Rules

**Per-endpoint decisions must be explicit:** source of truth, cacheability, fallback strategy, staleness tolerance.

**Node integration:**
- Controller -> Service -> Adapter/Client
- Never call node/RPC directly from Controller
- Read operations may use bounded retry and degraded fallback
- Write operations require idempotency and must never fake success on uncertain node results

**Cache (cache-aside):**

| Target | TTL |
|---|---|
| dashboard summary | 5~15s |
| recent blocks | 5~30s |
| wallet summary | 5~30s |
| mining summary | 5~15s |
| admin summary | 10~30s |

Rules:
- Define TTL and invalidation trigger explicitly
- Never treat cache as canonical truth

**Persistence layers:**
- PostgreSQL: service metadata, projections
- Redis: cache, short-lived state
- node `data_dir`: canonical blockchain truth

**MQ (RabbitMQ):**
- Async event delivery only
- Not a replacement for synchronous query paths

---

## 4. Package Structure

Base package: `ssatto.BE_ssatto`

```text
src/main/java/ssatto/BE_ssatto/
  Application.java
  global/
    config/          SwaggerConfig.java, SecurityConfig.java
    response/        ApiResponse.java, PageResponse.java
    exception/       ErrorCode.java, BusinessException.java, GlobalExceptionHandler.java
    util/            JwtUtil.java
  domain/
    auth/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/     EmailDuplicateException.java
    blockchain/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/
    wallet/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/
    exchange/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/
    lotto/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/
    mining/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/
    ops/
      controller/
      service/
      repository/
      entity/
      dto/
      exception/
```

**Module communication:**
- Intra-module: Controller -> Service -> Repository
- Cross-module sync: internal service interface only
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
- Comments must be in Korean unless the surrounding file convention clearly requires otherwise
- Code identifiers remain in English

### Swagger

All Controllers must use Swagger annotations.

```java
@Tag(name = "Wallet", description = "지갑 관련 API")
@Operation(summary = "...", description = "...")
@ApiResponses({ @ApiResponse(responseCode = "200", ...), @ApiResponse(responseCode = "404", ...) })
```

### Result Documentation

After each task, write `docs/result/{kebab-case-name}.md`.

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
- [ ] Node truth kept separate from service projections
- [ ] No cross-module Repository injection
- [ ] List endpoints are pagination-ready
- [ ] Write ops reviewed for idempotency
- [ ] Core Service methods have unit tests
- [ ] Controllers have MockMvc tests
- [ ] All classes and public methods have comments
- [ ] Swagger UI documents all new endpoints
- [ ] Business events logged at INFO only on completion
- [ ] RPC/infra failures logged at ERROR with context fields
- [ ] No variable data in log `message` field
- [ ] `docs/result/{task-name}.md` updated
- [ ] Exception handling follows `ErrorCode + GlobalExceptionHandler`
- [ ] Optional domain wrapper exceptions extend `BusinessException` only
