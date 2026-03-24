# Goal

Stabilize wallet tab re-entry after multiple wallet registrations and make the onboarding `1 POT` reward immediately visible and usable after wallet creation.

# Scope

- Reproduce and fix the wallet page failure that appears after creating multiple wallets, navigating to other tabs, and returning to `/wallet`
- Ensure the onboarding reward path remains correct across frontend, backend, and blockchain RPC boundaries
- Make the reward visible to wallet summary and write flows without waiting for block confirmation
- Add focused tests first, then broader regression verification

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/blockchain.md`

# Impacted Layers

- Frontend page/state:
  - `FE-ssatto/src/pages/WalletPage.tsx`
  - `FE-ssatto/src/stores/useWalletStore.ts`
  - `FE-ssatto/src/components/wallet/WalletInfo.tsx`
- Frontend service/adapter:
  - `FE-ssatto/src/services/walletService.ts`
  - `FE-ssatto/src/services/writeFlowService.ts`
- Backend use case / API boundary:
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/controller/WalletController.java`
  - wallet DTOs if the response contract must surface unconfirmed state
- Blockchain RPC / read model:
  - `blockchain/rpc/server.py`

# Failure Points

- Wallet session restore updates existing wallet metadata by reordering the wallet array, which can desynchronize `activeAddress` and `activeWalletIndex` and trigger repeated session-restore thrashing
- Returning to the wallet page can repeatedly authenticate different wallets if wallet order is mutated during restore
- Onboarding reward may be successfully added to mempool but remain invisible because `getbalances` and `listunspent` only read confirmed UTXOs
- Reward outputs may be double-counted if unconfirmed outputs are merged without excluding mempool-spent entries
- RPC failure must never be reported as reward success
- Local compose validation is required by the task, but current execution environment may not expose `docker`; this must be documented as an environment constraint if reproduction remains blocked here

# Implementation Steps

1. Add failing tests for frontend wallet store/session stability.
2. Add failing blockchain tests showing that onboarding reward mempool outputs are not yet visible in balance/UTXO reads.
3. Fix frontend wallet state updates so existing wallet updates preserve order and do not trigger unnecessary active-wallet churn.
4. Tighten wallet page session-restore updates so refresh-session metadata is only written when it actually changes.
5. Extend blockchain RPC read methods to include eligible unconfirmed mempool outputs for the requested address.
6. Confirm backend wallet summary/UTXO flows already benefit from the updated RPC contract or adjust mapping if required.
7. Run focused tests first, then broader FE/BE/blockchain verification.
8. Record implementation details, environment constraints, and remaining risks in the result document.

# Test Checklist

- Frontend
  - wallet store preserves existing wallet order on metadata updates
  - wallet page/session logic does not churn active wallet state across repeated restore responses
- Blockchain
  - `grantonboardingreward` result becomes visible in `getbalances`
  - `grantonboardingreward` result becomes visible in `listunspent`
  - unconfirmed reward outputs already spent inside mempool are not exposed as spendable
- Backend
  - wallet service onboarding reward tests still pass
  - RPC client parsing tests still pass after read-model changes

# Observability Checklist

- Keep backend RPC failure logging unchanged and explicit
- Preserve bounded failure: reward RPC error must surface as wallet creation failure, not partial success
- Document inability to run `docker compose` in this shell if the binary remains unavailable
- Ensure the result document clearly separates code-level verification from environment-dependent manual verification

# Done Criteria

- Wallet page no longer enters the failing state when multiple wallets exist and wallet metadata is refreshed
- Newly created wallets show onboarding `1 POT` immediately in summary/UTXO-based flows and can proceed to lottery participation without waiting for block confirmation
- Focused FE and blockchain tests pass
- Broader FE/BE/blockchain verification passes
- Result document is written in Korean with exact commands, failures, risks, and next-fix prompt if anything remains unresolved
