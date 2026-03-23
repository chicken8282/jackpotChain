# Goal

Move frontend wallet custody from plain persisted private keys to encrypted IndexedDB keystore storage while preserving wallet create, restore, switch, and challenge-sign-verify authentication.

# Scope

- Frontend wallet metadata store redesign
- IndexedDB keystore repository
- PBKDF2-HMAC-SHA256 + AES-256-GCM encryption
- Unlock / lock UX
- In-memory decrypted key lifecycle
- Legacy localStorage migration from v1 to v2
- Frontend tests for encryption, repository, and migration

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/blockchain.md`
- `docs/plans/be-fe_auth.md`

# Impacted Layers

- Frontend page composition
- Frontend wallet components
- Frontend state stores
- Frontend crypto utilities
- Frontend persistence/repository layer

# Failure Points

- Wrong password during unlock or migration
- IndexedDB write/read failure
- Partial migration leaving legacy data uncleared
- In-memory key not cleared after idle timeout
- Active wallet switch while locked

# Implementation Steps

1. Add wallet security plan and define v2 metadata/session model.
2. Add tests for encryption round-trip, IndexedDB keystore repository, and legacy migration helpers.
3. Implement AES-GCM keystore encryption and IndexedDB repository.
4. Split persisted wallet metadata store from in-memory auth/session store.
5. Implement legacy migration service with backup/retry handling.
6. Update create/restore/add-wallet flows to require a wallet password and save encrypted keystores.
7. Add unlock/lock UX and idle auto-lock behavior.
8. Update wallet authentication flow to sign only after unlock.
9. Run focused tests, build, and auth contract verification.

# Test Checklist

- [ ] Encryption round-trip test
- [ ] Wrong password failure test
- [ ] Keystore repository save/load test
- [ ] Legacy migration parse/backup/cleanup test
- [ ] Existing FE crypto parity test
- [ ] Existing challenge-sign-verify flow test
- [ ] Frontend production build

# Observability Checklist

- [ ] UI exposes locked/unlocked/auth failure states clearly
- [ ] Migration failure shows actionable Korean error text
- [ ] Idle lock behavior is user-visible

# Done Criteria

- [ ] Plain private key is removed from persisted Zustand store
- [ ] Private key is stored only as encrypted keystore in IndexedDB
- [ ] Create / restore / switch flows continue to work
- [ ] Unlock is required before signing
- [ ] Legacy migration path exists with retry handling
- [ ] Result document is written
