# Goal

Refine the wallet creation screen so the create-related buttons use a narrower outlined-yellow variant, modal confirm buttons have more separation from the input area, and the wallet preview becomes a single JACK coin card with the requested spacing and positioning changes.

# Scope

- Update the primary `지갑 생성하기` button styling and width.
- Update the `지갑 생성 완료` and `지갑 등록 완료` modal confirm button styling and spacing.
- Remove the preview POT card and convert the preview JACK card into a single centered JACK coin-focused card.
- Remove the preview scheduled-address text and reposition the JACK amount and label.
- Exclude wallet data contract changes and unrelated wallet page sections.

# Reference Specs

- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers

- Wallet feature UI:
  - `src/components/wallet/WalletCreate.tsx`

# Failure Points

- Narrower content-width buttons could wrap or misalign on smaller screens.
- Modal spacing changes could create uneven layout if not separated cleanly from the input stack.
- Removing the POT preview card could leave the wallet preview visually unbalanced.
- Repositioning the JACK amount and label could cause overlap with the preview card chrome.

# Implementation Steps

1. Add a reusable local button class for the outlined yellow create-action variant.
2. Apply that variant to the main `지갑 생성하기` button with `20px` horizontal padding and content-based width.
3. Split modal content into input stack plus confirm-action row so the confirm button can sit with larger top spacing.
4. Apply the same outlined yellow variant to both modal confirm buttons with content-based width.
5. Replace the dual-card wallet preview with one centered JACK coin card and adjust text positions per request.

# Test Checklist

- Verify `지갑 생성하기` uses the requested darker outlined style with yellow text and border.
- Verify `지갑 생성 완료` and `지갑 등록 완료` use the same style and no longer span full width.
- Verify the input-to-confirm-button spacing in both modals is visibly doubled.
- Verify the preview shows only one JACK coin card, no POT card, and no scheduled-address text.
- Verify the JACK amount and label positions match the requested offsets without clipping.
- Run `npm run build` in `FE-ssatto`.

# Observability Checklist

- No new runtime logging is needed for this UI-only change.
- The UI remains locally bounded to the wallet create component with no additional shared state.
- Failure is limited to visual regression on the wallet create screen.

# Done Criteria

- Create-related buttons use the outlined yellow style and content-based width.
- Both modal confirm buttons have larger top separation from the input stack.
- The wallet preview is reduced to a single centered JACK coin card with the requested text adjustments.
- `FE-ssatto` builds successfully.
