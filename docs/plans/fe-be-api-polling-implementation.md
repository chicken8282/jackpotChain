# Goal

Implement the polling improvements identified in `docs/reviews/fe-be-api.md` for the currently connected FE -> BE read paths, while keeping API contracts stable and responsibilities clear.

# Scope

Included:

- Add a reusable frontend polling hook for FE -> BE read APIs
- Apply polling to the currently connected read paths:
  - dashboard
  - wallet summaries
  - lotto overview
- Reduce unnecessary repeated block-detail requests on the dashboard
- Add focused frontend tests for the new polling-related adapter logic

Excluded:

- New backend endpoints that are still missing (`wallet activities`, `lotto entries`, `lotto result`, `mining blocks`, `claim`)
- SSE / WebSocket
- Backend schema or RPC changes

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/blockchain.md`
- `docs/reviews/fe-be-api.md`
- `docs/reviews/api.md`

# Impacted Layers

- FE page layer
  - `FE-ssatto/src/pages/WalletPage.tsx`
  - `FE-ssatto/src/pages/LottoPage.tsx`
- FE hook layer
  - `FE-ssatto/src/hooks/useDashboardData.ts`
  - new reusable polling hook
  - new wallet / lotto polling hooks if needed
- FE service / adapter layer
  - existing `walletService.ts`
  - existing `lottoService.ts`
- FE tests
  - new polling utility tests
  - dashboard mapping / cache tests

Backend impact:

- No API contract change in this scope
- No DTO / RPC / schema changes in this scope

# Failure Points

- Polling overlap causing concurrent duplicate requests
- Polling continuing while the tab is hidden
- Polling errors wiping out the last known-good UI state
- Dashboard over-fetching `blocks/{height}` details on every cycle
- Stale closures causing intervals to use outdated params

# Implementation Steps

1. Add a reusable polling hook with:
   - enable / disable
   - interval control
   - hidden-tab pause
   - bounded concurrency
   - manual refetch
2. Refactor dashboard polling to use the hook
3. Cache immutable block detail fields by height and only fetch detail for unseen heights
4. Add wallet summary polling for the wallet page
5. Add lotto overview polling for the lotto page
6. Add focused FE tests for:
   - polling decision helpers
   - dashboard detail-cache behavior
7. Run targeted tests first, then FE build

# Test Checklist

- [ ] New polling helper tests pass
- [ ] Dashboard mapping / cache tests pass
- [ ] Existing wallet/session/auth FE tests still pass
- [ ] FE build passes
- [ ] Wallet page keeps showing last good balances after transient polling failure
- [ ] Lotto page keeps showing last good overview after transient polling failure
- [ ] Dashboard does not refetch block detail for already-known heights each cycle

# Observability Checklist

- [ ] No new noisy logging added
- [ ] Polling failures stay bounded to local UI error state
- [ ] No hidden retry storm or unbounded interval creation
- [ ] Cleanup on unmount is explicit

# Done Criteria

- A reusable polling mechanism exists in FE
- Wallet summaries and lotto overview refresh periodically while their pages are open
- Dashboard polling remains active but avoids unnecessary repeated detail fetches
- Tests cover the new polling logic at the smallest meaningful unit
- FE build and targeted tests pass
