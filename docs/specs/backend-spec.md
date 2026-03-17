# Backend Spec
## Project
JackpotChain Blockchain Lottery Experience

---

## 1. Goal

Build a backend service layer that can safely expose JackpotChain functionality to the frontend while preserving correct boundaries between:

- blockchain node truth,
- service-layer projections,
- cache and async infrastructure,
- frontend-friendly APIs.

The backend must make it possible to support:
- Dashboard
- Lottery
- Wallet
- Mining
- Admin / operations visibility

without turning the service layer into the canonical blockchain authority.

---

## 2. Scope

Included in this phase:
- backend-facing API design
- service / controller / adapter boundaries
- node integration boundary
- wallet / lottery / mining / dashboard query shapes
- projection and cache-friendly response design
- observability-ready service points
- future MQ / Redis / DB extension points

Excluded for now:
- full production security hardening
- final distributed deployment
- complete event-driven production topology
- final real-time websocket architecture
- complete admin console implementation

---

## 3. Core Backend Role

The backend is responsible for:
- frontend-facing API shaping
- service orchestration
- projection and aggregation
- admin / operations API support
- cache integration
- monitoring integration
- node/RPC adapter behavior

The backend is not responsible for:
- owning blockchain canonical truth
- storing private keys
- replacing node validation rules
- inventing chain state locally

---

## 4. Domain Boundaries

### Node-owned truth
The blockchain node should remain the canonical source for:
- block chain state
- transaction validity
- mining-related chain updates
- lottery-related on-chain truth
- claim validation if node logic owns it

### Service-layer responsibilities
The backend may:
- aggregate node + DB + cache data
- expose frontend-friendly summaries
- maintain projection data
- maintain admin/ops summaries
- provide paginated read models
- provide controlled orchestration endpoints

### Forbidden boundary violations
- never store private keys
- do not treat PostgreSQL or Redis as blockchain truth
- do not re-implement final chain validity in the service layer unless explicitly required and documented
- do not expose unsafe internal details to the frontend

---

## 5. Backend Functional Areas

### 5.1 Dashboard
Backend should support:
- current height
- recent blocks
- recent transactions
- confirmed / candidate block distinction
- network/node summaries
- jackpot pool summary
- block detail modal data

### 5.2 Lottery
Backend should support:
- participation/entry orchestration
- selected number submission
- entry cost information
- current round or active round status
- participation history
- result / claimable state
- reward tier info
- pool contribution visibility

### 5.3 Wallet
Backend should support:
- wallet summary
- JACK / POT balances
- activity timeline
- reward history
- exchange history
- recent status
- wallet-related projections

### 5.4 Mining
Backend should support:
- mined block summaries
- reward per block
- mining pipeline data
- recent mining reward events
- mining-related operational summaries
- technical rule/policy summaries if needed

### 5.5 Admin / Operations
Backend should support:
- chain status
- node status
- anomaly detection surfaces
- commit/claim counts
- reward event counts
- operational summaries

---

## 6. Suggested API Families

### Dashboard APIs
- GET /api/dashboard/summary
- GET /api/dashboard/blocks/recent
- GET /api/dashboard/blocks/{blockId}
- GET /api/dashboard/network-summary

### Lottery APIs
- GET /api/lottery/summary
- POST /api/lottery/entries
- GET /api/lottery/entries/{walletAddress}
- GET /api/lottery/prize-tiers
- GET /api/lottery/claimables/{walletAddress}
- POST /api/lottery/claims

### Wallet APIs
- GET /api/wallets/{walletAddress}/summary
- GET /api/wallets/{walletAddress}/timeline
- GET /api/wallets/{walletAddress}/assets
- POST /api/wallets/{walletAddress}/swap

### Mining APIs
- GET /api/mining/summary
- GET /api/mining/blocks/{walletAddress}
- GET /api/mining/rewards/{walletAddress}
- GET /api/mining/pipeline

### Admin APIs
- GET /api/admin/summary
- GET /api/admin/node-status
- GET /api/admin/anomalies
- GET /api/admin/reward-events

These are working API suggestions and may be adapted after node analysis.

---

## 7. Data Source Strategy

Backend responses may come from:
- direct node query / JSON-RPC style integration
- database projections
- Redis cache
- derived service-layer aggregation

For each endpoint, the implementation should explicitly decide:
- source of truth
- cacheability
- fallback strategy
- staleness tolerance
- whether projection is needed

---

## 8. Node Integration Principles

- The node integration layer must be isolated from controller logic.
- Controllers should call services, and services should use adapters/clients for node communication.
- Read and write node operations must be treated differently.

### Read operations
Examples:
- get current height
- get block details
- get recent chain status

Rules:
- may allow bounded retry
- may allow degraded fallback if safe
- may allow cached summary in controlled cases

### Write/orchestration operations
Examples:
- lottery entry
- claim
- wallet-affecting reward settlement actions if externalized

Rules:
- retry must be cautious
- idempotency must be considered
- duplicate execution must be prevented where needed
- success must not be faked if node result is uncertain

---

## 9. Projection Strategy

The backend should be ready to maintain projection-friendly models for:
- recent blocks list
- block detail summary
- wallet activity timeline
- lottery participation history
- reward history
- mining reward history
- admin/ops counts and summaries

Projection candidates should be designed so the frontend does not need to understand node-internal complexity.

---

## 10. Cache Strategy

Initial assumption:
- cache-aside strategy

Good cache candidates:
- dashboard summary
- current height summary
- recent block summary
- recent transaction summary
- wallet summary snapshot
- admin summary snapshot
- mining summary snapshot

Rules:
- define TTL explicitly
- define stale tolerance explicitly
- define invalidation triggers explicitly
- never treat cache as canonical truth

Suggested early TTL assumptions:
- dashboard summary: 5–15 seconds
- recent blocks summary: 5–10 seconds
- wallet summary: 5–10 seconds
- admin summary: 10–30 seconds
- mining summary: 5–15 seconds

---

## 11. MQ / Event Strategy

The backend should remain ready for event-driven extensions.

Potential MQ event families:
- block confirmed
- reward settled
- lottery entry processed
- claim available
- claim completed
- mining reward reflected
- node anomaly detected
- RPC error threshold exceeded

MQ should be used for:
- async side effects
- notifications
- fan-out
- operational logging/event distribution
- aggregation updates

MQ should not be used as a replacement for all synchronous query paths.

---

## 12. Persistence Strategy

Expected persistence layers:
- PostgreSQL for service metadata and projections
- Redis for cache / short-lived support state
- node data_dir for canonical blockchain persistence

Rules:
- do not mix canonical blockchain truth into service DB
- DB should store service-friendly models
- schemas should support pagination and timeline views
- balances exposed to UI should be clearly sourced or projected

---

## 13. Validation and Error Strategy

### Request validation
- validate all external inputs
- use typed request DTOs
- reject malformed requests early

### Error exposure
- errors returned to clients must be safe and structured
- internal implementation details must not leak
- user-facing errors should distinguish:
  - invalid request
  - insufficient balance/resource
  - temporary system delay
  - unavailable dependency
  - operation not allowed

### Domain-sensitive validation
- lottery entry validation
- claim eligibility validation
- wallet-related operation validation
- mining/reward visibility validation where applicable

---

## 14. Non-Functional Requirements

### 14.1 Scalability
- APIs must support future growth without redesigning basic contracts
- list-style endpoints must support pagination
- avoid local in-memory assumptions for cross-instance state
- keep service boundaries compatible with future horizontal scaling
- design read-heavy responses for cache/projection use

### 14.2 Availability
- prefer bounded failure over cascading failure
- keep secondary side effects separate from primary request success paths
- external dependency calls must define timeout behavior
- safe degraded read responses may be allowed where clearly defined
- admin failures should not automatically break user product APIs

### 14.3 Reliability
- transaction boundaries must be explicit
- idempotency must be considered for mutation-like actions
- read retry and write retry must be separated conceptually
- duplicate execution risk must be identified
- no unsafe assumptions about node success may leak into user-visible success

### 14.4 Performance
- dashboard summary target: P95 <= 500ms under normal local/staging baseline
- detail and list summary APIs target: P95 <= 700ms
- mutation orchestration target: P95 <= 1000ms excluding external chain confirmation uncertainty
- hot paths must avoid oversized payloads
- projection and caching should be used where justified

These are initial working assumptions and should be revised after real measurement.

---

## 15. Observability Requirements

Important backend boundaries that must be observable:
- controller entry
- service orchestration
- node/RPC adapter boundary
- DB boundary
- Redis boundary
- MQ producer/consumer boundary

Metrics to plan for:
- request latency
- error rate
- node/RPC failures
- cache hit/miss
- queue backlog
- lottery entry count
- claim count
- reward reflection count
- recent anomaly count

Logging rules:
- structured logs preferred
- preserve trace/correlation identifiers where possible
- do not log sensitive data carelessly

---

## 16. Security Rules

- never store private keys
- validate all client input
- minimize trust boundaries
- expose only necessary information
- admin/ops APIs must remain clearly separated from user-facing APIs
- do not expose internal node details beyond what the product actually needs

---

## 17. Review Checklist

- Does the backend keep node truth separate from service projections?
- Are controllers/services/adapters clearly separated?
- Are list endpoints pagination-ready?
- Are cache and projection opportunities identified?
- Are write-like actions reviewed for idempotency and duplicate handling?
- Are timeout/retry/fallback assumptions explicit?
- Are errors safe and structured?
- Are observability points identified?
- Are APIs frontend-friendly without leaking node-internal complexity?

---

## 18. Done Criteria

This backend phase is complete only if:
- service boundaries are defined clearly
- API families for Dashboard / Lottery / Wallet / Mining exist
- node integration boundary is isolated
- projection and cache seams are prepared
- validation and error strategies are defined
- observability points are identified
- no canonical blockchain truth is incorrectly moved into the service layer
