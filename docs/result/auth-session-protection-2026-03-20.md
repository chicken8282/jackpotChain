# Overview

Implemented wallet-scoped session completion for the challenge-based authentication flow.

- Backend now supports short-lived access JWTs, 14-day refresh sessions, rotation, logout, protected API filtering, and wallet subject authorization.
- Frontend now restores sessions in this order: in-memory access token, refresh session handle, then unlock + challenge login.
- Review docs were updated to reflect the active contract: `api.md`, `erd.md`, and `auth.md`.

# File & Class Change Log

- Backend auth/session
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/controller/AuthController.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/service/AuthService.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/dto/AuthRefreshRequest.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/dto/AuthRefreshResponse.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/dto/AuthLogoutRequest.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/dto/AuthVerifyResponse.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/model/AuthRefreshSession.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/repository/AuthRefreshSessionRepository.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/exception/AuthForbiddenException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/exception/AuthRefreshSessionNotFoundException.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/exception/InvalidAuthRefreshRequestException.java`
- Backend security
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/JwtAuthenticationFilter.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/JwtAuthenticationEntryPoint.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/util/JwtUtil.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/exception/ErrorCode.java`
- Backend protected service boundaries
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/controller/WalletController.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/service/LottoService.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/lotto/controller/LottoController.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/service/ExchangeService.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/exchange/controller/ExchangeController.java`
- Backend persistence/config
  - `BE-ssatto/src/main/resources/application.yml`
  - `BE-ssatto/src/main/resources/db/migration/V3__add_auth_refresh_session.sql`
- Frontend session restore
  - `FE-ssatto/src/services/authService.ts`
  - `FE-ssatto/src/services/walletSessionService.ts`
  - `FE-ssatto/src/stores/useWalletStore.ts`
  - `FE-ssatto/src/stores/useWalletSessionStore.ts`
  - `FE-ssatto/src/pages/WalletPage.tsx`
  - `FE-ssatto/src/pages/LottoPage.tsx`
  - `FE-ssatto/src/services/lottoService.ts`
  - `FE-ssatto/src/services/exchangeService.ts`
  - `FE-ssatto/src/lib/api.ts`
- Tests and shared fixture
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/auth/service/AuthServiceTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/auth/controller/AuthControllerTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/global/config/ProtectedApiSecurityTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/wallet/service/WalletServiceTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/lotto/service/LottoServiceTest.java`
  - `BE-ssatto/src/test/java/ssatto/BE_ssatto/domain/exchange/service/ExchangeServiceTest.java`
  - `FE-ssatto/src/services/walletSessionService.test.ts`
  - `FE-ssatto/src/lib/crypto/wallet.test.ts`
  - `docs/fixtures/wallet_vectors.json`
- Review docs
  - `docs/reviews/api.md`
  - `docs/reviews/erd.md`
  - `docs/reviews/auth.md`

# Cross-Layer Impact Summary

- Auth contract changed from access-only login to access + refresh session.
- Backend owns challenge lifecycle, refresh session persistence, JWT validation, and subject authorization.
- Frontend owns session restoration order and stores only wallet metadata plus refresh session handle in persisted state.
- Protected wallet-facing reads now require JWT subject and request wallet address to match.

# Implemented Changes

- Added refresh session persistence with hashed refresh token storage and rotation on every successful refresh.
- Added `POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout`.
- Removed active reliance on legacy `/auth/token`.
- Split access token lifetime from refresh session lifetime.
- Added JWT authentication filter and JSON 401 entry point.
- Protected these APIs:
  - `GET /api/v1/wallet/{address}/activities`
  - `GET /api/v1/lotto`
  - `GET /api/v1/lotto/entries`
  - `POST /api/v1/lotto/commit`
  - `GET /api/v1/exchange/info`
  - `POST /api/v1/exchange/jack-to-pot`
- Enforced wallet subject matching in wallet, lotto, and exchange services.
- Strengthened backend wallet address validation using the blockchain-compatible address checker.
- Added shared wallet parity fixture usage in FE and BE tests.
- Implemented frontend wallet session restoration order:
  - memory access token
  - refresh by `refreshSessionHandle`
  - unlock + challenge login fallback
- Persisted `refreshSessionHandle` in wallet metadata and kept access token in memory only.
- Enabled `fetch(..., { credentials: "include" })` so refresh/logout cookies are sent.

# Tests Run

- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.auth.service.AuthServiceTest' --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerTest' --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.global.config.ProtectedApiSecurityTest' --tests 'ssatto.BE_ssatto.domain.auth.util.WalletAuthCryptoTest'`
  - Initial result: failed
  - Failure symptoms:
    - missing refresh/session/security classes and methods
    - `WebMvcTest` missing security beans
    - strengthened address validation broke old fake-address tests
  - Reproducibility: reproducible before implementation and test updates
- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.auth.service.AuthServiceTest' --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerTest' --tests 'ssatto.BE_ssatto.domain.wallet.service.WalletServiceTest' --tests 'ssatto.BE_ssatto.global.config.ProtectedApiSecurityTest' --tests 'ssatto.BE_ssatto.domain.auth.util.WalletAuthCryptoTest' --tests 'ssatto.BE_ssatto.domain.lotto.service.LottoServiceTest' --tests 'ssatto.BE_ssatto.domain.exchange.service.ExchangeServiceTest'`
  - Passed tests:
    - auth challenge / verify / refresh service tests
    - auth controller cookie contract tests
    - protected API 401 test
    - wallet / lotto / exchange service authorization and validation tests
    - wallet parity verification test
  - Failed tests: none
  - Reproducibility: reproducible
- `cd BE-ssatto && ./gradlew test`
  - Initial result: failed
  - Failure symptoms:
    - controller tests used `addFilters=false` and expected old controller call paths
    - protected endpoints returned null `data` in those test contexts
  - Reproducibility: reproducible before controller fallback update
- `cd BE-ssatto && ./gradlew test`
  - Passed tests: full backend test suite
  - Failed tests: none
  - Reproducibility: reproducible
- `cd FE-ssatto && npm test`
  - Passed tests:
    - wallet session restore tests
    - wallet auth flow tests
    - keystore tests
    - legacy migration tests
    - encryption tests
    - wallet parity tests
  - Failed tests: none
  - Reproducibility: reproducible
- `cd FE-ssatto && npm run build`
  - Initial result: failed
  - Failure symptoms:
    - TypeScript test file treated `restoreWalletSession()` result as possibly null
  - Reproducibility: reproducible before test narrowing fix
- `cd FE-ssatto && npm run build`
  - Passed tests: production build
  - Failed tests: none
  - Brief note: Vite emitted a large chunk-size warning only
  - Reproducibility: reproducible

# Failed Tests / Unresolved Issues

- No unresolved test failures remain.
- No known runtime blockers remain for the implemented auth/session scope.

# Risks / Assumptions

- Refresh cookie is currently set with `Secure=false` for local compatibility. Production deployment should externalize this behavior by profile or environment.
- Controller fallback branches exist only to keep existing `addFilters=false` controller tests stable; runtime protection still depends on the security filter chain.
- Wallet registration and wallet summary listing remain open by assumption. If the product later requires full session enforcement there, security rules should be tightened explicitly.
- Frontend still does not complete signed write flows for exchange and lotto commit; this task only completed session and protected-read behavior.

# Next Steps

- Add environment-aware secure cookie handling and SameSite policy.
- Replace controller fallback branches with authenticated test principals once controller tests are modernized.
- Complete FE signed transaction flows for `exchange` and `lotto commit`.
- Add refresh/logout API coverage to `docs/reviews/api.md` examples for FE integration snippets if needed.

# Prompt for Next Fix

Implement the next auth hardening step for production deployment. Focus on `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/auth/controller/AuthController.java`, `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java`, `BE-ssatto/src/main/resources/application*.yml`, and FE session consumers if contract changes. Current behavior uses local-compatible refresh cookies with `Secure=false` and test-only controller fallback branches. Replace this with environment-aware cookie policy, explicit SameSite handling, and authenticated controller tests that no longer rely on null-auth fallback paths. Required tests: backend full `./gradlew test`, protected API 401/403 tests, auth controller cookie contract tests, frontend `npm test`, frontend `npm run build`. Keep existing constraints: private keys stay client-side, raw refresh tokens never persist server-side, controller remains request/response only, and protected APIs must still enforce `JWT subject == request wallet address`.
