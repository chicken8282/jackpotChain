export type LottoParticipationState =
  | "blocked"
  | "require-wallet"
  | "wallet-locked"
  | "insufficient-pot-exchange"
  | "insufficient-pot-mine"
  | "ready";

interface LottoParticipationGuardInput {
  hasWallet: boolean;
  isWalletLocked: boolean;
  disabled: boolean;
  randomizing: boolean;
  isSubmitting: boolean;
  potBalance: number;
  jackBalance: number;
}

export function getLottoParticipationState(input: LottoParticipationGuardInput): LottoParticipationState {
  if (!input.hasWallet) {
    return "require-wallet";
  }

  if (input.isWalletLocked) {
    return "wallet-locked";
  }

  if (input.disabled || input.randomizing || input.isSubmitting) {
    return "blocked";
  }

  if (input.potBalance < 1) {
    return input.jackBalance >= 100 ? "insufficient-pot-exchange" : "insufficient-pot-mine";
  }

  return "ready";
}
