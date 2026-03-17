# Goal
Restore the mined-block section in `FE-ssatto` mining page to the earlier rail-style layout while keeping the current smaller card size, and reduce the brightness of the active reward-policy selector background.

# Scope
- Revert the mined-block section from the stacked stage back to the earlier horizontal rail interaction.
- Keep the current mined-block card size rather than returning to the previous larger card dimensions.
- Remove the visual chain connector between mined-block cards.
- Lower the visual brightness of the selected reward-policy category chip so the label remains easy to read.

# Reference Specs
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/AGENTS.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/domain.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/.agents/rules/frontend.md`
- `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/docs/specs/frontend-spec.md`

# Impacted Layers
- Mining presentation components
- Frontend planning and review documentation

# Failure Points
- Restoring the earlier rail layout could accidentally reintroduce the removed connector UI if the old structure is copied too literally.
- Shrinking the card within the old layout could create cramped internal spacing if the previous proportions are not adjusted.
- Lowering the active selector brightness too far could reduce the contrast between active and inactive states.

# Implementation Steps
1. Restore the mined-block layout to a horizontal rail while keeping the modal behavior.
2. Resize the restored mined-block cards to match the current compact card footprint.
3. Remove any connector/chain visuals between cards.
4. Reduce active-state brightness in the reward-policy selector while preserving state clarity.
5. Run `npm run build` and document the follow-up review.

# Test Checklist
- [ ] Mined blocks render in the earlier horizontal rail layout
- [ ] Mined block cards keep the current compact size
- [ ] No chain connector appears between mined-block cards
- [ ] Clicking a mined block still opens the block detail modal
- [ ] Active reward-policy selector is less bright and remains readable
- [ ] `npm run build` passes

# Observability Checklist
- [ ] Block-detail modal state remains explicit in `MinedBlocks`
- [ ] Reward-policy changes remain presentation-only

# Done Criteria
- Mined-block rail layout is restored with compact cards and no connector UI
- Active reward-policy tab is less visually harsh
- Build validation passes and remaining risks are documented
