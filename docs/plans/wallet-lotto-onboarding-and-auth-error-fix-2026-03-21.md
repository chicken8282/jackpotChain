# Feature Overview

Improve the wallet-to-lotto onboarding flow so first-time users are guided to create a wallet before entering the lotto flow, receive an initial `1 POT` after wallet creation, and no longer see an unexplained raw `Failed to fetch` banner after wallet registration.

# User Story Or Business Goal

- As a first-time visitor without a registered wallet, I should be blocked from starting lotto participation and be redirected to wallet creation with a clear modal message.
- As a newly onboarded wallet owner, I should receive `1 POT` immediately so I can participate in lotto without a separate exchange step.
- As a user on the wallet page, I should understand the meaning of the status banners and see actionable, domain-specific errors instead of transport-layer raw text.

# API Or Interface Contract

Existing relevant contracts:

- `POST /api/v1/wallet`
  - Registers wallet metadata only.
- `POST /api/v1/auth/challenge`
- `POST /api/v1/auth/verify`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/wallet?addresses=...`
- `GET /api/v1/wallet/{address}/activities`
- `GET /api/v1/wallet/{address}/utxos`

Required contract changes for this feature:

- FE lotto entry CTA contract:
  - When no registered wallet exists, clicking the lotto participation CTA must open a blocking modal with Korean copy equivalent to `지갑을 먼저 생성해주세요`.
  - Confirm action must navigate to `/wallet`.
- Wallet creation completion contract:
  - New wallet creation must trigger an onboarding reward flow that results in `1 POT` being visible in wallet summary and lotto overview without manual exchange.
- Error presentation contract:
  - Wallet page transport failures during auth/session recovery must map to a stable user-facing message, not raw browser text.
  - Status banners must expose explicit meaning through copy or labels.

# Business Rules And Constraints

- Lotto participation requires a registered wallet and a usable authenticated wallet session.
- The onboarding reward must be granted once per newly created wallet, and duplicate reward issuance must be prevented under retry or refresh.
- Reward issuance must not require the frontend to hold privileged minting logic.
- Existing restore-wallet flow must be evaluated separately from create-wallet flow; the reward should not be silently granted to arbitrary restored wallets unless the business explicitly allows it.
- Failure to grant the initial `1 POT` must be bounded:
  - wallet registration should not leave the user in an ambiguous success state
  - duplicate grants must be impossible or harmless
  - partial completion must be observable

# Dependencies

- FE routing and wallet/lotto page components in `FE-ssatto`
- BE wallet and auth APIs in `BE-ssatto`
- JackpotChain RPC capabilities for asset issuance or a server-controlled onboarding mechanism
- Existing wallet session recovery flow
- Existing polling-based wallet summary and lotto overview refresh

# Non-Functional Requirements

Scalability:

- Onboarding reward logic must be idempotent and safe under repeated client retries.
- No unbounded polling or repeated reward calls per render.

Availability:

- Lotto page should degrade to guided navigation rather than failing silently when no wallet exists.
- Reward issuance failure should produce a bounded, recoverable state with retry or supportable diagnostics.

Reliability:

- Wallet-created and reward-issued states must be distinguishable.
- Error handling must avoid raw transport messages and preserve user-safe diagnostics.

Performance:

- Do not introduce extra polling loops beyond existing summary/overview refresh.
- Reward completion should rely on existing refresh paths where possible instead of heavy page reloads.

# Goal

Define a production-safe implementation plan for wallet-first lotto onboarding, first-wallet `1 POT` reward issuance, and wallet-page auth/banner error remediation.

# Scope

- FE gating for lotto entry when no wallet is registered
- FE modal and redirect UX for wallet-first onboarding
- FE wallet-page banner clarification and error-message normalization
- BE or blockchain-side onboarding reward design for `1 POT`
- Root-cause analysis and remediation plan for the wallet-page `Failed to fetch` banner after wallet creation

Out of scope unless required by the chosen reward design:

- Broad wallet-page visual redesign
- Changes to unrelated mining or dashboard flows
- New real-time transport such as WebSocket/SSE

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docker-compose.local.yml`
- `FE-ssatto/src/pages/LottoPage.tsx`
- `FE-ssatto/src/pages/WalletPage.tsx`
- `FE-ssatto/src/components/wallet/WalletCreate.tsx`
- `FE-ssatto/src/services/walletSessionService.ts`
- `FE-ssatto/src/services/walletAuthFlowService.ts`
- `FE-ssatto/src/lib/api.ts`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`
- `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/controller/WalletController.java`

# Impacted Layers

- FE page layer:
  - `FE-ssatto/src/pages/LottoPage.tsx`
  - `FE-ssatto/src/pages/WalletPage.tsx`
- FE component layer:
  - `FE-ssatto/src/components/lotto/HexPicker.tsx`
  - `FE-ssatto/src/components/wallet/WalletCreate.tsx`
  - wallet modal/banner components or new shared modal if introduced
- FE service/state layer:
  - `FE-ssatto/src/services/walletSessionService.ts`
  - `FE-ssatto/src/services/walletAuthFlowService.ts`
  - `FE-ssatto/src/lib/api.ts`
  - wallet state stores if onboarding state needs explicit tracking
- BE wallet/auth layer:
  - `WalletController`
  - `WalletService`
  - possible new onboarding reward service/controller if minting must be isolated
- Blockchain/RPC integration layer:
  - only if current backend lacks a safe way to grant `1 POT`

# Failure Points

- FE only blocks the button visually but still allows lotto write calls through other paths.
- Redirect-to-wallet happens without preserving user intent or explanatory context.
- New wallet registration succeeds but onboarding reward fails, leaving zero `POT`.
- Retry or refresh grants multiple `1 POT` rewards to the same wallet.
- Restored wallets accidentally receive onboarding rewards that were intended only for fresh wallet creation.
- Auth recovery still throws transport-layer errors that appear as raw `Failed to fetch`.
- Runtime root cause is misdiagnosed because local container logs were not accessible from this shell session.

# Implementation Steps

1. Document the exact first-time user flow:
   - no wallet -> click lotto CTA -> onboarding modal -> navigate to wallet page
   - create wallet -> auto-auth/session recovery -> onboarding reward -> summary/lotto overview refresh -> immediate participation
2. Refactor lotto entry gating so the primary participation CTA, not only write handlers, checks for wallet existence and shows a dedicated modal with a redirect action.
3. Clarify wallet-page status banners:
   - unlocked-memory banner meaning: wallet private key is unlocked in memory and will auto-lock after idle timeout
   - error banner meaning: wallet auth/session recovery failed
   - add stable copy so the user understands each state without reading raw implementation text
4. Normalize transport failures in FE auth/session flows:
   - map browser/network exceptions such as `Failed to fetch` to a domain-safe message
   - keep detailed diagnostics in logs/devtools, not in the primary UI banner
5. Design the `1 POT` onboarding reward mechanism before coding:
   - preferred approach: backend-controlled one-time onboarding issuance with idempotency protection
   - rejected approach: FE-only balance mutation, because it is not authoritative or reliable
   - evaluate whether current JackpotChain RPC supports safe issuance; if not, define the minimal backend/blockchain extension
6. Introduce persistence for one-time reward issuance:
   - record reward-granted state server-side per wallet
   - enforce exactly-once or safely repeatable semantics under retry
7. Update wallet creation completion flow so reward issuance and post-create refresh occur in a controlled sequence.
8. Add focused FE and BE tests for gating, redirect, auth error mapping, reward issuance, and duplicate prevention.
9. Verify the full local compose flow and capture a result document after implementation.

# Test Checklist

- FE unit/component tests:
  - lotto CTA opens modal when no wallet exists
  - modal confirm navigates to `/wallet`
  - wallet creation success path triggers onboarding follow-up flow
  - raw transport error is mapped to a stable Korean error message
  - status banner copy renders expected meaning for locked/unlocked/auth-failed states
- BE tests:
  - wallet creation plus onboarding reward success path
  - duplicate request does not issue multiple `1 POT` rewards
  - restored wallet behavior matches the approved business rule
  - failure-path coverage when reward issuance or RPC submission fails
- Integration/local verification:
  - first-time visit can reach wallet creation from lotto screen
  - immediately after create, wallet shows `1 POT`
  - lotto participation becomes available without manual exchange
  - no raw `Failed to fetch` banner is shown in the wallet page flow

# Observability Checklist

- Emit a bounded business event for onboarding reward success/failure with wallet identifier context and no secret leakage.
- Keep request-entry logs quiet; log only completion or failure boundaries.
- Preserve actionable backend diagnostics for reward issuance and auth-session recovery failures.
- Ensure FE surfaces stable user messages while runtime details remain inspectable in network/log tooling.

# Done Criteria

- First-time users cannot proceed into lotto participation without a registered wallet and are guided to wallet creation through a modal.
- New wallet creation results in exactly one visible `1 POT` onboarding reward under the approved business rule.
- Wallet page no longer exposes raw `Failed to fetch` to users for auth/session transport failures.
- Status banners clearly communicate their meaning.
- FE and BE validation pass, and the local compose flow is manually verified.

# Current Findings And Assumptions

- The top gray banner in the screenshot is rendered by `WalletPage` and indicates that the active wallet is currently unlocked in memory and will auto-lock after `WALLET_IDLE_LOCK_MS`.
- The red banner is also rendered by `WalletPage` through `authError`, which is set during wallet session recovery after wallet creation.
- Based on code inspection, the most likely failing path is:
  - wallet creation stores and unlocks the wallet locally
  - `WalletPage` triggers `restoreWalletSession(...)`
  - because the new wallet has no refresh handle yet, the flow falls back to `loginWithWallet(...)`
  - a browser/network exception from `/api/v1/auth/challenge` or `/api/v1/auth/verify` is surfaced directly as `Failed to fetch`
- This shell session could not access `docker` CLI or the local mapped ports, so the runtime cause still needs confirmation against browser network logs and container logs during implementation.
