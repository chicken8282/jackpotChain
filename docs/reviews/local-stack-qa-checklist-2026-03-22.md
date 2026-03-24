# Local Stack QA Checklist

Reference plan: `docs/plans/local-compose-api-ui-qa-2026-03-22.md`

Stack under test:

- `/usr/local/bin/docker compose --env-file .env.local -f docker-compose.local.yml up -d --build`
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:18080/api/v1`
- Node RPC: `http://localhost:8332`

Result legend:

- `PASS`: executed and matched the expected behavior

| Scenario ID | Area | Check | Status | Notes |
|---|---|---|---|---|
| `FE-ROUTES` | Frontend | `/`, `/wallet`, `/lotto`, `/mining`, `/unknown-route` return the SPA shell | `PASS` | HTTP reachability verified through nginx |
| `API-DASHBOARD` | Public API | `GET /blockchain/dashboard` succeeds | `PASS` | Height returned successfully |
| `API-DASHBOARD-INVALID` | Public API | `GET /blockchain/dashboard?limit=0` rejects invalid limit | `PASS` | Returned `400` |
| `API-BLOCK-DETAIL` | Public API | `GET /blockchain/blocks/{height}` succeeds for the current tip height | `PASS` | Used live height from dashboard |
| `WALLET-CREATE` | Wallet | `POST /wallet` creates a new wallet and grants onboarding reward | `PASS` | Fresh wallet created during QA run |
| `AUTH-VERIFY` | Auth | `challenge -> verify` succeeds with client-side signing | `PASS` | Verified against a generated wallet |
| `AUTH-NEGATIVE-SHAPE` | Auth | malformed or stale verify attempts are rejected | `PASS` | Rejected with bounded error |
| `WALLET-ONBOARDING-UTXO` | Wallet / Lotto | onboarding reward exposes `1 POT` plus enough JACK fee buffer for immediate lotto commit | `PASS` | Fixed during this task |
| `SEC-UNAUTHORIZED` | Security | protected wallet read without bearer token returns `401` | `PASS` | `GET /wallet/{address}/utxos` |
| `SEC-FORBIDDEN` | Security | protected wallet read with mismatched wallet subject returns `403` | `PASS` | Cross-wallet access rejected |
| `API-WALLET-LIST` | Wallet | `GET /wallet?addresses=...` succeeds | `PASS` | Returned wallet summary |
| `API-WALLET-LIST-INVALID` | Wallet | empty wallet list query is rejected | `PASS` | Returned `400` |
| `API-WALLET-ACTIVITIES` | Wallet | `GET /wallet/{address}/activities` succeeds | `PASS` | Empty list accepted |
| `API-WALLET-ACTIVITIES-INVALID` | Wallet | invalid page size is rejected | `PASS` | `size=101` returned `400` |
| `API-LOTTO-OVERVIEW` | Lotto | `GET /lotto?address=...` succeeds after onboarding | `PASS` | Balance reflected immediately |
| `API-LOTTO-COMMIT` | Lotto | signed commit succeeds immediately after onboarding | `PASS` | Fixed during this task |
| `API-LOTTO-COMMIT-REPEAT` | Lotto / Abuse | same signed commit resent twice is bounded | `PASS` | Second request returned `503` from RPC failure path |
| `API-LOTTO-ENTRIES` | Lotto | `GET /lotto/entries?address=...` succeeds | `PASS` | Read path works |
| `API-LOTTO-RESULT-NEGATIVE` | Lotto | missing commit result lookup is rejected | `PASS` | Returned `404` |
| `API-LOTTO-CLAIM-NEGATIVE` | Lotto | invalid or missing claim target is rejected | `PASS` | Negative coverage only |
| `API-EXCHANGE-FORBIDDEN` | Exchange / Security | cross-wallet exchange info read is rejected | `PASS` | Returned `403` |
| `API-EXCHANGE-INFO` | Exchange | `GET /exchange/info?address=...` succeeds | `PASS` | Read path works |
| `API-EXCHANGE-INVALID` | Exchange | malformed exchange write request is rejected | `PASS` | Returned `400` |
| `API-MINING-BLOCKS` | Mining | `GET /mining/blocks?address=...` succeeds | `PASS` | Empty list accepted |
| `API-MINING-BLOCKS-INVALID` | Mining | invalid mining page size is rejected | `PASS` | `size=0` returned `400` |
| `AUTH-REFRESH-LOGOUT` | Auth | refresh rotates token, logout revokes session, refresh-after-logout fails | `PASS` | Post-logout refresh returned bounded failure |
| `WALLET-DUPLICATE-RESTORE` | Wallet | duplicate restore path returns `409` | `PASS` | Aligns with FE rollback logic |
| `API-EXCHANGE-SUCCESS` | Exchange | successful JACK -> POT write flow | `PASS` | Local-only `grantlocaljack` funding path produced an authenticated funded wallet for signed exchange QA |
| `API-LOTTO-CLAIM-CONTEXT` | Lotto | `GET /lotto/entries/{commitHash}/claim-context` returns chain-derived payout and pool inputs | `PASS` | Claim signing now uses backend-exposed chain context instead of node-direct pool discovery |
| `API-LOTTO-CLAIM-SUCCESS` | Lotto | successful claim for a mined and claimable entry | `PASS` | Local QA mined, indexed, and claimed a real winning entry through signed TX relay |
