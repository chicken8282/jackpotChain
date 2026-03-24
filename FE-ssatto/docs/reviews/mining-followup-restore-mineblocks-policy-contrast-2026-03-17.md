# Implementation Summary
- Restored the mined-block section to the earlier horizontal rail-style layout while keeping the newer compact card size.
- Removed the connector/chain UI between mined-block cards and preserved the shared block-detail modal behavior.
- Reduced the brightness of the active reward-policy selector state so the selected label remains easier to read.

# Checklist Results
- [x] Mined blocks render in the earlier horizontal rail layout
- [x] Mined block cards keep the current compact size
- [x] No chain connector appears between mined-block cards
- [x] Clicking a mined block still opens the block detail modal
- [x] Active reward-policy selector is less bright and remains readable
- [x] `npm run build` passes

# Test Results
- Ran `npm run build` in `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto`
- Result: success

# Remaining Risks
- The rail layout is restored with compact cards, so if you later want denser block metadata inside each card, spacing may need another pass.
- The active reward-policy background is dimmer now, but final contrast preference is still subjective and may need one more browser-side adjustment.

# Additional Improvements Needed
- If you want a more exact visual balance, the next pass should only tune card padding and the active selector tint strength.
