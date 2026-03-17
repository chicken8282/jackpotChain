# Goal
Apply a narrow dashboard visual adjustment in `FE-ssatto` by adding floating motion to the blockchain-flow blocks and reducing the block-height and node-network cards to roughly two-thirds of their current rendered height.

# Scope
- Add a floating-only animation to blockchain-flow block cards without changing mock contracts, modal behavior, or the existing card glow treatment.
- Reduce the rendered height of the block-height and node-network cards from their current `min-h-[280px]` presentation to an approximately two-thirds-sized layout.
- Resize internal visuals in the two shortened cards so they remain readable and do not clip.

# Reference Specs
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers
- Dashboard presentation components
- Frontend planning and review documentation

# Failure Points
- Added floating motion could interfere with the existing hover emphasis or make click targets feel unstable if the amplitude is too large.
- Shortening the summary cards too aggressively could cause clipping, unreadable text, or uneven alignment between the two cards.
- Shrinking the node-network SVG without adjusting node positions and labels could reduce readability.

# Implementation Steps
1. Add a focused plan doc for the dashboard-only scope.
2. Add a bounded looping float animation to block cards in the blockchain visualizer path.
3. Reduce `BlockHeight` card height and scale down its internal typography and stack visual.
4. Reduce `NodeNetwork` card height and scale down its internal SVG layout and spacing to match.
5. Run `npm run build` and write a review note.

# Test Checklist
- [ ] Blockchain-flow blocks visibly float while preserving click and hover behavior
- [ ] Block-height card is reduced to roughly two-thirds of its current size without clipping
- [ ] Node-network card is reduced to roughly two-thirds of its current size without clipping
- [ ] The two reduced cards remain visually aligned in the dashboard grid
- [ ] `npm run build` passes

# Observability Checklist
- [ ] Dashboard behavior changes remain presentation-only
- [ ] Mock contracts and block modal state flow are unchanged
- [ ] Reduced heights remain localized to the two dashboard widgets

# Done Criteria
- Blockchain-flow blocks have a floating effect
- Block-height and node-network cards are visibly shorter and still readable
- Build validation passes and remaining risks are documented
