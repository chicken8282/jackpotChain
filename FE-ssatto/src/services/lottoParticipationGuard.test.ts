import { describe, expect, it } from "vitest";
import { getLottoParticipationState } from "./lottoParticipationGuard";

describe("lotto participation guard", () => {
  it("registered wallet이 없으면 wallet onboarding을 요구한다", () => {
    expect(
      getLottoParticipationState({
        hasWallet: false,
        isWalletLocked: false,
        disabled: false,
        randomizing: false,
        isSubmitting: false,
        potBalance: 3,
        jackBalance: 0,
      }),
    ).toBe("require-wallet");
  });

  it("지갑이 잠겨 있으면 wallet-locked를 반환한다", () => {
    expect(
      getLottoParticipationState({
        hasWallet: true,
        isWalletLocked: true,
        disabled: false,
        randomizing: false,
        isSubmitting: false,
        potBalance: 0,
        jackBalance: 0,
      }),
    ).toBe("wallet-locked");
  });

  it("POT이 부족하고 JACK >= 100이면 교환 유도 상태를 반환한다", () => {
    expect(
      getLottoParticipationState({
        hasWallet: true,
        isWalletLocked: false,
        disabled: false,
        randomizing: false,
        isSubmitting: false,
        potBalance: 0,
        jackBalance: 100,
      }),
    ).toBe("insufficient-pot-exchange");
  });

  it("POT이 부족하고 JACK < 100이면 채굴 유도 상태를 반환한다", () => {
    expect(
      getLottoParticipationState({
        hasWallet: true,
        isWalletLocked: false,
        disabled: false,
        randomizing: false,
        isSubmitting: false,
        potBalance: 0,
        jackBalance: 50,
      }),
    ).toBe("insufficient-pot-mine");
  });

  it("조건이 충족되면 참여 가능 상태를 반환한다", () => {
    expect(
      getLottoParticipationState({
        hasWallet: true,
        isWalletLocked: false,
        disabled: false,
        randomizing: false,
        isSubmitting: false,
        potBalance: 1,
        jackBalance: 0,
      }),
    ).toBe("ready");
  });
});
