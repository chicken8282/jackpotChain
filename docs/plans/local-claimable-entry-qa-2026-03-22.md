# Goal

Restore a production-aligned local QA path that can create a funded authenticated wallet, mine a confirmed lotto commit, wait until the result is on-chain at `N+18`, project that state into the backend read model, and successfully relay a client-signed `version=5` claim transaction through the backend.

# Scope

- Local-only QA funding support for authenticated wallets without storing private keys in the backend
- Manual lotto claim support on the blockchain node and validation path
- Chain-driven backend read-model synchronization for:
  - `GET /lotto/entries`
  - `GET /lotto/entries/{commitHash}/result`
- Positive local QA scenarios in `scripts/local_stack_qa.py`
- Checklist and result documentation updates

Out of scope:

- Adding a miner container to `docker-compose.local.yml`
- Backend-side miner orchestration
- Backend-side transaction signing or private key persistence
- Wide UI redesign unrelated to the local funding/claim verification objective

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/api.md`
- `docs/reviews/blockchain.md`
- `docs/reviews/erd.md`
- `docs/reviews/flow.md`
- `blockchain/docs/adr/ADR-001-claim-validation.md`
- `docs/reviews/local-stack-qa-checklist-2026-03-22.md`

# Impacted Layers

- Blockchain
  - `blockchain/bootstrap/local_onboarding_reward.py`
  - `blockchain/rpc/server.py`
  - `blockchain/validation/transaction.py`
  - `blockchain/script/standard.py`
  - `blockchain/consensus/chain.py`
  - `blockchain/gacha/service.py`
  - focused blockchain tests
- Backend
  - JackpotChain RPC adapter DTO/client extensions
  - lotto read/write service layer
  - blockchain read-model synchronization service
  - affected repositories/tests
- QA / Docs
  - `scripts/local_stack_qa.py`
  - `docs/reviews/local-stack-qa-checklist-2026-03-22.md`
  - `docs/result/local-claimable-entry-qa-2026-03-22.md`

# Failure Points

- The node still follows the old automatic payout path instead of manual signed claim
- Claim validation allows incorrect payout amounts or invalid claim timing
- Local QA funding leaks into non-local environments or bypasses auth boundaries
- Backend read models drift from chain reality because commit/result/claim indexing is incomplete
- New chain RPC shapes are not parsed safely by the backend adapter
- External miner synchronization is slow or flaky in local QA runs
- Duplicate or replay-like claim attempts are accepted before read-model synchronization catches up

# Implementation Steps

1. Add failing focused tests for:
   - local-only JACK funding RPC
   - manual claim transaction creation/validation
   - backend lotto read-model synchronization and claimability calculation
2. Replace the current automatic-payout-only lotto gap with a manual claim path on the node:
   - explicit claim script format
   - `version=5` transaction validation
   - claim result calculation from on-chain comparison blocks at `N+18`
   - local-only QA funding RPC from deterministic bootstrap funds
3. Extend blockchain RPC read methods so the backend can index confirmed commit/claim transactions from chain state.
4. Implement backend read-model synchronization from chain state:
   - commit block height
   - result numbers
   - match count
   - claimable status
   - mined claim transaction reflection
5. Update the local QA runner to:
   - fund a test wallet
   - execute positive exchange
   - start an external miner path
   - create a mined and claimable lotto entry
   - submit a client-signed claim tx through the backend
   - verify the resulting API projections
6. Rerun targeted tests, then the broader backend/blockchain/frontend verifications, then the full local QA runner.
7. Update checklist and result docs with exact commands and evidence.

# Test Checklist

- Blockchain focused tests
  - local-only JACK funding
  - manual claim timing validation
  - payout validation against on-chain comparison blocks
  - duplicate or invalid claim rejection
- Backend focused tests
  - lotto service result and claimability mapping
  - claim relay rejection for non-claimable entries
  - read-model synchronization behavior
- Local integration
  - `docker compose -f docker-compose.local.yml config`
  - `docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`
  - `python3 scripts/local_stack_qa.py`
- Regression
  - affected `./gradlew test` scope
  - affected `pytest` scope
  - affected frontend tests if the claim path contract changes

# Observability Checklist

- Record exact compose, test, and QA runner commands
- Capture node/backend logs for funding, commit, mining, and claim failures
- Keep chain-derived state explicit:
  - commit height
  - current height
  - comparison block heights
  - result digits
  - match count
  - claim tx id
- Ensure backend errors stay bounded and do not leak private or internal signing material
- Confirm local-only funding paths are clearly labeled and not enabled outside local QA

# Done Criteria

- A local authenticated wallet can be funded with at least `100 JACK` through a local-only QA path
- A lotto commit can be mined and become claimable based on on-chain state after `18` blocks
- `GET /lotto/entries` and `GET /lotto/entries/{commitHash}/result` reflect chain-derived result data
- A client-signed `version=5` claim transaction can be relayed through the backend and confirmed on-chain
- `python3 scripts/local_stack_qa.py` passes positive exchange and positive claim scenarios
- Documentation and checklist evidence are updated in Korean
