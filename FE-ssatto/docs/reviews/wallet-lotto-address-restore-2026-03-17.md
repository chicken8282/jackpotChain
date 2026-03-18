# Implementation Summary

- Replaced mnemonic-based wallet creation and restore UI with wallet address plus private key flows for the main wallet creation screen.
- Ensured generated wallet credentials are surfaced in the creation modal and that wallet cards continue to display the generated wallet address.
- Restored the lotto history comparison modal so clicking a participation item opens a side-by-side comparison against block result values.
- Restricted exchange controls on wallet and lotto screens to the `JACK -> POT` direction only.

# Checklist Results

- Scalability: No new global state was introduced beyond the existing wallet store. The changes remain local to wallet and lotto UI composition.
- Availability: Modal flows now use direct portal rendering and no longer rely on the previously fragile history-modal path.
- Reliability: Wallet restore requires both address and private key before submission. Lotto history entries are deterministically mapped from stored entry data.
- Performance: No new heavy dependencies or expensive render loops were added. Existing randomizer behavior remains bounded.

# Test Results

- `npm run build`
- Result: passed

# Remaining Risks

- Several existing Korean UI strings in untouched files still appear garbled in the terminal output due local encoding/display issues; the build is clean, but a browser pass is still recommended for final visual verification.
- The wallet carousel navigation arrows remain in place because the request was implemented against the exchange-direction control, not the card navigation control.

# Additional Improvements Needed

- If the TUI contract is finalized, replace the current mock address/private-key generators with the real wallet generation and restore API contract.
- Consider centralizing wallet credential formatting and validation rules to avoid drift between main wallet creation and add-wallet modal flows.
