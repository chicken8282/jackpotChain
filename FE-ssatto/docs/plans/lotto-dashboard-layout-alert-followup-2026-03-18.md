# Goal

Adjust the lotto participation alert content and contrast, align the lotto tab heading positions, widen the dashboard blockchain flow stage, and shrink the lower dashboard cards including the node network graphic.

# Scope

- Update the lotto success alert to a two-line message with highlighted `10분` text.
- Restyle the lotto success alert surface and border to match the random-generate button background language.
- Make the lotto page heading color white and keep the history heading on the same x-axis as the draw heading.
- Widen the dashboard blockchain flow container by 100px on both left and right while keeping the header/stat x positions fixed.
- Reduce the visible height of the `블록 높이` and `노드 네트워크` cards substantially from the bottom side.
- Scale the node network graphic to 0.6x its current size.

# Reference Specs

- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers

- Lottery feature UI:
  - `src/components/lotto/HexPicker.tsx`
- Dashboard feature UI:
  - `src/components/dashboard/BlockchainVisualizer.tsx`
  - `src/components/dashboard/BlockHeight.tsx`
  - `src/components/dashboard/NodeNetwork.tsx`

# Failure Points

- The lotto alert line-break and highlighted inline text could wrap awkwardly on narrower widths.
- Matching the random button surface too literally could reduce modal visibility if shadow and border contrast are not preserved.
- Widening the chain-flow section could cause horizontal clipping if negative margins are not balanced with internal padding.
- Reducing the lower card heights too aggressively could clip their inner content.
- Scaling the node network to 0.6x could make labels too small if the container is also reduced.

# Implementation Steps

1. Update the lotto heading color and consistent x-axis margin for both draw and history states.
2. Replace the lotto success alert copy with a two-line layout and highlight `10분` in yellow.
3. Restyle the lotto success alert surface to match the random-generate button’s dark gray background and stroke language while keeping sufficient shadow.
4. Widen the blockchain flow section with symmetrical overflow expansion so the inner header/stat positions remain fixed.
5. Reduce `블록 높이` and `노드 네트워크` card heights and tighten their internal spacing.
6. Reduce the node network graphic to about 0.6x through a constrained SVG container.
7. Run `npm run build`.
8. Use the local dev server and scripted screenshots to confirm the lotto alert remains noticeable and the dashboard sizing changes render without clipping.

# Test Checklist

- Verify the lotto success alert shows two lines and highlights `10분`.
- Verify the alert surface visually separates from the page background.
- Verify the lotto title is white and the history heading shares the same x-axis.
- Verify the blockchain flow section is wider by roughly 100px per side without shifting the header block.
- Verify the lower dashboard cards are shorter and the node network graphic is visibly smaller.
- Run `npm run build` in `FE-ssatto`.

# Observability Checklist

- No new runtime logging is required for this UI-only change.
- Width and height changes stay explicit in component layout classes.
- Failure remains bounded to lottery and dashboard presentation.

# Done Criteria

- Lotto alert content, color treatment, and heading alignment match the request.
- Dashboard blockchain flow is wider without moving the inner header/stat x positions.
- The two lower dashboard cards are shorter and the node network graphic is scaled down.
- `FE-ssatto` builds successfully and screenshots show no obvious clipping.
