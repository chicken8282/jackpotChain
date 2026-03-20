# Overview

Implemented the production auth deployment hardening step for credentialed cross-origin requests.

- Backend now uses an explicit environment-aware CORS allowlist for auth and protected APIs.
- Credentialed refresh-cookie flows return CORS headers only for allowed origins.
- Same-origin reverse-proxy deployment remains compatible because CORS is only relevant for cross-origin requests.
- Frontend code did not require changes because it already uses `credentials: "include"` and defaults to the same-origin `/api` base path.

# File & Class Change Log

- Planning
  - `docs/plans/auth-cors-hardening-2026-03-20.md`
- Backend config
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/AuthCorsProperties.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java`
- Backend configuration resources
  - `BE-ssatto/src/main/resources/application.yml`
  - `BE-ssatto/src/main/resources/application-local.yml`
  - `BE-ssatto/src/main/resources/application-prod.yml`
  - `BE-ssatto/src/test/resources/application-test.yaml`
- Backend tests
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/global/config/ProtectedApiSecurityTest.java`
- Review docs
  - `docs/reviews/auth.md`

# Cross-Layer Impact Summary

- Backend now externalizes allowed frontend origins and emits `Access-Control-Allow-Origin` plus `Access-Control-Allow-Credentials: true` only for configured origins.
- Local/test allow local frontend origins explicitly.
- Production reads allowed origins from `AUTH_CORS_ALLOWED_ORIGINS`.
- Frontend remains on the existing `/api` same-origin path by default, which avoids CORS entirely when reverse proxy is used.
- JWT subject enforcement, refresh-cookie handling, and protected endpoint authorization are unchanged.

# Implemented Changes

- Added `AuthCorsProperties` for:
  - allowed origins
  - allowed methods
  - allowed headers
  - preflight max age
- Added validation that rejects wildcard origins for credentialed requests.
- Enabled `http.cors()` in Spring Security and registered a `CorsConfigurationSource` for `/api/**`.
- Preserved stateless JWT security and existing endpoint authorization rules.
- Added focused security tests for:
  - allowed-origin preflight success
  - blocked-origin preflight rejection
  - existing protected API `401`
  - existing protected API `403`
- Updated auth review documentation with deployment assumptions:
  - preferred same-origin reverse proxy
  - cross-origin requires `AUTH_CORS_ALLOWED_ORIGINS` and HTTPS

# Tests Run

- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.global.config.ProtectedApiSecurityTest'`
  - Initial result: failed
  - Passed tests:
    - existing protected API `401`
    - existing protected API `403`
    - blocked-origin preflight rejection
  - Failed tests:
    - allowed-origin preflight CORS header test
  - Brief failure symptoms/messages:
    - `Access-Control-Allow-Origin` and credential headers were not returned because CORS was not configured in the security chain
  - Reproducible or environment-dependent:
    - reproducible locally

- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.global.config.ProtectedApiSecurityTest'`
  - Final result: passed
  - Passed tests:
    - allowed-origin preflight CORS header test
    - blocked-origin preflight rejection
    - existing protected API `401`
    - existing protected API `403`
  - Failed tests:
    - none
  - Brief failure symptoms/messages:
    - none
  - Reproducible or environment-dependent:
    - reproducible locally

- `cd BE-ssatto && ./gradlew test`
  - Final result: passed
  - Passed tests:
    - full backend test suite
  - Failed tests:
    - none
  - Brief failure symptoms/messages:
    - none
  - Reproducible or environment-dependent:
    - reproducible locally

- `cd FE-ssatto && npm test`
  - Final result: passed
  - Passed tests:
    - wallet session restore tests
    - wallet auth flow tests
    - keystore tests
    - legacy migration tests
    - encryption tests
    - wallet parity tests
  - Failed tests:
    - none
  - Brief failure symptoms/messages:
    - none
  - Reproducible or environment-dependent:
    - reproducible locally

- `cd FE-ssatto && npm run build`
  - Final result: passed
  - Passed tests:
    - TypeScript build
    - Vite production build
  - Failed tests:
    - none
  - Brief failure symptoms/messages:
    - Vite emitted a chunk-size warning only
  - Reproducible or environment-dependent:
    - reproducible locally

# Failed Tests / Unresolved Issues

- Final failing tests:
  - none

- Remaining unresolved issue:
  - what was tested:
    - CORS preflight handling, existing auth/protected security behavior, full backend suite, frontend tests, frontend build
  - why it failed:
    - no remaining blocking failure
  - suspected root cause:
    - not applicable
  - impact scope:
    - none for the implemented CORS hardening scope
  - what should be improved next:
    - document and validate production reverse-proxy/env examples so `AUTH_CORS_ALLOWED_ORIGINS` is not missed during deployment

# Risks / Assumptions

- Assumed same-origin `/api` reverse proxy remains the preferred production deployment path.
- Assumed cross-origin deployments use HTTPS and supply `AUTH_CORS_ALLOWED_ORIGINS`.
- Production with an empty allowlist will reject cross-origin browser requests, but same-origin requests continue to work.
- No cookie domain customization was added in this step because the current contract relies on host-only cookies.

# Next Steps

- Add `.env.prod.example` or equivalent deployment documentation for `AUTH_CORS_ALLOWED_ORIGINS`.
- Validate reverse-proxy/frontend origin settings in production compose or deployment docs.
- Consider adding smoke checks for preflight behavior in deployment validation if browser-based cross-origin access is required.

# Prompt for Next Fix

Read `AGENTS.md`, `docs/specs/frontend-spec.md`, `docs/specs/backend-spec.md`, `docs/specs/infra-spec.md`, and `docs/reviews/auth.md` first.

Task:
Implement the next production auth deployment step: deployment-safe origin configuration examples and proxy validation for credentialed auth traffic. The backend now supports explicit CORS allowlists, but the deployment setup still depends on operators providing the correct origin environment variables and reverse-proxy assumptions.

Likely files/layers involved:
- `docker-compose.prod.yml`
- `.env.prod.example` or tracked environment example files if present
- `FE-ssatto/nginx.conf`
- deployment/runbook docs under `docs/`
- backend config docs if proxy or origin assumptions need clarification

Current failing behavior:
- No failing automated test currently, but production rollout can still fail if `AUTH_CORS_ALLOWED_ORIGINS` is omitted or if the frontend is deployed with an origin that does not match the backend allowlist.

Suspected cause:
- Origin allowlist configuration is now externalized, but deployment examples and validation guidance are not explicit enough yet.

Required fixes:
- Add tracked production environment examples for auth CORS/origin values
- Document same-origin versus cross-origin deployment modes
- Clarify nginx/proxy expectations for `/api` routing and HTTPS termination
- Add any feasible config validation or smoke-check documentation for deploy time

Tests that must pass:
- `cd BE-ssatto && ./gradlew test`
- existing protected API `401/403` tests
- auth controller cookie contract tests
- CORS preflight security tests
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`

Remaining spec constraints:
- private keys stay client-side
- raw refresh tokens never persist server-side
- controller remains request/response only
- protected APIs must still enforce `JWT subject == request wallet address`
