# Goal
Restore the `FE-ssatto` dashboard blockchain-flow block implementation from the referenced upstream repository state and replace the lotto participation CTA with an interactive hover button that changes its label on hover.

# Scope
- Restore the blockchain-flow block presentation component path to the upstream `origin/develop` implementation for the dashboard.
- Replace the lotto `로또 추첨 참여하기` CTA with an adapted interactive hover button that defaults to `로또 추첨` and changes to `참여하기` on hover.
- Preserve existing dashboard modal/data behavior and preserve existing lotto click/disabled behavior.

# Reference Specs
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`
- `origin/develop` in `https://lab.ssafy.com/s14-blochain-sub1/S14P21E202.git`

# Impacted Layers
- Dashboard presentation components
- Lotto interaction component
- Shared UI component layer
- Frontend planning and review documentation

# Failure Points
- Restoring the dashboard block component too broadly could accidentally undo unrelated local dashboard adjustments.
- The new lotto button interaction could break disabled-state styling or make the CTA text unreadable during hover transitions.
- Adding a new shared button component could create avoidable dependency or styling drift if not kept narrow.

# Implementation Steps
1. Add a focused plan doc for the dashboard restore and lotto CTA update.
2. Restore the dashboard blockchain-flow block component files from the upstream reference implementation.
3. Add a small reusable interactive hover button component adapted to the current Vite/Tailwind project.
4. Replace the lotto participation CTA with the new button while preserving action and disabled logic.
5. Run `npm run build` and record a review note with remaining risks.

# Test Checklist
- [ ] Dashboard blockchain-flow blocks match the upstream reference implementation path closely enough for review
- [ ] Lotto CTA still triggers the existing participation handler
- [ ] Lotto CTA remains visually understandable in default, hover, and disabled states
- [ ] `npm run build` passes

# Observability Checklist
- [ ] Dashboard and lotto changes remain presentation-only
- [ ] Dashboard block modal/data flow is unchanged
- [ ] Lotto participation handler and disabled gating remain explicit in `HexPicker`

# Done Criteria
- Dashboard blockchain-flow component path is restored from the upstream reference
- Lotto CTA uses the new interactive hover behavior
- Build validation passes and remaining risks are documented
