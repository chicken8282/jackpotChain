# Goal

Improve the frontend follow-up after mining cursor pagination by:

- making the mining block pagination UX feel less manual while preserving first-page polling
- reducing the frontend production main-chunk warning through safe code splitting

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
- `docs/result/fe-mining-pagination-compose-followup-2026-03-20.md`

# Impacted Layers

- `FE-ssatto/src/pages/MiningPage.tsx`
- `FE-ssatto/src/components/mining/MinedBlocks.tsx`
- `FE-ssatto/src/hooks/useMiningBlocks.ts`
- `FE-ssatto/src/hooks/miningPaginationHelpers.ts`
- `FE-ssatto/src/App.tsx`
- `FE-ssatto/vite.config.ts`

# Failure Points

- Auto-append may refire too often when the sentinel remains visible.
- Polling refresh and appended pages may produce duplicates or unstable pagination state.
- Lazy-loaded routes may show a blank state if Suspense fallback is missing.
- Manual chunking may break build output if dependency groups are configured incorrectly.
- Chunk warning may remain if only vendor splitting is applied without route-level splitting.

# Implementation Steps

1. Add a small mining pagination UX layer that supports:
   - auto-loading older mined blocks when the footer sentinel enters view
   - manual retry fallback
   - “back to latest” interaction after older pages are appended
   - lightweight pagination status copy in Korean
2. Extend `useMiningBlocks` to expose only the additional FE state needed by the mining widget while preserving first-page polling.
3. Split page routes with `React.lazy` + `Suspense` so page bundles can be loaded on demand.
4. Add conservative Vite manual chunking for stable large dependencies.
5. Validate with frontend tests and production build.
6. Re-run compose validation only if the route/build config change affects the container build.

# Test Checklist

- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`
- If build config changes affect the Docker image:
  - `docker compose --env-file .env.local -f docker-compose.local.yml config`
  - `docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`

# Observability Checklist

- No extra polling logs
- Error UI remains explicit for mining read failures
- Loading state is visible for both initial load and appended-page load
- Build output should show reduced main entry chunk size or at minimum move the warning off the single app entry

# Done Criteria

- Mining page supports automatic append assistance and clearer pagination feedback without breaking polling of the newest page
- The frontend build no longer emits the previous single main-chunk warning pattern, or the bundle is materially split into route/vendor chunks with a clear verification result
- Frontend tests and build pass
- Result documentation is written in Korean
