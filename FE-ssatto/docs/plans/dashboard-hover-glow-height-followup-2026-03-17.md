# Goal
Refine the `FE-ssatto` dashboard by restoring the block-card hover stroke glow, reducing the block-height and node-network card footprints again, and enlarging the stacked-layer visual inside the block-height card.

# Scope
- Restore a clear border/stroke light response on blockchain-flow block cards when the user hovers near a block.
- Reduce the visual footprint of the `블록 높이` and `노드 네트워크` cards relative to the current dashboard presentation.
- Enlarge the stacked-layer visual inside `블록 높이` to more closely match the attached reference without changing dashboard mock data.

# Reference Specs
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers
- Dashboard presentation components
- Frontend planning and review documentation

# Failure Points
- Restoring the stroke glow too aggressively could overpower text readability on the floating block cards.
- Reducing both cards again while enlarging the block stack could cause clipping if the block-height layout is compressed too far.
- Shrinking the node-network card too far could make node labels unreadable.

# Implementation Steps
1. Add a focused plan doc for the dashboard follow-up.
2. Reintroduce a stronger active hover border glow to blockchain-flow blocks while keeping the current floating animation.
3. Reduce the block-height and node-network cards again with conservative spacing adjustments.
4. Enlarge the block-height stack visual toward the provided reference while keeping content inside the card bounds.
5. Run `npm run build` and record a review note with remaining visual risks.

# Test Checklist
- [ ] Blockchain-flow blocks keep floating and regain a visible hover stroke glow
- [ ] Block-height card is visibly shorter than the current version
- [ ] Node-network card is visibly shorter than the current version
- [ ] The block-height stack visual is materially larger than the current version
- [ ] `npm run build` passes

# Observability Checklist
- [ ] Dashboard behavior remains presentation-only
- [ ] Mock contracts and modal flows remain unchanged
- [ ] Layout changes stay localized to dashboard components

# Done Criteria
- Hover stroke glow is restored on dashboard block cards
- The two dashboard summary cards are reduced again without obvious clipping
- The block-height stack visual is enlarged and closer to the reference
- Build validation passes and remaining risks are documented
