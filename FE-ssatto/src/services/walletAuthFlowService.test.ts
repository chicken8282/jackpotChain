import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithWallet } from "./walletAuthFlowService";
import * as authService from "./authService";
import { signAuthMessage } from "../lib/crypto/wallet";

vi.mock("./authService", () => ({
  requestAuthChallenge: vi.fn(),
  verifyAuthChallenge: vi.fn(),
}));

describe("wallet auth flow service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("challenge 응답 메시지를 서명해 verify 요청으로 넘긴다", async () => {
    vi.mocked(authService.requestAuthChallenge).mockResolvedValue({
      challengeId: "challenge-001",
      address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
      nonce: "nonce-001",
      message:
        "SSATTO Login\naddress=XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82\nchallengeId=challenge-001\nnonce=nonce-001\nissuedAt=2026-03-20T10:00:00\nexpiresAt=2026-03-20T10:05:00\npurpose=wallet-auth",
      expiresAt: "2026-03-20T10:05:00",
    });
    vi.mocked(authService.verifyAuthChallenge).mockResolvedValue({
      accessToken: "access-token-001",
      walletAddress: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
      accessTokenExpiresAt: "2026-03-20T10:15:00",
      refreshSessionHandle: "session-handle-001",
    });

    const response = await loginWithWallet({
      address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
      privateKey: "1111111111111111111111111111111111111111111111111111111111111111",
    });

    expect(authService.verifyAuthChallenge).toHaveBeenCalledWith({
      challengeId: "challenge-001",
      address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
      publicKey: "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa",
      signature: signAuthMessage(
        "SSATTO Login\naddress=XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82\nchallengeId=challenge-001\nnonce=nonce-001\nissuedAt=2026-03-20T10:00:00\nexpiresAt=2026-03-20T10:05:00\npurpose=wallet-auth",
        "1111111111111111111111111111111111111111111111111111111111111111",
      ),
    });
    expect(response.accessToken).toBe("access-token-001");
  });
});
