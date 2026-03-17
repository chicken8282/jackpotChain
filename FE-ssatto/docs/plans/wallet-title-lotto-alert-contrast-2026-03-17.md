# Goal

Increase emphasis on the wallet create heading and reposition its controls, while making the lotto success alert visually distinct from the page background through a darker neutral surface and stronger text contrast.

# Scope

- Increase the wallet create title size by about 1.5x.
- Move the wallet color selector down by 10px.
- Move the wallet create CTA row down by an additional 30px.
- Restyle the lotto success alert surface, border, and text for stronger contrast.
- Attempt a practical visual check of the lotto alert against the page background after implementation.

# Reference Specs

- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers

- Wallet feature UI:
  - `src/components/wallet/WalletCreate.tsx`
- Lottery feature UI:
  - `src/components/lotto/HexPicker.tsx`

# Failure Points

- Larger wallet title could wrap or crowd the supporting copy.
- Additional vertical offsets could create too much empty space on smaller screens.
- Lotto success alert contrast could become too heavy and feel disconnected from the dark visual system.
- Practical alert verification may be limited by the locally available browser automation tools.

# Implementation Steps

1. Increase the wallet create heading size and preserve readable line-height.
2. Offset the wallet color selector downward by 10px.
3. Move the wallet create CTA row down by another 30px.
4. Replace the lotto success alert blue-toned surface with a dark neutral gray surface, muted gray border, and white text.
5. Run `npm run build`.
6. If local browser automation is available, capture or inspect the lotto alert after triggering participation and confirm the alert is visually distinguishable.

# Test Checklist

- Verify the wallet create title is visibly larger than before.
- Verify the wallet color selector is moved 10px downward.
- Verify the wallet CTA row is moved 30px lower than its current position.
- Verify the lotto success alert stands out against the page background.
- Run `npm run build` in `FE-ssatto`.

# Observability Checklist

- No new logging is needed for this UI-only change.
- Alert contrast remains explicit in component styling rather than hidden in shared globals.
- Failure remains bounded to wallet and lotto presentation.

# Done Criteria

- Wallet title and control offsets match the request.
- Lotto success alert uses a dark gray surface with a gray border and white text and is more visible against the background.
- `FE-ssatto` builds successfully.
