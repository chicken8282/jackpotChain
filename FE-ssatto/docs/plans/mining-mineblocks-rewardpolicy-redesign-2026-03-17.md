# Goal
Redesign the `FE-ssatto` mining page so the mined-block section uses a stacked featured-card layout and the reward-policy section uses a left-category/right-detail panel with richer mining policy copy.

# Scope
- Replace the current mined-block horizontal rail with a layered card stack where the first block appears at the left/front and later blocks are offset behind it to the right.
- Keep block-height visibility explicit on every mined-block card and preserve click-to-open behavior for the shared block detail modal.
- Reduce the visual width of the mined-block section so it no longer spans the same full width as the current layout.
- Replace the reward-policy accordion with a category selector on the left and a text-focused detail panel on the right using mining-related content derived from the repo review docs.

# Reference Specs
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/docs/reviews/funtional-spec.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/docs/reviews/frontend-domain-audit-2026-03-16.md`

# Impacted Layers
- Mining presentation components
- Shared block-detail modal integration path
- Frontend planning and review documentation

# Failure Points
- A stacked mined-block layout could make later cards hard to click if offsets or z-index ordering are wrong.
- Narrowing the mined-block section too aggressively could break readability on smaller desktop widths.
- Replacing the reward-policy accordion with a side-by-side layout could regress mobile usability if it does not collapse cleanly.

# Implementation Steps
1. Add a focused plan doc for the mining redesign scope.
2. Rebuild `MinedBlocks` around a layered card stage with explicit block-height labels, preserved modal behavior, and a narrower card container.
3. Replace `RewardPolicy` with a state-driven category selector and a richer text panel using mining policy details grounded in repo review docs.
4. Review responsive behavior and keep the copy/data flow local to the mining layer.
5. Run `npm run build` and write a review note with remaining risks.

# Test Checklist
- [ ] Mined-block cards render as a left-front to right-back stack
- [ ] Every mined-block card shows its block height at the top
- [ ] Clicking any mined-block card opens the shared block detail modal
- [ ] The mined-block section is visually narrower than the current full-width presentation
- [ ] Reward-policy category switching updates the right-side text panel correctly
- [ ] Reward-policy copy reflects mining-related content from repo review docs
- [ ] `npm run build` passes

# Observability Checklist
- [ ] Block-detail modal state remains explicit in `MinedBlocks`
- [ ] Mining reward policy content remains local mock/UI copy and does not alter data contracts
- [ ] Layout changes stay localized to mining components

# Done Criteria
- The mining page shows stacked mined-block cards with preserved detail-modal behavior
- The mined-block section width is reduced and visually intentional
- Reward policy uses the new two-panel interaction with richer mining copy
- Build validation passes and remaining risks are documented
