# Goal

Bring up the local stack with `/usr/local/bin/docker` and verify the user-facing wallet, onboarding reward, lotto, exchange, dashboard, and mining flows end to end. Build an executable QA/QC checklist from `docs/reviews/api.md` and current frontend routes, fix concrete failures, and rerun until the targeted scenarios pass.

# Scope

- Static and runtime validation of `docker-compose.local.yml`
- Local container bring-up and health verification
- API contract checks for active endpoints in `docs/reviews/api.md`
- Frontend-accessible action checks for `/`, `/wallet`, `/lotto`, and `/mining`
- Abuse and security-oriented checks such as repeated submissions, invalid query/path/body values, and authorization mismatch attempts
- Minimal code changes required to restore contract alignment or runtime stability
- Result and checklist documentation

Out of scope:

- Production deployment changes
- New feature design beyond restoring intended current behavior
- Server-side mining orchestration, private key persistence, or non-local infrastructure changes

# Reference Specs

- `AGENTS.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/api.md`
- `docs/reviews/blockchain.md`
- `blockchain/docs/adr/ADR-001-claim-validation.md` when claim or validation logic changes

# Impacted Layers

- Infra:
  - `docker-compose.local.yml`
  - `.env.local`
  - service Dockerfiles and nginx proxy config
- Frontend:
  - route pages, wallet/auth/write services, hooks, stores, and UI error/status banners
- Backend:
  - controllers, services, DTOs, security filters, RPC adapter, config, and persistence-facing service logic
- Blockchain node:
  - JSON-RPC server methods for balances, UTXOs, onboarding reward, lotto, exchange, and raw transaction submission
- Docs:
  - QA checklist and result artifacts

# Failure Points

- Compose build or dependency boot failures
- Container healthcheck timing or proxy wiring mismatches
- Frontend-to-backend base path or cookie propagation issues
- Backend authorization checks rejecting valid flows or allowing subject mismatches
- RPC methods returning shapes that the backend adapter or frontend does not expect
- Onboarding reward issuance succeeding partially and not becoming visible in balances/UTXOs
- Repeated button clicks causing duplicate state changes or duplicate chain submissions
- Invalid path/query/body input not failing fast with bounded errors
- Claim or tx validation regressions if blockchain rules need to change

# Implementation Steps

1. Confirm impacted files, contracts, assumptions, and current route/action inventory.
2. Validate compose config and start the local stack with `/usr/local/bin/docker compose`.
3. Verify baseline health for frontend, backend, database, broker, cache, and JackpotChain RPC.
4. Build a QA/QC checklist covering:
   - API contract cases from `docs/reviews/api.md`
   - route reachability and basic page loading
   - wallet create/restore/unlock/auth/session/onboarding reward flows
   - lotto overview/entries/commit/result/claim paths
   - exchange info and write flow
   - mining/dashboard reads
   - abuse/security checks such as burst requests, malformed input, unauthorized access, and subject mismatch
5. Execute the checklist against the running stack and capture failures with exact commands and symptoms.
6. For each code issue:
   - add or update the smallest failing automated test first when business logic changes
   - implement the minimum safe fix
   - rerun the focused tests
   - rerun the affected compose/API/UI scenario
7. Repeat until the targeted scenarios pass or a hard external blocker remains.
8. Write the final Korean result document with exact commands, pass/fail outcomes, unresolved risks, and a concrete next-fix prompt if anything remains.

# Test Checklist

- Compose static validation:
  - `docker compose -f docker-compose.local.yml config`
- Service boot validation:
  - container status, logs, health endpoints, RPC availability
- Backend automated tests:
  - smallest affected JUnit scope first
  - broader `./gradlew test` if changes warrant it
- Frontend automated tests:
  - smallest affected Vitest scope first
  - broader `npm test` and `npm run build` if changes warrant it
- Blockchain automated tests:
  - smallest affected pytest scope first
- API checks:
  - success, validation failure, unauthorized, forbidden, duplicate, malformed payload, and burst cases
- User-flow checks:
  - route access, wallet creation, 1 POT visibility, error banner reproduction, unlock/lock behavior, exchange, lotto commit, dashboard/mining reads

# Observability Checklist

- Capture exact compose, build, test, and curl commands
- Capture health endpoints and relevant container logs for runtime failures
- Record which layer emitted the failure first: frontend, backend, RPC adapter, or node
- Preserve request/response symptoms without leaking secrets or private key material
- Confirm that error handling remains bounded and user-visible messages remain Korean on the frontend

# Done Criteria

- Local compose stack starts successfully with `/usr/local/bin/docker`
- Required services are healthy enough to exercise the user flows
- QA/QC checklist exists and was executed
- Wallet creation, onboarding reward visibility, and known error-banner reproduction path are verified or fixed
- API and abuse/security checks were run with documented results
- Any code changes are covered by targeted automated tests and relevant broader verification
- `docs/result/...` is updated in Korean with commands, outcomes, remaining risks, and next actions
