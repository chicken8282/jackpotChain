# Project: S14P21E202 — JackpotChain

## Repository Layout

```
BE-ssatto/        Spring Boot backend
FE-ssatto/        React + TypeScript frontend
blockchain/       Python blockchain node
nginx/            Reverse proxy config
docker-compose.*  Environment orchestration
docs/             Plans, ADRs, reviews, runbooks
```

## Quality Priorities (non-negotiable order)

1. Reliability
2. Availability
3. Performance
4. Scalability

Never trade these for development speed.

## Language Rules

- All responses, plans, reviews, ADRs, checklists, and documentation: **English**
- Code comments: English (match existing file convention if it differs)
- Commit messages: English

## Mandatory Workflow

For any non-trivial change, follow this sequence in order:

```
Specify → Plan → Implement → Review → Deploy
```

Skip stages only for truly trivial (< 10 line) changes.

---

### 1. Specify

Before writing code, confirm the task has a usable spec:

- Feature overview
- User story or business goal
- API or interface contract
- Business rules and constraints
- Dependencies
- Non-functional requirements (reliability, availability, performance, scalability)

If spec is incomplete: state assumptions explicitly, proceed conservatively, never silently invent behavior.

**Gate:** functional behavior clear, error cases described, dependencies identified, NFRs addressed.

---

### 2. Plan

For non-trivial work, create a plan file in `docs/plans/` before coding.

Plan template:
```
# Goal
# Scope
# Reference Specs
# Impacted Layers
# Failure Points
# Implementation Steps
# Test Checklist
# Observability Checklist
# Done Criteria
```

Include: why this approach, trade-offs, rejected alternatives.

**Gate:** reliability/availability/performance/scalability covered, failure modes identified, increments are reviewable, observability addressed.

---

### 3. Implement

Rules:
- Minimum correct change only
- No broad unrelated refactors
- No casual dependency additions
- No hidden global state without justification
- No safety check removal without a stronger replacement

**Scalability:** no local-only distributed state; no unbounded list responses; prefer pagination; externalize config.

**Availability:** timeouts on all external calls; retry/fallback/circuit-breaker where appropriate; isolate critical user paths; degrade gracefully.

**Reliability:** validate inputs; explicit transaction boundaries; handle idempotency/duplicates; separate business from system exceptions; correct under failure and retry.

**Performance:** no N+1 queries; deliberate caching; minimal payloads; measure before claiming optimization; intentional async.

Always consider for every change: failure mode, recovery path, rollback safety, data consistency, observability, backward compatibility.

---

### 4. Review

Every non-trivial implementation needs a review doc in `docs/reviews/`.

Review template:
```
# Implementation Summary
# Checklist Results
# Test Results
# Remaining Risks
# Additional Improvements Needed
```

Testing requirements:
- Unit: normal, boundary, failure cases
- Integration: changed interfaces
- Failure-path: external dependency failures
- Concurrency/duplicate-request cases where relevant

**Gate:** tests pass, checklist complete, remaining risks stated, safe to merge.

---

### 5. Deploy

Before completion:
- Build/test/static checks pass
- Rollback path exists
- Env-specific config is separated (no hardcoded secrets)
- Migration impact assessed
- Monitoring/alerting implications documented

Observability: traceable boundaries, useful logs (not noisy), meaningful metrics, errors contain diagnosis context.

---

## ADRs

Create or update `docs/adrs/` for decisions involving:
- Cache strategy
- Queue/event-flow design
- Retry/timeout/circuit-breaker policy
- Idempotency strategy
- Data consistency trade-offs
- Deployment strategy
- Monitoring/logging/tracing
- Security-sensitive architecture

Document **why**, not just what.

---

## Security Baseline

- Never persist secrets carelessly
- Validate all external inputs at system boundaries
- Minimize trust boundaries
- Apply least privilege
- Treat auth, payment, admin flows as high-risk
- Never expose internal details in error messages

---

## Output Behavior

**Starting non-trivial work:** summarize the plan first.

**Finishing work:** summarize what changed, how it was validated, remaining risks, needed follow-up docs.

**Ambiguous requirements:** state assumptions explicitly, proceed conservatively.

---

## Domain-Specific Guidelines

Each domain has its own CLAUDE.md in its subdirectory with stack-specific conventions:

- Backend: `BE-ssatto/CLAUDE.md`
- Frontend: `FE-ssatto/CLAUDE.md`
- Blockchain: `blockchain/CLAUDE.md`
- Infrastructure: `nginx/CLAUDE.md`

Claude Code auto-loads these when working in those directories.
