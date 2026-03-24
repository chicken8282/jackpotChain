# Goal

Complete the frontend write flow so Wallet and Lotto screens can build client-signed transactions and submit them to backend write APIs without sending private keys to the server.

# Scope

- Frontend UTXO read adapter, transaction builder, and signer for exchange and lotto commit flows
- Frontend UI wiring for exchange, lotto commit, and claim-triggered flows where the chain contract supports them
- Backend read API support required for frontend transaction construction
- Focused tests for FE builder/orchestrator logic and BE read contract support

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/api.md`
- `docs/reviews/blockchain.md`
- `blockchain/docs/adr/ADR-001-claim-validation.md`

# Impacted Layers

- FE page/widget layer:
  - `FE-ssatto/src/pages/LottoPage.tsx`
  - `FE-ssatto/src/pages/WalletPage.tsx`
  - `FE-ssatto/src/components/lotto/HexPicker.tsx`
  - `FE-ssatto/src/components/wallet/WalletInfo.tsx`
- FE service/adapter layer:
  - `FE-ssatto/src/services/*`
  - `FE-ssatto/src/lib/crypto/*`
- BE API layer:
  - wallet or blockchain read endpoint for address-specific UTXO data
  - security allowlist for the new protected read path
- Optional blockchain alignment if claim flow is materially unsupported by current node behavior

# Failure Points

- FE cannot build a valid raw transaction because UTXO data is unavailable or incomplete
- FE signs against the wrong preimage or script format
- JACK/POT asset accounting diverges from JackpotChain rules
- UI treats uncertain submission results as success
- Claim flow is impossible because the active chain implementation does not support client-built claim transactions

# Implementation Steps

1. Add a backend read contract that exposes address-specific UTXO data needed for FE signing.
2. Add FE transaction primitives matching JackpotChain serialization, script, and sighash rules.
3. Implement FE exchange and lotto commit builders on top of unlocked private key and fetched UTXOs.
4. Wire Wallet and Lotto pages/components to async submit flows with Korean success/failure feedback.
5. Validate whether lotto claim is actually supported by the current blockchain implementation; implement if feasible in this scope, otherwise stop only after proving the incompatibility with code/tests.
6. Run FE and BE test/build verification and write a Korean result document.

# Test Checklist

- BE controller/service tests for the new UTXO read endpoint
- FE unit tests for:
  - UTXO selection
  - transaction serialization
  - scriptSig generation
  - exchange tx building
  - lotto commit tx building
  - write flow orchestration and error handling
- FE build passes after UI integration
- BE full test suite passes after the new endpoint/security changes

# Observability Checklist

- No request-entry `INFO` logging added
- Submission success logs remain only at business-completion points
- Backend read APIs stay quiet on normal polling/read paths
- Submission failures still surface as explicit BE/FE errors

# Done Criteria

- FE can submit signed exchange and lotto commit transactions using the unlocked local private key
- Private keys remain client-side only
- All new/changed FE and BE tests pass
- Any unsupported claim-chain mismatch is either fully implemented or proven with code-level evidence and documented precisely
