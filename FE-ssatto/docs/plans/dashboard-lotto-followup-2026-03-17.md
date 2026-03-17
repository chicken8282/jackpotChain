# Goal
Apply a focused dashboard height reduction and restore the lottery history comparison modal in `FE-ssatto`.

# Scope
- Reduce the rendered height of the dashboard block-height and node-network cards by about 100px while keeping them aligned.
- Restore the lotto participation-history click flow so a modal opens and compares the user's chosen numbers with the block result.

# Reference Specs
- `C:\Users\SSAFY\S14P21E202\AGENTS.md`
- `C:\Users\SSAFY\S14P21E202\.agents\rules\domain.md`
- `C:\Users\SSAFY\S14P21E202\.agents\rules\frontend.md`
- `C:\Users\SSAFY\S14P21E202\.agents\specs\frontend-spec.md`

# Impacted Layers
- Dashboard presentation components
- Lottery interaction component
- Review documentation

# Failure Points
- Shrinking the dashboard cards too aggressively could reintroduce clipping or uneven alignment.
- Rebuilding the lotto history modal data could break click behavior or desync store-backed entries from the local history list.

# Implementation Steps
1. Reduce internal vertical spacing and content height in the two dashboard cards.
2. Extend lottery history modal data to include block result values and restore the click-to-open comparison flow.
3. Build the frontend and write a short review note.

# Test Checklist
- [ ] Dashboard block-height card is visibly shorter
- [ ] Dashboard node-network card matches the reduced height
- [ ] Clicking a lotto history row opens a comparison modal
- [ ] The modal shows selected values and block-result values side by side
- [ ] `npm run build` passes

# Observability Checklist
- [ ] History modal open state remains explicit in component state
- [ ] Dashboard size changes remain localized to the affected widgets

# Done Criteria
- The two dashboard cards are reduced and aligned
- Lotto history comparison modal works again from the history tab
- Build validation passes and remaining risks are documented
