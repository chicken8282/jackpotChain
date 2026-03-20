# Goal

Complete the authentication flow after challenge login by adding refresh-session rotation, protected-resource enforcement, wallet-scoped session restoration, and cross-stack golden fixture verification.

# Scope

- Backend refresh session persistence and rotation
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- Access-token expiration policy split from refresh-token expiration policy
- JWT authentication filter and protected endpoint configuration
- Wallet-subject authorization for protected wallet-specific APIs
- Frontend wallet-scoped session restoration and switch behavior
- Removal of legacy `/auth/token` usage and endpoint
- Shared wallet fixture file for FE/BE/blockchain verification

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/blockchain.md`
- `docs/reviews/auth.md`
- `docs/plans/be-fe_auth.md`

# Impacted Layers

- Backend Controller
- Backend Service
- Backend Repository
- Backend Security config/filter
- Backend Flyway schema
- Frontend auth service
- Frontend wallet/session stores
- Frontend wallet and lotto pages
- Shared docs fixture

# Failure Points

- Missing or invalid refresh cookie
- Session-handle mismatch and replay attempts
- Expired or revoked refresh session
- JWT missing/invalid on protected APIs
- Authenticated wallet subject not matching requested wallet address
- FE wallet switch trying stale access tokens
- Legacy `/auth/token` callers after endpoint removal

# Implementation Steps

1. Add shared wallet fixture file and failing tests for refresh/logout/security/session restore.
2. Add refresh-session persistence model, repository, Flyway migration, DTOs, and error types.
3. Split JWT access and refresh expiration settings and implement refresh token hashing + cookie issuing.
4. Add `/auth/refresh` and `/auth/logout`; rotate refresh token on refresh and challenge verify.
5. Remove legacy `/auth/token` endpoint and update docs/contracts.
6. Add JWT filter, authentication entry point, and wallet-subject authorization checks on protected APIs.
7. Update FE wallet metadata to persist session handles and update session store to keep wallet-scoped access tokens.
8. Add FE restore/switch flow: valid access token -> refresh -> unlock + challenge login.
9. Update FE API services to pass Bearer tokens for protected wallet APIs.
10. Run focused tests, broader backend tests, frontend tests, and build verification.

# Test Checklist

- [ ] Backend auth service refresh success test
- [ ] Backend auth service refresh failure/replay test
- [ ] Backend auth service logout revoke test
- [ ] Backend auth controller cookie/response contract test
- [ ] Backend protected endpoint 401 test
- [ ] Backend wallet-subject mismatch rejection test
- [ ] Wallet address format validation test
- [ ] FE wallet session restore test
- [ ] FE wallet switch fallback order test
- [ ] FE and BE shared wallet fixture test

# Observability Checklist

- [ ] INFO only on successful auth completion/logout completion
- [ ] ERROR only on infra failures, not auth business rejections
- [ ] FE exposes Korean messages for locked wallet, refresh failure, and re-auth requirement

# Done Criteria

- [ ] App reopen can restore a wallet via refresh session without immediate unlock when a valid refresh session exists
- [ ] Protected endpoints return 401 without valid access token
- [ ] Wallet-subject mismatch is rejected consistently
- [ ] Refresh rotation invalidates old refresh tokens
- [ ] Legacy `/auth/token` is removed or fully unused
- [ ] Shared wallet fixture is used by FE/BE tests
- [ ] Result document is written
