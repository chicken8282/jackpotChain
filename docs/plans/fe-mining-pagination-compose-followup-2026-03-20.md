# Goal

Complete the remaining follow-up after the wallet/lotto/mining read-flow work by adding FE cursor pagination for mining blocks and retrying `docker-compose.local.yml` smoke verification in the current environment.

# Scope

Included:

- Extend FE mining read flow to support cursor-based append / load-more
- Keep first-page mining polling active while preserving appended pages
- Add focused FE tests for mining pagination merge behavior
- Retry local compose smoke verification commands and record the outcome

Excluded:

- Backend mining contract changes unless a blocking issue is found
- New write flows
- Miner execution or control

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/api.md`
- `docs/reviews/blockchain.md`
- `docs/result/fe-be-wallet-lotto-mining-read-apis-2026-03-20.md`

# Impacted Layers

- FE hook layer
  - `FE-ssatto/src/hooks/useMiningBlocks.ts`
  - new mining pagination helper
- FE component/page layer
  - `FE-ssatto/src/components/mining/MinedBlocks.tsx`
  - `FE-ssatto/src/pages/MiningPage.tsx`
- FE service layer
  - `FE-ssatto/src/services/miningService.ts`
- Tests
  - new FE mining pagination helper test
- Infra verification
  - `docker-compose.local.yml`

# Failure Points

- Polling refresh overwriting or duplicating appended mining pages
- Load-more action issuing duplicate requests for the same cursor
- FE showing stale `hasNext` state after first-page refresh
- Compose smoke still blocked by environment limitations

# Implementation Steps

1. Add a mining pagination helper for dedupe/merge
2. Refactor `useMiningBlocks` to manage:
   - polled first page
   - appended pages
   - `hasNext`
   - `loadMore`
   - `isLoadingMore`
3. Update the mining UI to expose a Korean load-more action and local loading/error states
4. Add focused FE tests for merge/order behavior
5. Run FE tests and build
6. Retry compose config/up smoke commands and record the exact outcome

# Test Checklist

- [ ] Mining pagination helper test passes
- [ ] FE full test suite passes
- [ ] FE build passes
- [ ] Mining page keeps first-page polling while allowing manual append
- [ ] Compose config command re-run is recorded
- [ ] Compose up command re-run is recorded

# Observability Checklist

- [ ] No noisy polling logs added
- [ ] Load-more failure remains bounded to local UI state
- [ ] Appended page merge is deterministic and deduplicated by block ID
- [ ] Compose verification outcome is captured exactly

# Done Criteria

- Mining page supports cursor-based append without losing first-page polling
- FE tests/build pass after the mining pagination change
- Compose smoke commands are retried and documented with exact results
