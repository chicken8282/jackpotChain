# Overview

- Completed the frontend storage-security transition for wallet custody.
- Removed plain private keys from the persisted Zustand wallet store.
- Added encrypted IndexedDB keystore storage using PBKDF2-HMAC-SHA256 and AES-256-GCM.
- Split wallet metadata state from in-memory auth/session state.
- Added unlock/lock UX, idle auto-lock, and legacy wallet migration support.

# File & Class Change Log

- `docs/plans/fe-storage-security.md`
  - Added implementation plan and done criteria for the storage-security phase.
- `FE-ssatto/package.json`
  - Added `fake-indexeddb` for repository tests.
- `FE-ssatto/src/lib/crypto/encryption.ts`
  - Added keystore encryption/decryption utilities.
- `FE-ssatto/src/lib/crypto/encryption.test.ts`
  - Added encryption round-trip and wrong-password tests.
- `FE-ssatto/src/services/keystoreRepository.ts`
  - Added IndexedDB keystore repository.
- `FE-ssatto/src/services/keystoreRepository.test.ts`
  - Added IndexedDB save/load tests.
- `FE-ssatto/src/services/legacyWalletMigrationService.ts`
  - Added legacy persisted wallet parsing, backup, restore, and cleanup helpers.
- `FE-ssatto/src/services/legacyWalletMigrationService.test.ts`
  - Added migration helper tests.
- `FE-ssatto/src/services/walletSecurityService.ts`
  - Added secure wallet save, unlock, and legacy migration orchestration.
- `FE-ssatto/src/stores/useWalletStore.ts`
  - Replaced v1 plain-key store with v2 metadata-only persisted store.
- `FE-ssatto/src/stores/useWalletSessionStore.ts`
  - Added in-memory token/unlocked-key session store with idle auto-lock.
- `FE-ssatto/src/components/wallet/WalletCreate.tsx`
  - Added password-based create/restore flow.
- `FE-ssatto/src/components/wallet/WalletInfo.tsx`
  - Added password-based add-wallet flow.
- `FE-ssatto/src/components/wallet/WalletUnlockModal.tsx`
  - Added unlock modal for active wallet signing.
- `FE-ssatto/src/components/wallet/WalletMigrationModal.tsx`
  - Added legacy wallet upgrade modal.
- `FE-ssatto/src/pages/WalletPage.tsx`
  - Rewired wallet page to secure keystore storage, unlock gating, migration flow, and session store usage.

# Cross-Layer Impact Summary

- Frontend only.
- No backend API contract changed.
- Existing backend challenge/verify endpoints were reused.
- Blockchain signing custody remained client-side, aligned with `docs/reviews/blockchain.md`.

# Implemented Changes

- Added encrypted keystore persistence in IndexedDB.
- Persisted wallet state now stores only:
  - `walletId`
  - `keystoreId`
  - `nickname`
  - `address`
  - `walletColor`
- Token and unlocked private keys moved into a separate in-memory Zustand store.
- Active wallet authentication now happens only after unlock.
- Added idle auto-lock after 5 minutes of inactivity.
- Added legacy wallet migration:
  - detect old plain-key localStorage payload
  - require password-driven upgrade
  - create encrypted keystores
  - keep backup/retry path until migration succeeds
  - remove legacy payload and backup after success

# Tests Run

- `cd FE-ssatto && npm test`
  - Initial failure
  - failed tests:
    - `src/lib/crypto/encryption.test.ts`
    - `src/services/keystoreRepository.test.ts`
    - `src/services/legacyWalletMigrationService.test.ts`
  - failure symptoms/messages:
    - missing module errors for `./encryption`, `./keystoreRepository`, and `./legacyWalletMigrationService`
  - reproducible or environment-dependent:
    - reproducible locally

- `cd FE-ssatto && npm test`
  - Final pass
  - passed tests:
    - `src/lib/crypto/encryption.test.ts`
    - `src/lib/crypto/wallet.test.ts`
    - `src/services/keystoreRepository.test.ts`
    - `src/services/legacyWalletMigrationService.test.ts`
    - `src/services/walletAuthFlowService.test.ts`
  - failed tests:
    - none
  - reproducible or environment-dependent:
    - reproducible locally

- `cd FE-ssatto && npm run build`
  - Intermediate failure
  - failed tests:
    - TypeScript build
  - failure symptoms/messages:
    - `BufferSource` typing mismatch in `src/lib/crypto/encryption.ts` when passing `Uint8Array` into Web Crypto APIs
  - reproducible or environment-dependent:
    - reproducible locally

- `cd FE-ssatto && npm run build`
  - Final pass
  - passed tests:
    - TypeScript build
    - Vite production build
  - failed tests:
    - none
  - failure symptoms/messages:
    - bundle chunk size warning only
  - reproducible or environment-dependent:
    - reproducible locally

- `cd BE-ssatto && ./gradlew test --tests 'ssatto.BE_ssatto.domain.auth.controller.AuthControllerTest' --tests 'ssatto.BE_ssatto.domain.auth.service.AuthServiceTest'`
  - Final pass
  - passed tests:
    - `AuthControllerTest`
    - `AuthServiceTest`
  - failed tests:
    - none
  - reproducible or environment-dependent:
    - reproducible locally

# Failed Tests / Unresolved Issues

- Final failing tests:
  - none

- Remaining unresolved issue:
  - what was tested:
    - legacy wallet migration path, secure keystore storage, unlock-gated authentication
  - why it failed:
    - not a failing test, but there is a transitional runtime risk before a legacy user completes migration
  - suspected root cause:
    - old plain-key localStorage data must remain available until the user finishes password-based migration
  - impact scope:
    - existing browsers that still hold the old `ssatto-wallet-session` payload
  - what should be improved next:
    - complete refresh-token/session-restoration work so users do not need immediate re-unlock after every reload

# Risks / Assumptions

- Assumed a per-wallet password flow is acceptable for this phase.
- Assumed a 5-minute global idle timeout is acceptable until product requirements define a different timeout.
- Legacy plain-key payload is removed only after a successful migration. Existing users must complete the upgrade modal to reach the fully secure steady state.
- Access token persistence was intentionally removed from persisted storage as part of metadata/session separation.

# Next Steps

- Implement refresh-token based session restoration.
- Support wallet-by-wallet reopen/switch logic using refresh before requiring unlock.
- Add cross-stack golden fixtures for FE/BE/blockchain parity on address and signature verification.

# Prompt for Next Fix

`Read AGENTS.md, docs/specs/frontend-spec.md, docs/specs/backend-spec.md, docs/specs/infra-spec.md, docs/reviews/auth.md, and docs/plans/be-fe_auth.md first.

Task:
Implement the next authentication phase: refresh-token based wallet session restoration and protected-resource enforcement. Keep the current encrypted IndexedDB keystore flow intact and make reopen/switch work without forcing an unlock every time when a valid refresh session exists.

Likely files/layers involved:
- BE-ssatto auth controller/service/session persistence/security config
- FE-ssatto wallet page/session store/auth service
- FE-ssatto unlock and wallet-switch UX

Current failing behavior:
- Wallet metadata is secure now, but app reload still requires unlock because there is no refresh-session restore path.

Suspected cause:
- Access token is intentionally in-memory only and refresh/logout/session APIs are not implemented yet.

Required fixes:
- Add `/api/v1/auth/refresh`
- Add `/api/v1/auth/logout`
- Add refresh token rotation and wallet-scoped session persistence
- Rework FE reopen/switch flow to try refresh first, then unlock + challenge only when needed
- Apply protected-resource JWT enforcement in backend security configuration

Tests that must pass:
- Backend auth controller/service tests for refresh/logout/session failure modes
- FE wallet session restore tests
- `cd BE-ssatto && ./gradlew test`
- `cd FE-ssatto && npm test`
- `cd FE-ssatto && npm run build`

Remaining spec constraints:
- Frontend user-facing text must stay in Korean
- Backend must never store private keys
- Signing stays client-side
- Controller/service/repository boundaries must remain clear`
