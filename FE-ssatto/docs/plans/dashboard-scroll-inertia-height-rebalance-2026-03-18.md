# Goal

Make the dashboard blockchain rail feel smoother with inertial horizontal scrolling and a slight elastic edge rebound, while increasing the `블록 높이` and `노드 네트워크` cards by 100px and resizing their inner visuals to match.

# Scope

- Replace the dashboard rail’s direct wheel-to-scroll jump with smoother momentum-based motion.
- Add a subtle elastic edge rebound when the rail is pushed past its horizontal boundary.
- Increase `블록 높이` and `노드 네트워크` card heights by 100px from their current reduced state.
- Enlarge the block-height stack and node-network graphic to fit the taller cards.
- Exclude unrelated dashboard block card styling or modal behavior changes.

# Reference Specs

- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers

- Dashboard feature UI:
  - `src/components/dashboard/BlockchainVisualizer.tsx`
  - `src/components/dashboard/BlockHeight.tsx`
  - `src/components/dashboard/NodeNetwork.tsx`

# Failure Points

- Inertial scrolling could fight pointer dragging if both paths do not share the same motion state.
- Elastic rebound could visually detach the block chain from its hit area if the offset is too large.
- Taller lower cards could still feel empty if the inner components are not scaled proportionally.
- Enlarging the node network could reintroduce clipping inside its frame.

# Implementation Steps

1. Add a shared rail motion state for wheel momentum and edge rebound.
2. Route wheel events into velocity-based scrolling instead of immediate `scrollLeft += deltaY`.
3. Apply a bounded visual translate offset to the rail content when the motion reaches the left or right boundary.
4. Increase `BlockHeight` outer height by 100px and scale up its number and stack treatment.
5. Increase `NodeNetwork` outer height by 100px and enlarge the framed SVG area proportionally.
6. Run `npm run build`.
7. Use a local browser script to confirm the rail continues moving after the initial wheel event and the resized lower cards render without clipping.

# Test Checklist

- Verify dashboard wheel scrolling continues with momentum after a wheel event.
- Verify the rail shows a subtle elastic rebound at horizontal edges rather than stopping abruptly.
- Verify `블록 높이` and `노드 네트워크` are each 100px taller than the current version.
- Verify the block-height stack and node-network graphic are visibly larger and centered.
- Run `npm run build` in `FE-ssatto`.

# Observability Checklist

- No new logging is required for this UI-only change.
- Motion state remains explicit inside the dashboard rail component and is cleaned up on unmount.
- Failure remains bounded to dashboard scrolling and presentation.

# Done Criteria

- The dashboard rail scrolls with smoother momentum and a subtle edge rebound.
- The two lower dashboard cards are 100px taller and their inner components are scaled up to fit.
- `FE-ssatto` builds successfully and local verification shows no obvious clipping or broken scroll behavior.
