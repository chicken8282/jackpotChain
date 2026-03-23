# Goal

Eliminate wallet-create error banners after a new wallet is added, ensure the onboarding `1 POT` reward is actually available in the local stack, and define a complete local QA/QC checklist for the wallet-create and wallet-usage flow.

# Scope

- Fix the create-wallet flow so local wallet state and backend wallet metadata do not diverge when registration fails
- Fix the local onboarding reward path so the local node can actually serve the `1 POT` reward path
- Preserve wallet/auth/read-model boundaries across frontend, backend, and blockchain RPC layers
- Produce a local QA/QC checklist that covers wallet creation, reward visibility, auth/session recovery, tab navigation, and wallet actions
- Attempt local compose validation and document any environment limitations if compose cannot run in this shell

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/blockchain.md`

# Impacted Layers

- Frontend page/state/service:
  - `FE-ssatto/src/pages/WalletPage.tsx`
  - `FE-ssatto/src/services/walletSecurityService.ts`
  - `FE-ssatto/src/services/keystoreRepository.ts`
  - new wallet registration flow helper if needed
- Frontend polling/read models:
  - `FE-ssatto/src/hooks/useWalletSummaries.ts`
  - `FE-ssatto/src/hooks/useWalletActivities.ts`
- Backend wallet use case:
  - `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
  - related DTOs only if the contract must change
- Blockchain local bootstrap / RPC:
  - `blockchain/rpc/server.py`
  - `blockchain/cli/main.py`
  - `blockchain/entrypoint.sh`
  - optional new local bootstrap helper module
- Infra:
  - `.env.local`
  - `docker-compose.local.yml`

# Failure Points

- Frontend can persist a local keystore and wallet store entry before backend registration succeeds, creating an orphan wallet that causes:
  - `지갑 정보를 찾을 수 없습니다.`
  - auth challenge failure for a wallet unknown to the backend
- Local onboarding reward RPC can fail because the observer node wallet lacks spendable JACK for relay fee payment
- Wallet summary, auth, and activity polling can repeatedly surface secondary errors after the initial create failure
- Local compose verification may be blocked by missing `docker` in the current shell

# Implementation Steps

1. Add failing frontend tests for wallet-create rollback/commit behavior.
2. Add failing blockchain tests for local onboarding reward bootstrap behavior.
3. Introduce a frontend registration flow helper that stages local keystore writes and rolls them back if backend registration fails.
4. Update wallet page create/restore flow to use the helper and only commit local wallet UI state after a successful backend outcome or an allowed restore duplicate case.
5. Add a local-only node bootstrap mechanism so the observer wallet has deterministic JACK available for onboarding reward fees in local development.
6. Keep the existing onboarding reward visibility logic intact so summary and UTXO reads reflect the reward immediately.
7. Run focused tests first, then broader FE/BE/blockchain verification.
8. Attempt compose validation commands and capture the exact outcome.

# Test Checklist

## Test-First Items

- Frontend
  - create flow rolls back newly created keystore when backend registration fails
  - restore duplicate path keeps local wallet material and does not rollback
- Blockchain
  - local bootstrap helper injects or prepares deterministic fee funding for onboarding reward
  - local bootstrap helper is idempotent

## Local QA/QC Checklist

- Compose/Infra
  - `docker compose -f docker-compose.local.yml config`
  - `docker compose -f docker-compose.local.yml up -d`
  - frontend health reachable on `http://localhost:3000`
  - backend health reachable on `http://localhost:18080/actuator/health`
  - node RPC `getblockcount` reachable on `http://localhost:8332`
- First wallet creation
  - first visit shows wallet create screen
  - create wallet succeeds without red error banners
  - created wallet is visible in wallet carousel
  - wallet summary shows `1 POT`
  - success message is shown in Korean
- Additional wallet creation
  - `+` create wallet flow succeeds repeatedly
  - no `지갑 정보를 찾을 수 없습니다.` banner appears
  - no `블록체인 RPC 호출에 실패했습니다.` banner appears
  - new wallet appears with correct nickname/address
- Tab navigation
  - create 2 or more wallets
  - move to `대시보드`
  - move to `로또`
  - move to `채굴`
  - return to `지갑`
  - wallet page remains responsive and no error banner appears
- Auth/session
  - unlocked wallet shows unlocked banner
  - explicit lock works
  - unlock works again with password
  - returning to wallet tab restores session without wallet churn
- Write flow readiness
  - newly created wallet with `1 POT` can proceed to lotto entry path
  - UTXO fetch for the newly created wallet returns a spendable POT output
- Failure handling
  - if backend registration fails, wallet is not left behind as a broken local-only card
  - repeated retry after failure does not create duplicate broken state

# Observability Checklist

- Keep backend RPC failure logging explicit and unchanged
- Surface create-flow failure to the user with bounded Korean messages
- Keep local bootstrap behavior explicit and local-only, not hidden as production behavior
- Record compose command outcomes exactly in the result document

# Done Criteria

- New wallet creation no longer leaves the UI in a broken orphan-wallet state
- Local onboarding reward path can succeed in the local development stack
- Wallet summary and UTXO flow show `1 POT` immediately after create
- Focused frontend and blockchain tests pass
- Broader FE/BE/blockchain validation passes
- Result document is written in Korean with exact commands, failures, residual risks, and a next-fix prompt if anything remains unresolved
