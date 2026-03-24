# Goal

Finish the frontend follow-up by:

- enforcing bounded mining auto-append behavior so large viewports do not trigger unbounded cursor loading
- reducing the wallet route payload with safe nested lazy loading after route-level splitting

# Scope

- Frontend only
- No mining API contract changes
- No backend or blockchain behavior changes
- No miner-control behavior

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/api.md`
- `docs/reviews/blockchain.md`
- `docs/result/fe-mining-ux-chunk-splitting-2026-03-21.md`

# Impacted Layers

- `FE-ssatto/src/hooks/useMiningBlocks.ts`
- `FE-ssatto/src/hooks/miningPaginationHelpers.ts`
- `FE-ssatto/src/components/mining/MinedBlocks.tsx`
- `FE-ssatto/src/pages/MiningPage.tsx`
- `FE-ssatto/src/pages/WalletPage.tsx`
- `FE-ssatto/vite.config.ts`

# Failure Points

- Auto-append may still refire repeatedly if the observer is not gated by a hard cap.
- Manual load behavior may break if auto/manual pathways are not separated.
- Nested lazy loading may introduce blank sections if local `Suspense` fallbacks are missing.
- Wallet route splitting may not materially improve chunk sizes if imports remain static.

# Implementation Steps

1. Add bounded auto-append helper logic with a fixed maximum auto-load count per wallet/page session.
2. Extend `useMiningBlocks` to distinguish manual append from auto append and expose UI state for auto-append exhaustion.
3. Update the mining widget to:
   - stop observer-driven loading after the cap is reached
   - show explicit Korean fallback copy
   - preserve manual “load more” as the recovery path
4. Lazy-load wallet page secondary sections and modals to reduce the wallet route chunk safely.
5. Run frontend tests and production build.
6. Re-run local compose validation because frontend build output changes.

# Test Checklist

- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`
- `docker compose --env-file .env.local -f docker-compose.local.yml config`
- `docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`
- `docker compose --env-file .env.local -f docker-compose.local.yml down`

# Observability Checklist

- Mining auto-append failure or exhaustion remains visible in UI without logs.
- First-page polling remains intact.
- Build output should show the wallet route moved into smaller nested chunks or a smaller wallet route chunk.

# Done Criteria

- Mining auto-append is bounded and no longer free-runs on large screens.
- Wallet route payload is reduced through safe lazy splitting.
- Frontend tests, build, and local compose validation all pass.
