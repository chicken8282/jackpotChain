# Goal

Implement the API-driven FE/BE read flows for `wallet activities`, `lotto entries`, `lotto result`, and `mining blocks` based on `docs/reviews/api.md`, then verify FE/BE connectivity with `docker-compose.local.yml`.

# Scope

Included:

- Connect FE wallet activity UI to `GET /api/v1/wallet/{address}/activities`
- Connect FE lotto history UI to `GET /api/v1/lotto/entries`
- Connect FE lotto result detail UI to `GET /api/v1/lotto/entries/{commitHash}/result`
- Implement BE `GET /api/v1/mining/blocks`
- Connect FE mining page to `GET /api/v1/mining/blocks`
- Reuse the shared FE polling mechanism where the read path benefits from refresh
- Add focused BE and FE tests
- Run local compose-based smoke verification

Excluded:

- New write flows for lotto commit / claim
- WebSocket / SSE
- Blockchain consensus, miner execution, or private key handling changes

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/api.md`
- `docs/reviews/blockchain.md`

# Impacted Layers

- FE page layer
  - `FE-ssatto/src/pages/WalletPage.tsx`
  - `FE-ssatto/src/pages/LottoPage.tsx`
  - `FE-ssatto/src/pages/MiningPage.tsx`
- FE component layer
  - `FE-ssatto/src/components/wallet/ActivityList.tsx`
  - `FE-ssatto/src/components/lotto/HexPicker.tsx`
  - `FE-ssatto/src/components/mining/MinedBlocks.tsx`
- FE service / hook / adapter layer
  - `FE-ssatto/src/services/walletService.ts`
  - `FE-ssatto/src/services/lottoService.ts`
  - new mining service / hooks / mapping helpers
- BE mining module
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/mining/**`
- BE shared / persistence
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/repository/BlockRepository.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/SecurityConfig.java`
- Tests
  - mining service/controller/security tests
  - FE service/helper tests

# Failure Points

- FE history/mine views staying on mock data after API integration
- Polling overlap causing duplicate requests
- Token-protected APIs returning `401/403` and wiping the last known-good state
- Cursor pagination for activities / mined blocks returning duplicated or skipped items
- Mining read API accidentally crossing module boundaries or implying miner control
- Compose smoke verification failing due to empty local chain data or missing auth bootstrap

# Implementation Steps

1. Add/update the plan and lock assumptions
2. Write failing BE tests for `GET /api/v1/mining/blocks`
3. Implement BE mining DTO/controller/service/repository query support
4. Protect the mining read API in Spring Security and add/update security tests
5. Add FE service types for wallet activities, lotto entries/result, and mining blocks
6. Add FE mapping / formatting helpers and focused tests
7. Connect wallet activity UI to the wallet activities API
8. Connect lotto history/detail UI to lotto entries/result APIs
9. Connect mining page to the mining blocks API
10. Run targeted tests first, then broader FE/BE tests
11. Run `docker-compose.local.yml` smoke verification and capture results

# Test Checklist

- [ ] Mining service test fails first, then passes
- [ ] Mining controller test passes
- [ ] Protected API security test covers `/api/v1/mining/blocks`
- [ ] FE helper/service tests for new mappings pass
- [ ] Wallet page shows API-backed activities
- [ ] Lotto page shows API-backed entries and detail results
- [ ] Mining page shows API-backed mined blocks
- [ ] `docker-compose.local.yml` stack boots and health/smoke calls succeed within local-data limits

# Observability Checklist

- [ ] No `INFO` logs added for polling/query entry
- [ ] Mining read API logs only on meaningful business completion or infra failure
- [ ] FE polling failures remain locally bounded
- [ ] Cursor pagination has deterministic order and next-cursor rules
- [ ] No miner-control RPC or private key handling is introduced

# Done Criteria

- FE wallet, lotto, and mining read screens consume backend APIs instead of hard-coded placeholder history/mining data
- BE exposes `GET /api/v1/mining/blocks` according to the API review contract
- All touched contracts remain layer-aligned and protected by tests
- FE/BE local smoke verification through `docker-compose.local.yml` is recorded
