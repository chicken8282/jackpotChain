# Feature Overview

Stabilize the wallet-page add-wallet flow opened from the `+` button, prevent the post-submit page freeze/crash, and align the "new wallet" modal fields with the initial wallet onboarding create flow.

# User Story Or Business Goal

- As a returning user on the wallet page, I should be able to add a new wallet from the `+` button without the page becoming unresponsive after entering a password.
- As a user choosing the new-wallet path from the add modal, I should see the same essential create-wallet information as the initial onboarding flow, including generated address and private key.

# API Or Interface Contract

Existing contract remains unchanged:

- `WalletInfo` emits `onAddWallet(nickname, type, payload, color)`
- `WalletPage.persistWallet(...)` stores the keystore locally and calls the existing wallet registration flow

Required FE contract adjustments:

- Wallet add modal `create` mode must expose:
  - generated wallet address
  - generated private key
  - wallet password
  - password confirmation
- Wallet add modal submit must not force an invalid active wallet index before the parent store/state is updated.

# Business Rules And Constraints

- Private keys must remain frontend-only.
- The add-wallet modal must preserve the existing distinction:
  - `create`: generate a new wallet locally
  - `restore`: derive from user-provided private key
- The wallet page must remain render-safe even if transient state produces an out-of-range index.

# Dependencies

- `FE-ssatto/src/components/wallet/WalletInfo.tsx`
- `FE-ssatto/src/components/wallet/WalletCreate.tsx`
- `FE-ssatto/src/pages/WalletPage.tsx`
- existing wallet store/session store update flow

# Non-Functional Requirements

Scalability:

- No new global state should be introduced for modal-local form state.

Availability:

- A malformed or transient index must not make the wallet page unresponsive.

Reliability:

- Form validation must be explicit for create and restore modes.
- Modal close/reset behavior must leave no stale credentials or error state.

Performance:

- Avoid unnecessary rerenders or extra async work in the add-wallet flow.

# Goal

Make the wallet-page add-wallet modal safe to use and consistent with the first-visit wallet create experience.

# Scope

- Wallet add modal UX and state flow in `WalletInfo`
- Render-safety around active wallet selection on the wallet page
- Focused FE helper tests for add-wallet validation/payload generation

Out of scope:

- Backend/API changes
- Blockchain/RPC changes
- Wallet onboarding reward behavior beyond existing integration

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `FE-ssatto/src/components/wallet/WalletInfo.tsx`
- `FE-ssatto/src/components/wallet/WalletCreate.tsx`
- `FE-ssatto/src/pages/WalletPage.tsx`

# Impacted Layers

- FE component layer:
  - `FE-ssatto/src/components/wallet/WalletInfo.tsx`
  - optional new wallet add form helper
- FE page layer:
  - `FE-ssatto/src/pages/WalletPage.tsx`
- FE test layer:
  - new helper tests for modal submit validation and payload generation

# Failure Points

- `WalletInfo` sets an out-of-range index before the new wallet is present in `wallets`
- `activeWallet` becomes `undefined` and the page crashes during rerender
- `create` mode does not show generated address/private key, causing UX inconsistency
- modal state is not reset correctly when switching between `choose`, `create`, and `restore`

# Implementation Steps

1. Confirm the crash path in the current add-wallet modal and remove any eager index mutation that can point past the last valid wallet.
2. Add a render-safe fallback for active wallet/theme selection so transient invalid indices do not crash the page.
3. Refactor add-wallet modal state so `create` mode pre-generates credentials and displays address/private key like the initial onboarding flow.
4. Keep `restore` mode explicit and separate, with private key input plus password/password confirmation.
5. Extract the add-wallet validation/payload assembly into a small helper so FE tests can cover create/restore logic without full DOM rendering.
6. Run FE tests and build verification, then document results.

# Test Checklist

- FE helper tests:
  - create mode returns generated address/private key payload
  - restore mode derives credentials from user-entered private key
  - password too short fails validation
  - password confirmation mismatch fails validation
- FE verification:
  - wallet page build passes
  - wallet page no longer crashes when adding a new wallet
  - `+` modal create path shows generated address/private key plus password inputs

# Observability Checklist

- No new noisy logging
- Failures surface as existing FE modal/banner validation errors only

# Done Criteria

- The wallet page no longer becomes unresponsive after adding a wallet from the `+` modal.
- The add-wallet `create` flow displays generated address/private key and password fields like the initial onboarding flow.
- FE tests and production build pass.
