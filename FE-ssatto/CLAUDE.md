# Frontend — FE-ssatto (React + TypeScript)

Inherits all rules from root CLAUDE.md. These rules are FE-specific additions.

## Reference Reviews

Before working on the following areas, read the corresponding review docs first:

| Area                                                  | Review Document                                    |
| ----------------------------------------------------- | -------------------------------------------------- |
| Auth flow, wallet session, cookie/CORS model          | `docs/reviews/auth.md`                             |
| API contracts and polling strategy                    | `docs/reviews/fe-be-api.md`, `docs/reviews/api.md` |
| Full flow (wallet create → lotto → exchange → mining) | `docs/reviews/flow.md`                             |

## Stack

- React 18+, TypeScript (strict mode)
- Vite (build tool)
- Zustand (global state)
- React Query / custom hooks (server state)
- Axios (HTTP client)

## Directory Structure Conventions

```
src/
  components/     Reusable UI components (no business logic)
  pages/          Route-level components (compose components)
  hooks/          Custom hooks — data fetching and UI state
  services/       API call functions (pure async functions)
  stores/         Zustand stores (global client state only)
  types/          Shared TypeScript types/interfaces
  utils/          Pure utility functions
```

## Implementation Rules

**Components:**

- Single responsibility — one concern per component
- No direct API calls in components — use hooks or services
- Props must be typed with explicit interfaces (no `any`)
- Keep components small and composable

**Hooks:**

- `use*` naming convention
- Data-fetching hooks own loading/error/data state
- Side effects isolated in `useEffect` with correct dependency arrays
- Never put business logic directly in page components

**Services:**

- Pure async functions that call the API
- Return typed response objects
- Handle HTTP errors at this layer (throw typed errors upward)
- No UI state in services
- FE must ONLY call Backend REST API (`/api/v1/...`) — never call the blockchain node directly

**Stores (Zustand):**

- Only truly global client state
- `useWalletStore`: wallet metadata + persisted state (persists across page reload)
- `useWalletSessionStore`: decrypted key lifecycle, token in memory only (never persisted)
- Keep stores small — prefer colocated state in hooks when scope is local

## TypeScript Rules

- `strict: true` — no implicit `any`
- Prefer `interface` for object shapes, `type` for unions/intersections
- API response types must match backend DTO exactly — update both together
- Lotto entry status enum: `DRAWING | WINNING | LOSING | EXPIRED`
- Never cast with `as unknown as X` to bypass type errors — fix the root cause

## Auth and Wallet Session (read `docs/reviews/auth.md` before modifying)

The auth model is a layered design. Do not simplify or bypass any layer.

**Wallet storage boundary:**

- Private key: encrypted and stored in browser IndexedDB only — never sent to server, never in localStorage
- Decrypted key: memory only (via `useWalletSessionStore`) — cleared on lock
- Wallet metadata: persisted via `useWalletStore`
- `unlock → challenge → sign → verify` flow orchestrated by `walletAuthFlowService`
- `walletSessionService` manages browser session restore order

**Session model:**

- Short-lived access token in memory
- Refresh session via httpOnly cookie
- Token refresh logic centralized in `authService` / Axios interceptor
- Re-auth flows must not disrupt user navigation — handle silently where possible

## Polling Strategy (read `docs/reviews/fe-be-api.md` before adding polling)

Blockchain state changes externally (new blocks mined). Polling is the current strategy; SSE/WebSocket not yet available.

**APIs that require polling:**
| Endpoint | Interval | Stop Condition |
|----------|----------|----------------|
| `GET /wallet?addresses=...` | 10s | Page leave |
| `GET /wallet/{address}/activities` | 10s | Page leave |
| `GET /lotto?address=...` | 10s | Page leave |
| `GET /lotto/entries?address=...` | 10s | All entries confirmed (→ 30s or pause) |
| `GET /lotto/entries/{commitHash}/result` | 10s | `status !== "DRAWING"` |
| `GET /mining/blocks?address=...` | 15s | Page leave |

**Polling rules:**

- Pause when `document.visibilityState !== 'visible'`
- POST endpoints are NOT polling targets — trigger immediate refetch after success
- `GET /blockchain/blocks/{height}` is conditional polling only (when detail modal is open), NOT always-on
- Use `AbortController` to cancel in-flight requests on interval restart

**Recommended common hook:** `src/hooks/usePollingQuery.ts`

```ts
// Required options: intervalMs, enabled, stopWhen, pauseWhenHidden, queryFn
// Use AbortController to cancel stale requests
```

## Error Handling

- Global Axios interceptor for 401/403 handling
- User-visible errors shown via toast/notification — never raw error messages
- Network errors must result in a fallback state, not a broken UI
- Log errors to console in development; suppress noisy logs in production
- Critical user flows (auth, wallet connect, lotto entry) must have explicit error boundaries

## Testing

- Unit tests: hooks and services with mocked API responses
- Component tests: render + interaction with `@testing-library/react`
- Test files co-located: `*.test.ts` / `*.test.tsx` next to source
- Mock `localStorage`, `sessionStorage`, external modules explicitly

## Performance

- Code-split at route level with `React.lazy` + `Suspense`
- Avoid re-renders: memoize expensive computations with `useMemo`
- Avoid prop drilling beyond 2 levels — lift to store or context
- Images: use appropriate format and lazy loading

## Observability

- Console logs are development-only — strip before production build
- User-facing errors must be actionable (not "something went wrong")
