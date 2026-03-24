# Goal

Verify the end-to-end API request flow across frontend, backend, and JackpotChain RPC integration based on `docs/reviews/api.md`, then fix contract or integration issues that block successful responses.

# Scope

- Frontend API client, service layer, hooks, and adapters that consume active backend APIs
- Backend controllers, services, DTOs, security rules, and JackpotChain RPC adapter usage
- Contract validation for auth, blockchain dashboard, wallet, lotto, exchange, and mining APIs
- Small, reviewable fixes required to restore contract alignment and connection flow

# Reference Specs

- `AGENTS.md`
- `docs/reviews/api.md`
- `docs/specs/frontend-spec.md`
- `docs/specs/backend-spec.md`
- `docs/specs/infra-spec.md`
- `docs/reviews/blockchain.md`
- `blockchain/docs/adr/ADR-001-claim-validation.md` when claim or validation rules are touched

# Impacted Layers

- FE API boundary: `FE-ssatto/src/lib`, `FE-ssatto/src/services`, `FE-ssatto/src/hooks`
- BE API boundary: `BE-ssatto/src/main/java/.../controller`, `.../service`, `.../dto`
- BE blockchain integration: `BE-ssatto/src/main/java/.../domain/blockchain/rpc`
- Test layers: FE Vitest suites, BE unit/controller/RPC tests
- Documentation: `docs/result`

# Failure Points

- FE request path, auth token, or cookie behavior mismatches active backend contract
- FE expected DTO shape differs from backend response DTO shape
- Protected API authorization rules reject FE polling flows
- Backend service validation rejects valid contract inputs
- Backend RPC response parsing mismatches actual JackpotChain RPC result shape
- Node or infra unavailability causes unbounded failure instead of explicit RPC failure

# Implementation Steps

1. Compare active API contract with FE service interfaces and BE controller/service signatures.
2. Run the smallest relevant FE and BE tests to surface failing contract paths before editing.
3. Add or update focused tests first for any confirmed contract mismatch.
4. Implement minimal cross-layer fixes while preserving controller/service/repository/RPC boundaries.
5. Re-run targeted tests, then broader verification if the targeted scope is stable.
6. Record outcomes, unresolved issues, and next actions in `docs/result`.

# Test Checklist

- FE service or adapter tests cover changed DTO and error-handling paths
- BE controller tests cover request/response contract changes
- BE service tests cover validation, authorization, and failure paths
- BE RPC client tests cover response parsing for touched methods
- Integration-level command checks are run when the local environment permits

# Observability Checklist

- No new `INFO` logs on request entry or read-only polling calls
- Core business completion logs remain only on successful submit flows
- RPC and infra failures are surfaced as explicit errors
- Failures remain diagnosable through bounded exceptions and existing logs

# Done Criteria

- FE service-to-BE API flow matches `docs/reviews/api.md` for touched endpoints
- BE-to-RPC flow remains within defined boundaries and returns explicit failures on RPC issues
- Targeted tests pass for changed areas
- Any unresolved environment-dependent failures are documented with reproducible commands and likely root causes
- A Korean result document exists under `docs/result`
