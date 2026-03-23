# Overview

- Implemented the FE polling plan from `docs/reviews/fe-be-api.md` for the currently connected FE -> BE read paths.
- Added a reusable polling hook and applied it to dashboard, wallet summaries, and lotto overview.
- Reduced repeated dashboard block-detail requests by caching block detail responses per height.
- Kept BE contracts unchanged in this scope.

# File & Class Change Log

- `FE-ssatto/src/hooks/pollingHelpers.ts`
  - Added shared polling decision and error-normalization helpers.
- `FE-ssatto/src/hooks/usePollingQuery.ts`
  - Added a reusable polling hook with enable/disable, interval control, hidden-tab pause, overlap guard, and manual refetch.
- `FE-ssatto/src/hooks/useWalletSummaries.ts`
  - Added wallet summary polling for the wallet page.
- `FE-ssatto/src/hooks/useLottoOverview.ts`
  - Added lotto overview polling for the lotto page.
- `FE-ssatto/src/hooks/dashboardDataHelpers.ts`
  - Added dashboard detail-cache helpers and summary/detail mapping logic.
- `FE-ssatto/src/hooks/useDashboardData.ts`
  - Refactored dashboard loading to the shared polling hook and added per-height detail caching.
- `FE-ssatto/src/pages/WalletPage.tsx`
  - Replaced direct wallet summary loading with the dedicated polling hook.
- `FE-ssatto/src/pages/LottoPage.tsx`
  - Replaced one-shot lotto overview loading with the dedicated polling hook.
- `FE-ssatto/src/hooks/pollingHelpers.test.ts`
  - Added unit tests for polling enable/disable and hidden-tab behavior.
- `FE-ssatto/src/hooks/dashboardDataHelpers.test.ts`
  - Added unit tests for missing-height detection and dashboard mapping behavior.

# Cross-Layer Impact Summary

- Frontend page layer
  - Wallet and lotto pages now consume hook-based polling state instead of issuing local one-shot fetches.
- Frontend hook layer
  - Polling behavior is centralized to keep interval lifecycle, hidden-tab pause, and error fallback consistent.
- Frontend service layer
  - Existing wallet and lotto service contracts were reused as-is.
- Backend
  - No controller, service, repository, RPC, DTO, schema, or infra changes were needed.

# Implemented Changes

- Added `usePollingQuery` so FE polling uses one implementation path instead of page-local `setInterval` logic.
- Updated dashboard loading so `GET /api/v1/blockchain/dashboard` is polled every 10 seconds, but `GET /api/v1/blockchain/blocks/{height}` is only fetched for unseen heights.
- Added wallet summary polling so the wallet page refreshes balances and nicknames while the page stays open.
- Added lotto overview polling so the lotto page refreshes jackpot/entry overview while the page stays open.
- Kept the last known-good UI state on polling failure instead of clearing the screen state.
- Verified the touched scope against the relevant specs:
  - `frontend-spec.md`: page/hook/service responsibilities remained separated and no raw mock data was added to pages.
  - `backend-spec.md`: no backend boundary was violated because no BE change was introduced.
  - `infra-spec.md`: no new infra dependency or runtime contract was introduced.
  - `docs/reviews/blockchain.md`: no blockchain transaction, claim, or miner control rule was changed.

# Tests Run

- `cd FE-ssatto && npm test -- src/hooks/pollingHelpers.test.ts src/hooks/dashboardDataHelpers.test.ts`
  - First run failed.
  - Failed tests:
    - `src/hooks/pollingHelpers.test.ts`
  - Failure symptoms/messages:
    - hidden-tab polling guard returned `true` when an explicit hidden visibility value was passed in tests.
  - Reproducibility:
    - reproducible locally before the helper fix.
- `cd FE-ssatto && npm test -- src/hooks/pollingHelpers.test.ts src/hooks/dashboardDataHelpers.test.ts`
  - Final run passed.
  - Passed tests:
    - `src/hooks/pollingHelpers.test.ts`
    - `src/hooks/dashboardDataHelpers.test.ts`
  - Failed tests:
    - none
  - Reproducibility:
    - reproducible locally.
- `cd FE-ssatto && npm test`
  - Passed.
  - Passed tests:
    - 8 test files
    - 16 tests
  - Failed tests:
    - none
  - Reproducibility:
    - reproducible locally.
- `cd FE-ssatto && npm run build`
  - Passed.
  - Passed checks:
    - TypeScript compilation
    - Vite production build
  - Failed tests:
    - none
  - Failure symptoms/messages:
    - no build failure; only a Vite chunk-size warning remained.
  - Reproducibility:
    - reproducible locally.

# Failed Tests / Unresolved Issues

- No tests are currently failing after the helper fix.
- What was tested:
  - polling helper logic
  - dashboard detail-cache helper logic
  - full FE test suite
  - FE production build
- Why issues remain:
  - polling was implemented only for the FE -> BE paths that are already connected in the current product flow.
- Suspected root cause:
  - several APIs identified in `docs/reviews/fe-be-api.md` still do not have complete end-to-end read flows or page integration yet, so polling could not be implemented safely in this turn.
- Impact scope:
  - `wallet activities`, `lotto entries`, `lotto result`, and `mining blocks` still remain outside the shared polling path.
  - dashboard still needs one detail fetch per newly seen block height.
  - FE bundle size still emits a chunk warning during production build.
- What should be improved next:
  - implement the missing FE/BE read paths first, then extend `usePollingQuery` to those screens.
  - reduce dashboard payload coupling if BE can expose all required block card fields in `dashboard`.
  - split or lazy-load the largest FE bundle path to remove the Vite chunk warning.

# Risks / Assumptions

- This turn assumes 10-second polling is acceptable for dashboard, wallet summaries, and lotto overview based on the review document.
- This turn assumes the wallet and lotto pages should preserve the last successful state during transient polling failures.
- `WalletPage.tsx` already had ongoing auth/session changes in the worktree; this implementation only layered the wallet-summary polling hook onto that file and did not attempt to normalize unrelated in-progress changes.
- No BE API contract changes were made, so polling behavior depends on the current endpoints remaining stable.

# Next Steps

- Add the missing FE/BE read APIs for wallet activities, lotto entries/result, and mining blocks.
- Move any repeated polling interval values into a shared constant or config if more screens adopt polling.
- Revisit the dashboard API shape so the list endpoint can serve block-card fields without extra per-height detail requests.
- Trim or split the main FE bundle to remove the production chunk-size warning.

# Prompt for Next Fix

`Read AGENTS.md if present, docs/specs/frontend-spec.md, docs/specs/backend-spec.md, docs/specs/infra-spec.md, docs/reviews/fe-be-api.md, and docs/reviews/api.md first.

Task:
Implement the next polling-ready FE -> BE read flow that is still missing from the current product: wallet activities. Add the BE read contract if needed, connect it through the proper backend module boundaries, then integrate it into FE using the existing shared polling hook instead of page-local timers.

Likely files/layers involved:
- FE-ssatto/src/components/wallet/*
- FE-ssatto/src/pages/WalletPage.tsx
- FE-ssatto/src/services/walletService.ts
- FE-ssatto/src/hooks/usePollingQuery.ts
- FE-ssatto/src/hooks/*wallet*
- BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/**
- docs/reviews/api.md
- docs/reviews/fe-be-api.md

Current failing behavior:
- Wallet activity UI is still static/mock or not refreshed from BE, so users do not see near-real-time wallet transaction changes.

Suspected cause:
- There is no complete FE -> BE wallet activity read path wired into the wallet page yet, so the shared polling abstraction cannot be applied there.

Required fixes:
- Define or confirm the BE wallet activity query contract.
- Implement the BE controller/service/repository flow within module boundaries.
- Add FE service/adapter support and a dedicated polling hook.
- Replace any page-local mock or one-shot loading with the shared polling hook.
- Keep all user-facing text in Korean.

Tests that must pass:
- focused BE tests for wallet activity query logic
- FE adapter/hook tests for polling state transitions
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`
- relevant BE tests for the touched wallet module

Remaining spec constraints:
- Controller = request/response only
- Service = use case and transaction boundary
- Repository = persistence/query only
- No raw mock data directly in page components
- No private key storage on BE
- No uncertain RPC result treated as success`
