# Backend Spec — JackpotChain

> Source of truth: `docs/reviews/api.md` (API), `docs/reviews/erd.md` (DB schema), `AGENTS.md` (agent rules)

---

## 1. Hard Rules (Boundaries)

**Backend owns:** API shaping, service orchestration, projection/aggregation, cache, node/RPC adapter.
**Backend does NOT own:** blockchain canonical truth, private keys, chain validity re-implementation.

**Forbidden:**
- Never store private keys
- Never treat PostgreSQL or Redis as blockchain truth
- Never expose node-internal details to the frontend
- Never inject another module's Repository across domain boundaries (reference by ID only)
- Never re-implement chain validity without explicit documentation

---

## 2. API Families

> Full contract in `docs/reviews/api.md`. Paths below are the exact endpoints to implement.

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

**Per-endpoint decisions (must be explicit):** source of truth · cacheability · fallback strategy · staleness tolerance.

**Node integration:**
- Controller → Service → Adapter/Client (never controller-to-node directly)
- Read ops: bounded retry + degraded fallback allowed
- Write ops (lottery entry, claim): idempotency required · no duplicate execution · never fake success on uncertain node result

**Cache (cache-aside):**

| Target | TTL |
|---|---|
| dashboard summary | 5–15s |
| recent blocks | 5–10s |
| wallet summary | 5–10s |
| mining summary | 5–15s |
| admin summary | 10–30s |

Rules: define TTL + invalidation trigger explicitly · never treat cache as canonical truth.

**Persistence layers:**
- PostgreSQL — service metadata, projections
- Redis — cache, short-lived state
- node `data_dir` — canonical blockchain (do not duplicate into service DB)

**MQ (RabbitMQ) — async only:**
Events: `block.confirmed` · `reward.settled` · `lotto.entry.processed` · `claim.available` · `claim.completed` · `mining.reward.reflected` · `node.anomaly`.
Not a replacement for synchronous query paths.

---

## 4. Package Structure

Base package: `ssatto.BE_ssatto`

```
src/main/java/ssatto/BE_ssatto/
  ├── Application.java
  ├── global/
  │   ├── config/         SwaggerConfig.java · SecurityConfig.java
  │   ├── response/       ApiResponse.java · PageResponse.java
  │   ├── exception/      ErrorCode.java · BusinessException.java · GlobalExceptionHandler.java
  │   └── util/           JwtUtil.java
  └── domain/
      ├── blockchain/     controller/ · service/ · repository/ · domain/
      ├── wallet/         controller/ · service/ · repository/ · domain/
      ├── exchange/       controller/ · service/ · repository/ · domain/
      ├── lotto/          controller/ · service/ · repository/ · domain/
      ├── mining/         controller/ · service/ · repository/ · domain/
      └── ops/            controller/ · service/ · domain/
```

**Module communication:**
```
✅ intra-module: Controller → Service → Repository
✅ cross-module: internal service interface (same transaction) or RabbitMQ (async)
❌ cross-module: direct Repository injection · direct Entity reference
```

---

## 5. Error Handling

**Response format (`ApiResponse<T>`):**
```json
{ "code": "SUCCESS",           "message": "...", "data": { }   }   // success
{ "code": "WALLET_NOT_FOUND",  "message": "...", "data": null  }   // error
{ "code": "SUCCESS", "message": "...", "data": { "content": [...], "page": 0, "size": 20, "totalElements": 100, "totalPages": 5, "hasNext": true } }  // paginated
```

**ErrorCode naming:** `{DOMAIN}_{PROBLEM}` (e.g. `WALLET_NOT_FOUND`, `LOTTO_INSUFFICIENT_FEE`)

| Prefix | Scope | HTTP |
|---|---|---|
| `COMMON_` | invalid request / server error | 400 / 500 |
| `AUTH_` | JWT missing / expired / invalid | 401 |
| `WALLET_` | wallet errors | 404 / 409 |
| `LOTTO_` | lottery errors | 400 / 404 / 409 |
| `EXCHANGE_` | exchange errors | 400 / 409 |
| `MINING_` | mining errors | 404 |
| `BLOCKCHAIN_` | node / RPC errors | 404 / 503 |

**BusinessException rules:**
- Service layer throws `BusinessException(ErrorCode)` — never catch in Controller
- `GlobalExceptionHandler` handles all: `BusinessException` → WARN log (no stack trace), unhandled `Exception` → ERROR log (with stack trace)
- Wrap infra exceptions (`IOException`, `TimeoutException`) into `BusinessException` before propagating

---

## 6. Development Standards

### TDD cycle (core logic — mandatory)
```
Write test → ./gradlew test → confirm failure → implement → re-run → confirm pass
```

| Layer | Test approach | Required |
|---|---|---|
| Controller | `MockMvcBuilders.standaloneSetup()` + `setControllerAdvice()` | ✅ |
| Service | `@ExtendWith(MockitoExtension.class)` | ✅ |
| Repository | `@DataJpaTest` + H2 | complex queries only |
| Integration | `@SpringBootTest` | critical scenarios only |

Test file mirrors main path:
```
main: ssatto/BE_ssatto/domain/wallet/service/WalletService.java
test: ssatto/BE_ssatto/domain/wallet/service/WalletServiceTest.java
```

### Comments (required on all classes and public methods)
```java
/**
 * Wallet domain service.
 * Handles wallet creation, balance queries, and state transitions
 * (issued → pending_commit → committed → ready_to_claim → claimed).
 * Never injects another module's Repository.
 */

/**
 * @param walletAddress wallet address including 0x prefix
 * @throws BusinessException WALLET_NOT_FOUND if address does not exist
 */

// Reject if wallet is not in 'issued' status (state transition policy)
```

### Swagger (on all Controllers)
```java
@Tag(name = "Wallet", description = "Wallet-related APIs")
@Operation(summary = "...", description = "...")
@ApiResponses({ @ApiResponse(responseCode = "200", ...), @ApiResponse(responseCode = "404", ...) })
public ResponseEntity<ApiResponse<WalletBalanceResponse>> getBalance(...) { ... }
```
UI: `http://localhost:8080/swagger-ui/index.html` · JSON: `http://localhost:8080/v3/api-docs`

### Result documentation
After each task, write `docs/result/구현작업.md`:
```markdown
## Date / Implemented Items (table) / Test Results (table) / Swagger check / Checklist vs request
```

---

## 7. DB / JPA Rules

**Flyway:** `src/main/resources/db/migration/V{n}__{description}.sql` — never modify applied files.

**Entity pattern:**
```java
@Entity @Table(name = "wallet") @Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Wallet {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    public static Wallet create(String address) { ... }  // static factory only
}
```

**Test DB:** H2 (`application-test.yaml`, `ddl-auto=create-drop`, Flyway disabled) · Prod: PostgreSQL.

---

## 8. Build & Config

**build.gradle key dependencies:**
```groovy
implementation 'org.springframework.boot:spring-boot-starter-web'
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
implementation 'org.springframework.boot:spring-boot-starter-validation'
implementation 'org.springframework.boot:spring-boot-starter-security'
implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.7.0'
implementation 'io.jsonwebtoken:jjwt-api:0.12.6'
runtimeOnly  'io.jsonwebtoken:jjwt-impl:0.12.6'
runtimeOnly  'io.jsonwebtoken:jjwt-jackson:0.12.6'
runtimeOnly  'org.postgresql:postgresql'
implementation 'org.flywaydb:flyway-core'
implementation 'org.flywaydb:flyway-database-postgresql'
implementation 'org.springframework.boot:spring-boot-starter-data-redis'
implementation 'org.springframework.boot:spring-boot-starter-amqp'
compileOnly   'org.projectlombok:lombok'
annotationProcessor 'org.projectlombok:lombok'
testImplementation 'org.springframework.boot:spring-boot-starter-test'
testImplementation 'com.h2database:h2'
testImplementation 'org.springframework.security:spring-security-test'
```

**Config files:**
```
application.yaml          # common (profile, JPA, Jackson, Swagger)
application-local.yaml    # PostgreSQL localhost, debug SQL
application-prod.yaml     # all secrets via env vars
application-test.yaml     # H2, Flyway off, ddl-auto=create-drop
```

---

## 9. NFR & Checklist

**Performance targets:** dashboard P95 ≤ 500ms · list/detail P95 ≤ 700ms · mutations P95 ≤ 1000ms (excl. chain confirmation).

**Before marking any task done:**
- [ ] Node truth kept separate from service projections
- [ ] No cross-module Repository injection
- [ ] List endpoints are pagination-ready
- [ ] Write ops reviewed for idempotency
- [ ] Core Service methods have unit tests (passing)
- [ ] Controllers have MockMvc tests (passing)
- [ ] All classes and public methods have comments
- [ ] Swagger UI documents all new endpoints
- [ ] `docs/result/구현작업.md` updated
