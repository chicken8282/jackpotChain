# Goal
Update FE-ssatto wallet and lottery flows so wallet restore uses `privateKey + address`, wallet creation exposes address/private key credentials, JACK-to-POT remains the only exchange direction, and the lottery history modal opens reliably.

# Scope
- Replace mnemonic-based wallet restore UI with private-key and address inputs
- Show generated private key and wallet address during wallet creation
- Ensure the created wallet card shows the same generated address
- Remove POT-to-JACK exchange UI and logic from wallet and lottery pages
- Fix lottery history modal opening from the history tab

# Reference Specs
- `C:\Users\SSAFY\S14P21E202\AGENTS.md`
- `C:\Users\SSAFY\S14P21E202\.agents\rules\domain.md`
- `C:\Users\SSAFY\S14P21E202\.agents\rules\frontend.md`
- `C:\Users\SSAFY\S14P21E202\docs\specs\frontend-spec.md`

# Impacted Layers
- Wallet presentation components
- Wallet client state/store
- Lottery interaction component
- Review documentation

# Failure Points
- Generated credentials shown in the create modal could drift from the stored wallet values if state is not passed explicitly.
- Removing exchange directions could leave hidden paths still callable if the UI and action logic are not both updated.
- Lottery history modal could still fail if the selected-history render path remains indirect.

# Implementation Steps
1. Refactor wallet store contracts for generated credentials and restore inputs.
2. Rewrite wallet create/restore UI to use `privateKey + address`.
3. Update wallet card and lottery exchange controls to support only JACK-to-POT.
4. Simplify lottery history modal rendering and confirm row click opens it.
5. Run a build and record results.

# Test Checklist
- [ ] Wallet create modal shows generated private key and address
- [ ] Wallet restore modal accepts private key and address instead of mnemonic words
- [ ] Created wallet card shows the generated address
- [ ] Wallet exchange only supports JACK-to-POT
- [ ] Lottery exchange only supports JACK-to-POT
- [ ] Lottery history row click opens the comparison modal
- [ ] `npm run build` passes

# Observability Checklist
- [ ] Restore input errors remain local to the wallet restore modal
- [ ] Exchange direction is explicit in UI and state transitions
- [ ] Lottery modal open state remains explicit in component state

# Done Criteria
- Wallet restore no longer depends on mnemonic UI
- Generated wallet credentials are visible and consistent
- Only JACK-to-POT exchange remains
- Lottery history modal opens reliably
- Build validation passes
