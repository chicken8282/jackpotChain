# Goal

Harden production auth delivery by adding explicit environment-aware CORS origin policy for credentialed refresh-cookie requests without changing the existing auth, wallet, lotto, or exchange API contracts.

# Scope

- Backend CORS configuration for auth and protected APIs
- Environment-aware allowlist properties for local, test, and prod
- Backend security tests for allowed-origin preflight and blocked-origin behavior
- Documentation of frontend origin and reverse-proxy assumptions
- Frontend changes only if API base-origin assumptions require tightening

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/auth.md`

# Impacted Layers

- Backend config: security and CORS properties
- Backend resources: `application.yml`, `application-local.yml`, `application-prod.yml`, `application-test.yaml`
- Backend tests: security integration tests
- Infra docs/config: production origin assumptions and proxy behavior
- Frontend API config if explicit absolute-origin use becomes required

# Failure Points

- Browser blocks refresh cookie because `Access-Control-Allow-Origin` is missing
- Browser blocks credentialed request because `Access-Control-Allow-Credentials` is absent or false
- Wildcard origin is combined with credentials, which is invalid and unsafe
- Preflight request to auth/protected APIs fails and prevents refresh or protected reads
- Same-origin proxy deployment is accidentally broken by overly strict cross-origin policy
- Production origin allowlist is too broad or not externalized

# Implementation Steps

1. Add a dedicated CORS properties model with explicit allowed origins, methods, headers, and max-age.
2. Add failing security tests for:
   - allowed preflight origin
   - blocked origin
   - credential flag on allowed origin
3. Wire CORS into Spring Security with `allowCredentials=true` and an explicit allowlist.
4. Configure profile-specific origins:
   - local/test: local frontend origins
   - prod: environment-provided frontend origin allowlist
5. Keep existing endpoint authorization and JWT subject checks unchanged.
6. Update auth review/result docs with the production origin assumption and proxy guidance.
7. Run focused tests first, then full backend and frontend verification.

# Test Checklist

- [ ] Allowed origin preflight receives `Access-Control-Allow-Origin`
- [ ] Allowed origin preflight receives `Access-Control-Allow-Credentials: true`
- [ ] Blocked origin preflight does not receive an allow-origin header
- [ ] Existing protected API `401` test still passes
- [ ] Existing protected API `403` test still passes
- [ ] Auth controller cookie contract tests still pass
- [ ] `cd BE-ssatto && ./gradlew test`
- [ ] `cd FE-ssatto && npm test`
- [ ] `cd FE-ssatto && npm run build`

# Observability Checklist

- [ ] No request-entry `INFO` logs are added
- [ ] CORS behavior is deterministic from configuration
- [ ] Invalid origin configuration fails fast or is covered by tests
- [ ] Runtime auth error responses remain unchanged

# Done Criteria

- [ ] Credentialed CORS is enabled with explicit allowed origins
- [ ] Production origin policy is externalized, not hard-coded
- [ ] Same-origin proxy deployment remains compatible
- [ ] Existing auth/protected API behavior is preserved
- [ ] Result document is written with exact commands and outcomes
