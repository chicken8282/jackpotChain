export type LottoParticipationState =
  | "blocked"
  | "require-wallet"
  | "insufficient-pot"
  | "ready";

interface LottoParticipationGuardInput {
  hasWallet: boolean;
  disabled: boolean;
  randomizing: boolean;
  isSubmitting: boolean;
  potBalance: number;
}

export function getLottoParticipationState(input: LottoParticipationGuardInput): LottoParticipationState {
  if (!input.hasWallet) {
    return "require-wallet";
  }

  if (input.disabled || input.randomizing || input.isSubmitting) {
    return "blocked";
  }

  if (input.potBalance < 1) {
    return "insufficient-pot";
  }

  return "ready";
}
