# Goal

Move the wallet create CTA row further downward and make the active wallet card substantially less transparent so neighboring wallet cards are barely visible behind it.

# Scope

- Push the `지갑 생성하기` and `기존 지갑 등록하기` buttons 30px further downward from their current position.
- Reduce visible bleed-through from neighboring wallet cards by increasing active shell opacity and lowering adjacent-card opacity in the wallet carousel.
- Exclude wallet data, navigation behavior, and unrelated layout changes.

# Reference Specs

- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers

- Wallet create UI:
  - `src/components/wallet/WalletCreate.tsx`
- Wallet carousel UI:
  - `src/components/wallet/WalletInfo.tsx`
- Wallet theme tokens:
  - `src/components/wallet/walletThemes.ts`

# Failure Points

- Additional CTA offset could feel too detached from the color selector on smaller screens.
- Overcorrecting opacity could flatten the premium layered look of the wallet carousel.
- Lowering adjacent-card opacity too aggressively could make carousel context less clear.

# Implementation Steps

1. Increase the wallet create CTA row top offset by another 30px.
2. Increase wallet shell and coin panel opacity in theme tokens.
3. Lower neighboring-card motion opacity in the wallet carousel to reduce bleed-through.
4. Add an extra interior darkening layer for the active wallet shell if needed.

# Test Checklist

- Verify the wallet create CTA row sits 30px lower than its current position.
- Verify neighboring wallet cards are much less visible behind the active card.
- Verify the active card still preserves readable labels and balances.
- Run `npm run build` in `FE-ssatto`.

# Observability Checklist

- No runtime logging is needed for this visual-only change.
- Theme opacity remains centralized in wallet theme tokens.
- Failure remains bounded to wallet screen presentation.

# Done Criteria

- Wallet create CTA row is moved down by the requested additional 30px.
- Active wallet card transparency is reduced enough that background wallet UI is only faintly visible at most.
- `FE-ssatto` builds successfully.
