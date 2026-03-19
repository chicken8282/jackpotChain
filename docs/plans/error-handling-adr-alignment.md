# Goal

Align the backend exception-handling implementation, ADR, and backend spec around the `ErrorCode + GlobalExceptionHandler` approach, while updating the package structure to support optional thin domain-specific exception wrappers.

# Scope

- Rewrite `docs/adrs/adr-04.md` to match the established ADR format
- Update `docs/specs/backend-spec.md` to document the chosen exception strategy and revised package structure
- Update backend exception code to use Korean error messages
- Add optional domain exception package structure and at least one thin wrapper example
- Update tests to verify the revised exception contract and package structure

Out of scope:

- Domain service implementation beyond thin exception wrappers
- Controller/API feature implementation
- Repository, RPC client, MQ, and persistence behavior changes

# Reference Specs

- `AGENTS.md`
- `docs/specs/backend-spec.md`
- `docs/adrs/adr-03.md`
- `docs/adrs/adr-04.md`

# Impacted Layers

- Controller: global exception mapping via `GlobalExceptionHandler`
- Service: exception throw pattern only
- Repository: none
- RPC Client: none
- MQ: none
- Documentation: ADR and backend spec alignment

# Failure Points

- ADR and backend spec diverge from the implemented code
- Tests still assert old English messages or old folder structure
- Domain-specific wrapper exceptions bypass the shared response contract
- Package structure changes drift from the modular-monolith rules

# Implementation Steps

1. Rewrite ADR-04 with the same section structure and tone as existing ADRs.
2. Update or rewrite backend spec sections for package structure, error handling, logging, and checklist rules.
3. Update tests first for Korean error messages, thin wrapper behavior, and domain `exception/` folders.
4. Implement Korean error messages in `ErrorCode` and ensure `GlobalExceptionHandler` still produces stable error codes.
5. Add domain exception package skeletons and an example thin wrapper exception.
6. Run tests and document the final result.

# Test Checklist

- [ ] Global exception handler tests pass with Korean error messages
- [ ] Thin domain exception wrapper maps through `GlobalExceptionHandler`
- [ ] Package structure test validates domain `exception/` folders
- [ ] Spring Boot context and actuator health tests remain green

# Observability Checklist

- [ ] Business exceptions remain WARN without stack traces
- [ ] Unhandled exceptions remain ERROR with stack traces
- [ ] Error code remains stable in logs and API payloads
- [ ] No request-entry INFO logging is introduced

# Done Criteria

- ADR-04 matches the existing ADR format and records the decision clearly
- Backend spec documents the chosen exception-handling model
- Code uses Korean error messages and preserves a stable `ErrorCode` contract
- Package structure reflects optional domain-specific wrapper exceptions
- Tests pass
- Result documentation is added for the task
