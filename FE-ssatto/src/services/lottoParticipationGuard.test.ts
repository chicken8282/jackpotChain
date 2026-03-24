import { describe, expect, it } from "vitest";
import { getLottoParticipationState } from "./lottoParticipationGuard";

describe("lotto participation guard", () => {
  it("registered wallet이 없으면 wallet onboarding을 요구한다", () => {
    expect(
      getLottoParticipationState({
        hasWallet: false,
        disabled: false,
        randomizing: false,
        isSubmitting: false,
        potBalance: 3,
      }),
    ).toBe("require-wallet");
  });

  it("POT이 부족하면 참여 불가 상태를 반환한다", () => {
    expect(
      getLottoParticipationState({
        hasWallet: true,
        disabled: false,
        randomizing: false,
        isSubmitting: false,
        potBalance: 0,
      }),
    ).toBe("insufficient-pot");
  });

  it("조건이 충족되면 참여 가능 상태를 반환한다", () => {
    expect(
      getLottoParticipationState({
        hasWallet: true,
        disabled: false,
        randomizing: false,
        isSubmitting: false,
        potBalance: 1,
      }),
    ).toBe("ready");
  });
});
