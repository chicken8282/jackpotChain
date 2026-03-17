# Goal
Implement targeted UI and interaction fixes across Dashboard, Lottery, Wallet, and Mining in `FE-ssatto` while preserving the current mock-driven frontend architecture.

# Scope
- Dashboard chain flow header spacing, block hash formatting, and card height alignment
- Lottery jackpot pool coin animation position and participation success feedback flow
- Wallet creation screen sizing, color clarity, mnemonic visibility, and created-wallet color persistence
- Mining block click behavior to open the shared block detail modal

# Reference Specs
- `C:\Users\SSAFY\S14P21E202\AGENTS.md`
- `C:\Users\SSAFY\S14P21E202\.agents\rules\domain.md`
- `C:\Users\SSAFY\S14P21E202\.agents\rules\frontend.md`
- `C:\Users\SSAFY\S14P21E202\.agents\specs\frontend-spec.md`

# Impacted Layers
- Route/page composition: wallet page
- Domain UI components: dashboard, lotto, wallet, mining
- Shared client state: wallet store
- Project docs: plan and review notes

# Failure Points
- Layout-only edits may cause clipping or uneven card heights on smaller breakpoints
- Wallet color persistence may desync between creation flow and wallet display if state shape is incomplete
- Modal replacement for lottery participation may break the expected auto-navigation timing
- Mining modal reuse may fail if the shared modal receives an invalid block-detail shape

# Implementation Steps
1. Add the planning doc and confirm impacted UI/state files.
2. Update dashboard components for spacing, compact hash suffix rendering, and aligned card heights.
3. Adjust lottery jackpot animation position and replace `alert()` with an in-app timed success modal that switches tabs.
4. Extend wallet state with selected color and ensure create flow, preview, and wallet display consume the same color source.
5. Restore the 12-word mnemonic presentation in the wallet-create modal and tighten wallet layout/button sizing.
6. Reuse the shared block detail modal in mining with a valid mapped detail payload.
7. Run a production build and document results plus residual risks.

# Test Checklist
- [ ] Dashboard block cards show only two trailing hex digits
- [ ] Dashboard block height and node network cards align vertically without excess inner padding
- [ ] Lottery participation opens custom success modal, closes after about 2 seconds, and switches to history
- [ ] Wallet create screen reflects color selection clearly and the created wallet view keeps the selected color
- [ ] Wallet create modal shows a 12-word mnemonic before wallet creation completes
- [ ] Mining block click opens the shared block detail modal without blank-screen behavior
- [ ] `npm run build` passes

# Observability Checklist
- [ ] Interactive state changes remain explicit in component state or store state
- [ ] No browser-native alert dependency remains for lottery participation feedback
- [ ] Failure behavior stays bounded to the affected widget when invalid input occurs

# Done Criteria
- Requested UI adjustments are implemented in the targeted screens
- Wallet color choice is preserved in mock client state for the active wallet
- Lottery and mining interactions use in-app modal feedback
- Build validation passes and remaining risks are documented
