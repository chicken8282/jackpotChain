# Frontend Spec

## Project

JackpotChain Blockchain Lottery Experience

---

## 1. Goal

Build a scalable React + Vite frontend that supports the JackpotChain product experience while remaining easy to connect to the backend later.

This phase focuses on:

- production-oriented UI architecture
- domain-based screen composition
- dummy-data driven development
- easy replacement of mock data with real backend APIs
- clean separation between UI, view models, adapters, and data sources

The frontend must support the current product pages:

- Dashboard
- Lottery
- Wallet
- Mining

The frontend must remain product-oriented, not landing-page oriented.

---

## 2. Scope

**Included in this phase:**

- route structure
- global layout structure
- reusable UI primitives
- domain-based page composition
- mock-data architecture
- adapter and view-model layer
- loading / empty / error / success states
- premium dark UI system
- backend-connectable service structure

**Excluded for now:**

- real backend integration
- production authentication
- wallet cryptography implementation
- websocket / SSE live sync
- production monitoring integration
- final accessibility certification

---

## 3. Product Principles

- The UI is a usable product, not a concept landing page.
- The UI must make users want to interact with the lottery flow.
- The UI must keep strong readability in dark mode.
- The UI must differentiate the emotional role of each page:
  - **Dashboard** = live system overview
  - **Lottery** = interaction and participation
  - **Wallet** = ownership and asset control
  - **Mining** = system process and reward flow

---

## 4. UI Language Rules

- All user-facing UI text must be written in **Korean**.
- Exceptions: `JACK`, `POT`
- Avoid long explanatory hero copy.
- Prefer short role-based labels and strong section titles.
- Use labels, values, status chips, and CTA text instead of descriptive paragraphs.

**Examples:**

- 체인 흐름
- 번호 잠금
- 로또 추첨
- 지갑 패스
- 보상 파이프
- 활동 기록
- 내부 교환
- 합의 규칙

---

## 5. Frontend Architecture Principles

The frontend should be organized so mock data can later be replaced with real API integration with minimal page-level rewrites.

**Required separation:**

- route / page composition
- widgets / sections
- domain entities and view models
- services / repositories / adapters
- mock fixtures and scenarios
- shared UI primitives
- shared hooks and utilities

The UI must not depend directly on raw mock JSON inside page components.

---

## 6. Recommended Structure

```text
src/
  app/
    layouts/
    providers/
    router/

  pages/
    dashboard/
    lottery/
    wallet/
    mining/

  widgets/
    dashboard/
    lottery/
    wallet/
    mining/

  features/
    lottery-entry/
    wallet-create/
    wallet-restore/
    wallet-swap/
    mining-status/

  entities/
    block/
    lottery/
    wallet/
    mining/
    network/

  services/
    api/
    repositories/
    adapters/

  mocks/
    fixtures/
    scenarios/
    handlers/

  shared/
    ui/
    hooks/
    utils/
    constants/
    types/
    styles/
```

---

## 7. Page Requirements

### 7.1 Dashboard

**Purpose:** show live blockchain flow and high-level network overview

**Core UI sections:**

- chain flow block track
- current height / active nodes / pool rewards summary
- jackpot pool highlight
- block height / node network summary
- block detail modal

**Important UX rules:**

- block cards must never clip text
- block track must support intentional horizontal flow
- consensus boundary must move with the track context
- confirmed / candidate regions must stay visually balanced

### 7.2 Lottery

**Purpose:** let the user configure numbers and participate in a round

**Core UI sections:**

- number selection area
- selected combination summary
- entry cost
- participation status
- participation CTA
- round history / result states / prize tiers

**Important UX rules:**

- number selector must feel tactile and premium
- participation action must have visible feedback
- clicking `참여하기` must update UI state
- success feedback must show a modal or premium toast
- status must support at least:
  - 기본 상태
  - 참여 가능
  - 참여 처리 중
  - 참여 완료
  - POT 부족

### 7.3 Wallet

**Purpose:** show ownership, balance, pass identity, and recent events

**Core UI sections:**

- wallet hero card / pass
- address
- recent status
- total assets
- internal exchange
- wallet timeline / activity ledger

**Important UX rules:**

- wallet hero card must feel premium and readable
- balances must be easy to scan
- address and metadata must be secondary
- history rows must be compact and aligned

### 7.4 Mining

**Purpose:** show mining flow, rewards, and system process

**Core UI sections:**

- mined blocks
- 3-step reward pipeline
- mining-related summaries
- rules / policy board
- reward history

**Important UX rules:**

- pipeline must feel technical and structured
- stage cards must have stronger inner hierarchy
- reward values must stand out clearly
- rule / policy section must feel like a technical board, not generic accordion filler

---

## 8. State Rules

Every data-driven section must explicitly support:

- `loading`
- `empty`
- `error`
- `success`

Interactive areas must additionally support:

- `idle`
- `processing`
- `success feedback`
- `invalid state` (if required)

**Examples:**

- lottery entry state
- wallet restore state
- modal open / close state
- block detail modal loading state

---

## 9. Mock Data Rules

Mock data must resemble future backend contracts as closely as possible.

- Keep raw response contracts separate from UI view models.
- Use adapters to transform raw mock data into UI-ready structures.
- Support at least these mock scenarios:
  - normal data
  - empty data
  - delayed data
  - partial failure
  - hard failure

**Required separation:**

- response contract type
- mock fixture
- adapter
- view model
- component props type

---

## 10. Non-Functional Requirements

### 10.1 Scalability

- The frontend must support growth from 4 core pages to 10+ pages without major restructuring.
- New product sections should be added through domain-oriented folders, not ad hoc page logic.
- Large list views must be designed to support pagination or segmented rendering.
- Mock-to-real API replacement must mostly affect `services/adapters`, not page structure.

### 10.2 Availability

- The UI should prefer partial rendering over full blank failure when safe.
- Non-critical widgets may fail independently.
- Dashboard sections should degrade independently where possible.
- Errors should be visible, understandable, and recoverable.

### 10.3 Reliability

- UI state must be deterministic for the same input state.
- Interactive flows must have explicit state transitions.
- Modals, toasts, and CTA results must reflect actual frontend state changes.
- No user-facing critical text should be clipped or hidden by layout bugs.

### 10.4 Performance

- Primary page interaction readiness target: **under 2.0s** on local dev baseline
- Major visible cards and hero sections should render without visible jank
- Large lists should avoid unnecessary re-renders
- Heavy decorative effects must not reduce readability or responsiveness

---

## 11. Visual System Requirements

### Color

| Role | Value |
|------|-------|
| base background | near-black deep navy |
| surface | cool blue-black / graphite navy |
| primary accent | premium gold |
| secondary accent | electric blue (live / system states) |
| success | green (only when truly needed) |
| error | red (only for invalid / failure states) |

**Rules:**

- avoid muddy navy fog across the whole page
- use glow selectively, not globally
- increase contrast between background, surface, and active elements

### Typography

- strong section titles
- smaller labels
- high-contrast values
- metadata clearly secondary
- Korean UI text only except `JACK` / `POT`

### Card Materials

Use at least **3 material tiers**:

| Tier | Usage |
|------|-------|
| primary hero card | wallet pass, jackpot pool highlight |
| system info card | stats, summaries, pipeline stages |
| list / timeline card | history rows, block entries |

Do not make every card feel identical.

---

## 12. Interaction Requirements

### Lottery Entry

When the user clicks `참여하기`:

- validate available POT
- **if valid:**
  - update visible POT
  - transition status
  - show success feedback
  - show modal or premium toast: `로또에 참여했습니다`
- **if invalid:**
  - show clear error or insufficient state

### Block Detail

- clicking a block should open a detail modal
- modal content must remain readable and never overflow / clamp awkwardly
- summary and detail columns must remain aligned and scroll-safe

---

## 13. Review Checklist

- [ ] Is all user-facing UI text in Korean except `JACK` / `POT`?
- [ ] Are page layouts visually differentiated?
- [ ] Is the dashboard chain flow readable and balanced?
- [ ] Does the lottery CTA visibly work?
- [ ] Does the wallet page feel like ownership / asset UI rather than generic cards?
- [ ] Does the mining page feel technical and process-driven?
- [ ] Are block cards and data boxes free from clipping?
- [ ] Are adapters and view models separated from raw mock data?
- [ ] Can the frontend later connect to real APIs without page rewrites?
- [ ] Are loading, empty, error, and success states defined?

---

## 14. Done Criteria

This frontend phase is complete only if:

- route / page structure is stable
- page identity is clear across Dashboard / Lottery / Wallet / Mining
- UI text is consistently Korean except `JACK` / `POT`
- block flow and modal layout bugs are fixed
- lottery interaction feedback is implemented
- mock data is separated cleanly
- service / adapter / view-model architecture exists
- the UI is visually premium, readable, and product-usable