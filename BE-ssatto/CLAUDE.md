# Backend — BE-ssatto (Spring Boot)

Inherits all rules from root CLAUDE.md. These rules are BE-specific additions.

## Reference Reviews

Before working on the following areas, read the corresponding review docs first:

| Area                                         | Review Document                                    |
| -------------------------------------------- | -------------------------------------------------- |
| Auth (challenge-response, JWT, cookie, CORS) | `docs/reviews/auth.md`                             |
| Logging / observability                      | `docs/reviews/monitoring.md`                       |
| DB schema / ERD                              | `docs/reviews/erd.md`                              |
| API contracts and polling                    | `docs/reviews/api.md`, `docs/reviews/fe-be-api.md` |
| Architecture overview                        | `docs/reviews/architecture.md`                     |

## Stack

- Java 17+, Spring Boot 3.x
- Spring Security (JWT-based auth)
- JPA / Hibernate
- PostgreSQL (primary datastore)
- Redis (challenge TTL, session cache)

## Package Structure Conventions

```
domain/
  {feature}/
    controller/   HTTP layer only — no business logic
    service/      Business logic, transaction boundaries
    repository/   JPA interfaces
    dto/          Request/Response objects
    entity/       JPA entities
    exception/    Domain-specific exceptions
```

## Implementation Rules

**Controllers:**

- Thin — delegate immediately to service
- Return `ResponseEntity<>` with explicit HTTP status
- Validate input with `@Valid` / `@Validated`
- Never expose entity objects directly — use DTOs
- No null-auth fallback in protected controllers — principal must always be present

**Services:**

- Own all business logic and transaction boundaries
- `@Transactional` on write methods; `@Transactional(readOnly = true)` on reads
- Throw domain exceptions (not generic `RuntimeException`)
- Never catch exceptions silently

**Repositories:**

- Prefer named query methods or `@Query` over raw JPQL where readable
- No business logic in repositories
- Use projections for read-heavy endpoints to avoid N+1

**Entities:**

- No `@Data` on entities (causes infinite loop in equals/hashCode)
- Use `@Builder` + explicit constructors for controlled creation
- Audit fields (`createdAt`, `updatedAt`) via `@EntityListeners`

## Auth Architecture (read `docs/reviews/auth.md` before modifying)

The auth system is a layered design built over 4 hardening iterations. Do not simplify or bypass any layer.

**Core contract:**

- Login proves key possession, not address knowledge
- Server issues a one-time challenge → client signs with private key → server verifies signature AND derives address from public key → must match claimed address
- Protected APIs always enforce `JWT subject == requested wallet address`

**Token model:**

- Short-lived access token + longer-lived refresh session
- `auth_challenge` stored in Redis with TTL (never DB)
- `auth_refresh_session` stores only SHA-256 hash of refresh token, never the raw value
- Refresh token rotation on every use (update hash + expiry, not new row)
- Logout sets `revoked_at`

**Cookie policy (environment-sensitive — must not be wrong):**

- Local: `Secure=false`, `SameSite=Lax`
- Production: `Secure=true`, `SameSite=None`
- `SameSite=None` + insecure combination: block at startup (not runtime)

**CORS policy:**

- Allowlist-based for credentialed CORS; never wildcard `*` with credentials
- Allowlist externalized via environment variable
- Preferred deployment: same-origin (frontend + backend share one public origin via reverse proxy)

## DB / ERD Rules (read `docs/reviews/erd.md` before schema changes)

- **Wallet balance is never stored in DB** — always fetched from RPC (`getbalance`, `listunspent`)
- Private keys and raw refresh tokens are never stored server-side
- `auth_challenge` lives in Redis, not a DB table
- Blockchain data (blocks, transactions, activities, lotto entries, jackpot pool) is indexed via Webhook pattern from the Server Node

## Error Handling

- Global `@RestControllerAdvice` for exception mapping
- Domain exceptions → 4xx, system exceptions → 5xx
- Error response body must include: `code`, `message`, `timestamp`
- Never leak stack traces to the client

## Security

- All endpoints require explicit auth mapping — no implicit public access
- JWT validation in filter layer, not service layer
- Sensitive fields (passwords, raw tokens, `signedTxHex`) never in logs or response DTOs

## Logging / Observability (read `docs/reviews/monitoring.md` before adding logs)

**Log level policy:**
| Level | Collect in prod | When to use |
|-------|----------------|-------------|
| `ERROR` | Always | System failures, RPC failures, unhandled exceptions |
| `INFO` | Core business events only | State-changing actions that succeeded |
| `WARN` | Conditional | Security anomalies, repeated failures, external system degradation |
| `DEBUG` | Never | Local/dev environment only |

**Core INFO events to always log (structured, with `eventType`):**

- `AUTH_TOKEN_ISSUED`
- `WALLET_REGISTERED`
- `EXCHANGE_TRANSACTION_SUBMITTED`
- `LOTTO_COMMIT_SUBMITTED`
- `JACKPOTCHAIN_TRANSACTION_SUBMITTED`

**Structured log format (JSON, Loki-compatible):**

- Required MDC fields: `traceId`, `requestId`, `eventType`, `uri`, `method`
- Domain fields: `walletAddress`, `txId`, `commitHash` where applicable
- Injected by `RequestLoggingFilter` per request

**Never log:**

- JWT raw value
- `signedTxHex`
- Passwords / secrets / env values

**Do NOT log simple read successes** (`getOverview`, `getWallets`, `getDashboard`, etc.) — use metrics instead.

## Testing

- Unit tests: service layer with mocked dependencies
- Integration tests: `@SpringBootTest` + `@Transactional` for rollback
- Use `TestContainers` for DB/Redis integration tests when possible
- Auth controller tests must test the real auth principal path — no null-auth fallback shortcuts
- Test file location mirrors source: `src/test/java/...`

## Performance

- Use `@Cacheable` deliberately with explicit TTL and eviction strategy
- Never load full entity graph when a projection suffices
- Batch inserts/updates where volume justifies it
- Log slow queries (threshold in config, not hardcoded)
