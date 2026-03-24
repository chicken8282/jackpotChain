# Implementation Summary
- Rebuilt the mined-block section into a layered featured-card stage where the first card sits at the left/front and later cards offset behind it to the right.
- Kept block-height visibility explicit at the top of every mined-block card and preserved the shared block-detail modal behavior on click.
- Replaced the reward-policy accordion with a left-category/right-detail panel and expanded the policy copy using mining-related details from the repo review docs.

# Checklist Results
- [x] Mined-block cards render as a left-front to right-back stack
- [x] Every mined-block card shows its block height at the top
- [x] Clicking any mined-block card opens the shared block detail modal
- [x] The mined-block section is visually narrower than the previous full-width presentation
- [x] Reward-policy category switching updates the right-side text panel correctly
- [x] Reward-policy copy reflects mining-related content from repo review docs
- [x] `npm run build` passes

# Test Results
- Ran `npm run build` in `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto`
- Result: success

# Remaining Risks
- The stacked mined-block stage is tuned for the current block counts and desktop-oriented mining layout, so if significantly more mined blocks are shown at once, the stage spacing may need another responsive pass.
- The reward-policy copy is grounded in local review docs and intentionally richer than before, but product wording may still need one editorial pass if you want a stricter tone or shorter lines.

# Additional Improvements Needed
- If you want tighter visual matching to the provided card reference, the next pass should only tune card offset distances, skew angle, and section width in the browser.
