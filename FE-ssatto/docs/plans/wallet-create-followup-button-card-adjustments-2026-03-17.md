# Goal

Refine the wallet create screen button spacing and modal action alignment, and update the created wallet cards so JACK/POT labels follow the selected wallet color while the cards appear less transparent.

# Scope

- Reduce the horizontal padding feel of the `기존 지갑 등록하기` button to a content-fit width with 20px side padding.
- Move the create/restore CTA row 30px lower on the wallet create screen.
- Center the modal confirm buttons for both create and restore dialogs.
- Apply wallet theme coloring to the JACK/POT labels and unit text in the created wallet card while keeping numeric values white.
- Reduce wallet-card transparency by making the themed shells more opaque.

# Reference Specs

- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers

- Wallet feature UI:
  - `src/components/wallet/WalletCreate.tsx`
  - `src/components/wallet/WalletInfo.tsx`
- Wallet theme tokens:
  - `src/components/wallet/walletThemes.ts`

# Failure Points

- Button width changes could wrap longer Korean labels on smaller widths.
- Centering modal action buttons could look uneven if the surrounding spacing is not preserved.
- Theme-based coin card styling could reduce contrast for some wallet colors.
- Increasing shell opacity globally could make the wallet cards feel heavier than intended.

# Implementation Steps

1. Update the restore CTA on the wallet create screen to use content-fit sizing with 20px horizontal padding.
2. Push the wallet create CTA row down by 30px.
3. Center both modal confirm buttons within their action row.
4. Add per-theme coin panel tokens or equivalent styling hooks for JACK/POT label rendering.
5. Update the created wallet cards to use theme-driven accent colors for label and unit text while leaving numbers white.
6. Increase theme shell opacity to reduce transparency.

# Test Checklist

- Verify the restore CTA width is reduced and still fits the full label.
- Verify both create/restore CTAs sit 30px lower than before.
- Verify both modal confirm buttons are centered.
- Verify JACK/POT labels and unit text on wallet cards use the selected wallet color.
- Verify wallet-card numbers remain white.
- Verify wallet-card shells appear less transparent.
- Run `npm run build` in `FE-ssatto`.

# Observability Checklist

- No new logging is required for this UI-only change.
- Theme-based styling remains explicit in one token source and wallet components.
- Failure remains bounded to wallet screen visuals.

# Done Criteria

- Wallet create CTA spacing and modal alignment match the request.
- Wallet card label colors follow the selected theme and numbers stay white.
- Wallet shells are visibly less transparent.
- `FE-ssatto` builds successfully.
