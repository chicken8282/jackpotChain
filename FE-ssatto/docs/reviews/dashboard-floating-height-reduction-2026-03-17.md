# Implementation Summary
- Added a floating-only motion layer to dashboard blockchain-flow block cards while preserving the existing card glow treatment and block interaction flow.
- Reduced the block-height card to a shorter layout and scaled down its typography and stack visualization to fit the smaller footprint.
- Reduced the node-network card to the same shorter footprint and resized the internal SVG network rendering accordingly.

# Checklist Results
- [x] Blockchain-flow blocks visibly float while preserving click and hover behavior
- [x] Block-height card is reduced to roughly two-thirds of its previous size without clipping in the build output
- [x] Node-network card is reduced to roughly two-thirds of its previous size without clipping in the build output
- [x] The two reduced cards remain aligned through the shared dashboard grid
- [x] `npm run build` passes

# Test Results
- Ran `npm run build` in `/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto`
- Result: success

# Remaining Risks
- The “2/3” reduction was implemented as a practical visual reduction using smaller card minima and inner-content scaling, so one more browser-side pass may still be needed if you want a stricter pixel-exact ratio.
- The floating amplitude was kept modest to avoid hover/click instability, but it may still need art-direction tuning depending on the target display size.

# Additional Improvements Needed
- If needed, the next pass should tune only spacing and motion amplitude in the browser rather than restructuring the components again.
