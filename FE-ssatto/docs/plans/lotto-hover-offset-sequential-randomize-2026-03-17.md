# Goal

Adjust the lotto participation CTA hover layout and change the random number generation UX so six lotto slots resolve from left to right at 0.5 second intervals instead of resolving all at once.

# Scope

- Update the hover-state label position for the lotto participation button.
- Update the lotto random generation animation and reveal sequence in the draw view.
- Preserve the existing selected-number data shape and participation flow.
- Exclude unrelated layout, domain data, and modal behavior changes.

# Reference Specs

- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers

- Shared UI component layer:
  - `src/components/common/InteractiveHoverButton.tsx`
- Lottery feature UI layer:
  - `src/components/lotto/HexPicker.tsx`

# Failure Points

- Hover-state translation could misalign the label or clip text on smaller widths.
- Sequential reveal timers could leak across rerenders or repeated clicks.
- Randomization could end in a partially locked state if cleanup is incomplete.
- Slot controls could remain interactive during animation and corrupt the staged reveal.

# Implementation Steps

1. Add the required hover-state horizontal offset to the CTA hover label.
2. Replace the current single-phase randomization with a staged sequence:
   - precompute final slot values
   - animate unresolved slots
   - lock one slot every 500ms from left to right
   - stop timers cleanly after the sixth slot resolves
3. Guard against repeated randomize actions while animation is active.
4. Ensure cleanup runs on unmount and after completion.

# Test Checklist

- Verify the hover label shifts slightly to the right in hover state.
- Verify the randomize action locks slot 1 through slot 6 in order at 0.5 second intervals.
- Verify the final selected values remain stable after the sequence completes.
- Verify the randomize button remains disabled during the staged reveal.
- Run `npm run build` in `FE-ssatto`.

# Observability Checklist

- No new runtime logging is required for this local UI-only change.
- Timer lifecycle remains explicit and reviewable in component state and refs.
- Failure behavior is bounded to the current view with no cross-page side effects.

# Done Criteria

- Hover-state CTA text is shifted by the requested amount.
- Random slot reveal proceeds left to right with 0.5 second spacing.
- No timer leak or stuck randomizing state is introduced.
- `FE-ssatto` production build succeeds.
