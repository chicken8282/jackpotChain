# Overview

Completed the production-focused auth hardening step after the wallet storage-security and session-protection phases.

- Backend refresh cookies now use environment-aware attributes with explicit `SameSite`.
- Protected controllers no longer keep null-auth fallback branches for test compatibility.
- Controller and security tests now exercise authenticated protected flows and cookie header contracts.
- Frontend code did not require contract changes because `credentials: "include"` was already in place.

# File & Class Change Log

- Planning
  - `docs/plans/auth-cookie-hardening-2026-03-20.md`
- Backend auth/config
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/controller/AuthController.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/AuthRefreshCookieProperties.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java`
- Backend protected controllers
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/controller/WalletController.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/controller/LottoController.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/controller/ExchangeController.java`
- Backend configuration
  - `BE-ssatto/src/main/resources/application.yml`
  - `BE-ssatto/src/main/resources/application-local.yml`
  - `BE-ssatto/src/main/resources/application-prod.yml`
  - `BE-ssatto/src/test/resources/application-test.yaml`
- Backend tests
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/auth/controller/AuthControllerTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/auth/controller/AuthControllerLocalCookiePolicyTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/global/config/ProtectedApiSecurityTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/controller/WalletControllerTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/lotto/controller/LottoControllerTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/exchange/controller/ExchangeControllerTest.java`
- Review docs
  - `docs/reviews/auth.md`

# Cross-Layer Impact Summary

- Backend response headers changed from servlet `Cookie` defaults to explicit `Set-Cookie` headers built from environment-aware policy.
- Backend protected controller execution now assumes authenticated principal presence and delegates wallet subject validation to services without fallback bypasses.
- Frontend session restore flow remains compatible because refresh/logout requests were already sending credentials.
- Documentation now reflects the completed storage-security, session-protection, and cookie-hardening phases as a single auth story.

# Implemented Changes

- Added `AuthRefreshCookieProperties` and bound refresh cookie policy from configuration.
- Enforced explicit cookie attributes:
  - `HttpOnly`
  - `Path`
  - `Max-Age`
  - `SameSite`
  - `Secure`
- Configured profile behavior:
  - local/test: `Secure=false`, `SameSite=Lax`
  - prod: `Secure=true`, `SameSite=None`
- Added startup validation to reject `SameSite=None` with `Secure=false`.
- Switched auth controller cookie writing to `ResponseCookie` so the full browser-facing contract is explicit.
- Removed protected-controller null-auth fallback branches from wallet, lotto, and exchange controllers.
- Updated controller tests to supply authenticated principals directly and verify protected service overload usage.
- Added protected API `403` coverage for subject mismatch alongside existing `401` coverage.

# Tests Run

- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerTest' --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerLocalCookiePolicyTest' --tests 'ssatto.BE_ssatto.global.config.ProtectedApiSecurityTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest' --tests 'ssatto.BE_ssatto.domain.lotto.controller.LottoControllerTest' --tests 'ssatto.BE_ssatto.domain.exchange.controller.ExchangeControllerTest'`
  - Initial result: failed
  - Passed tests: none
  - Failed tests:
    - `AuthControllerTest`
    - `AuthControllerLocalCookiePolicyTest`
    - `WalletControllerTest`
    - `LottoControllerTest`
    - `ExchangeControllerTest`
  - Brief failure symptoms/messages:
    - refresh cookies did not include explicit `SameSite`
    - production cookie expectation failed because `Secure` was always false
    - protected controller tests returned empty/missing `data` because they still depended on null-auth fallback paths
  - Reproducible or environment-dependent:
    - reproducible locally

- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerTest' --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerLocalCookiePolicyTest' --tests 'ssatto.BE_ssatto.global.config.ProtectedApiSecurityTest' --tests 'ssatto.BE_ssatto.domain.wallet.controller.WalletControllerTest' --tests 'ssatto.BE_ssatto.domain.lotto.controller.LottoControllerTest' --tests 'ssatto.BE_ssatto.domain.exchange.controller.ExchangeControllerTest'`
  - Final result: passed
  - Passed tests:
    - auth controller cookie contract tests
    - local/prod refresh cookie policy tests
    - protected API `401`/`403` tests
    - authenticated wallet/lotto/exchange controller tests
  - Failed tests:
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
    - refresh cookie contract, authenticated protected-controller execution, backend full suite, frontend tests, frontend build
  - why it failed:
    - no remaining blocking failure
  - suspected root cause:
    - not applicable
  - impact scope:
    - none for the implemented auth-cookie-hardening scope
  - what should be improved next:
    - add explicit production CORS/origin policy for credentialed refresh-cookie delivery

# Risks / Assumptions

- Assumed local development still runs over HTTP, so local/test cookie policy remains `Secure=false` with `SameSite=Lax`.
- Assumed production refresh flows may run cross-site behind HTTPS, so production policy uses `Secure=true` and `SameSite=None`.
- Frontend did not require code changes because all auth requests already use `credentials: "include"`.
- Protected endpoints now rely on security configuration being active in runtime; direct unauthenticated controller invocation is no longer supported as a test shortcut.

# Next Steps

- Add explicit CORS allowlist and credentials policy for production refresh-cookie delivery.
- Verify reverse-proxy and frontend origin settings align with `SameSite=None; Secure`.
- Consider narrowing `permitAll` routes further if wallet registration/listing requirements change.

# Prompt for Next Fix

Read `AGENTS.md`, `docs/specs/frontend-spec.md`, `docs/specs/backend-spec.md`, `docs/specs/infra-spec.md`, and `docs/reviews/auth.md` first.

Task:
Implement the next production auth deployment step: explicit CORS/origin hardening for credentialed refresh-cookie delivery. The current backend now emits environment-aware refresh cookies with explicit `SameSite`, but production-safe cross-origin delivery still depends on correct CORS and proxy configuration.

Likely files/layers involved:
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java`
- backend CORS configuration classes if needed
- `BE-ssatto/src/main/resources/application*.yml`
- frontend environment/API base URL usage if origin assumptions need tightening
- infra/proxy config if an origin allowlist is documented in repo config

Current failing behavior:
- No failing automated test currently, but the production deployment risk is that refresh cookies may still be blocked or not sent if allowed origins and credentials policy are not configured explicitly.

Suspected cause:
- Security config does not yet define a production allowlist for credentialed cross-origin requests, and cookie hardening alone does not guarantee browser delivery.

Required fixes:
- Add environment-aware CORS configuration with explicit allowed origins and `allowCredentials=true`
- Keep auth, wallet, lotto, and exchange API behavior unchanged
- Add tests that verify allowed-origin preflight/credential handling where feasible
- Document the expected frontend origin and proxy assumptions

Tests that must pass:
- `cd BE-ssatto && ./gradlew test`
- existing protected API `401/403` tests
- auth controller cookie contract tests
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`

Remaining spec constraints:
- private keys stay client-side
- raw refresh tokens never persist server-side
- controller remains request/response only
- protected APIs must still enforce `JWT subject == request wallet address`
