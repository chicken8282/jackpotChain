# Goal

Harden production authentication cookie handling by making refresh cookie attributes environment-aware, enforcing explicit `SameSite` policy, and removing protected-controller fallback paths that bypass authenticated execution in tests.

# Scope

- Backend refresh cookie contract for `POST /api/v1/auth/verify`
- Backend refresh cookie contract for `POST /api/v1/auth/refresh`
- Backend refresh cookie clearing contract for `POST /api/v1/auth/logout`
- Backend security-protected controller behavior for wallet, lotto, and exchange APIs
- Backend security tests for `401` and `403`
- Frontend auth/session consumers only if backend API or cookie consumption contract changes
- Review/result documentation updates for the completed auth workstreams

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/blockchain.md`
- `docs/reviews/auth.md`
- `blockchain/docs/adr/ADR-001-claim-validation.md`
- `docs/result/auth-session-protection-2026-03-20.md`

# Impacted Layers

- Backend controller: auth cookie writing, protected API controller auth subject wiring
- Backend config: security configuration and auth cookie properties
- Backend test layer: auth controller tests, protected API security tests, authenticated controller tests
- Backend configuration files: `application.yml`, `application-local.yml`, `application-prod.yml`, `application-test.yaml`
- Frontend session consumer layer if refresh cookie contract requires request changes
- Documentation: `docs/reviews/auth.md`, `docs/result/*`

# Failure Points

- Production cookie rejected because `SameSite=None` is emitted with `Secure=false`
- Local development cookie blocked because `Secure=true` is forced on HTTP
- Cookie deletion path or attributes do not match the original cookie, leaving stale refresh cookies behind
- Protected controller tests still pass through unauthenticated fallback branches instead of exercising real authenticated execution
- Missing token returns a non-contract response
- Subject mismatch is not surfaced as `403`

# Implementation Steps

1. Add or update the plan-specific configuration model for refresh cookie attributes and bind it from environment-aware application properties.
2. Add failing controller/security tests for cookie attributes, authenticated protected-controller execution, `401`, and `403`.
3. Refactor auth controller cookie writing to use the configured policy with explicit `SameSite`.
4. Remove protected-controller `authentication == null` fallback branches from wallet, lotto, and exchange controllers.
5. Keep subject ownership enforcement in services and verify it through authenticated controller/security tests.
6. Update frontend only if request credentials or restore flow contract changes.
7. Run focused tests first, then full backend and frontend verification.
8. Update review/result docs for Task 1, Task 2, and this hardening step.

# Test Checklist

- [ ] Auth controller verify cookie contract test covers `HttpOnly`, `Path`, `Max-Age`, `Secure`, and `SameSite`
- [ ] Auth controller refresh cookie rotation test covers the same cookie attributes
- [ ] Auth controller logout cookie clearing test verifies matching path/attributes and `Max-Age=0`
- [ ] Protected API without token returns `401`
- [ ] Protected API with mismatched wallet subject returns `403`
- [ ] Wallet controller authenticated test calls service with authenticated wallet subject
- [ ] Lotto controller authenticated tests call protected service overloads
- [ ] Exchange controller authenticated tests call protected service overloads
- [ ] `cd BE-ssatto && ./gradlew test`
- [ ] `cd FE-ssatto && npm test`
- [ ] `cd FE-ssatto && npm run build`

# Observability Checklist

- [ ] No new request-entry `INFO` logs are added
- [ ] Auth success logging remains service-scoped only
- [ ] Cookie policy failures are bounded by startup configuration validation or deterministic tests
- [ ] Error responses for auth failures remain consistent with existing API contract

# Done Criteria

- [ ] Refresh cookie policy is configured by environment and production-safe by default
- [ ] `SameSite` is emitted explicitly on all refresh cookie writes
- [ ] Protected controllers no longer depend on null-auth fallback behavior
- [ ] Authenticated controller tests exercise real authenticated request wiring
- [ ] Required backend and frontend verification commands complete
- [ ] `docs/reviews/auth.md` reflects the completed storage security + session/auth hardening work succinctly
- [ ] A result document for this task is written with exact test outcomes and next-fix prompt if needed
