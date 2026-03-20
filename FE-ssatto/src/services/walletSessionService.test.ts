import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletMetadata } from "../stores/useWalletStore";
import { restoreWalletSession } from "./walletSessionService";
import * as authService from "./authService";
import * as walletAuthFlowService from "./walletAuthFlowService";

vi.mock("./authService", () => ({
  refreshAuthSession: vi.fn(),
}));

vi.mock("./walletAuthFlowService", () => ({
  loginWithWallet: vi.fn(),
}));

describe("wallet session service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refresh session handle이 있으면 reopen 시 refresh를 먼저 시도한다", async () => {
    const wallet: WalletMetadata = {
      walletId: "wallet-001",
      keystoreId: "keystore-001",
      nickname: "내 지갑",
      address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
      walletColor: "gray",
      refreshSessionHandle: "session-handle-001",
    };

    vi.mocked(authService.refreshAuthSession).mockResolvedValue({
      accessToken: "access-token-001",
      walletAddress: wallet.address,
      accessTokenExpiresAt: "2026-03-20T10:30:00",
      refreshSessionHandle: "session-handle-001",
    });

    const result = await restoreWalletSession({
      wallet,
      currentAccessToken: null,
      currentAccessTokenExpiresAt: null,
    });

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("refresh 결과가 없습니다.");
    }
    expect(result.mode).toBe("refresh");
    expect(authService.refreshAuthSession).toHaveBeenCalledWith({
      sessionHandle: "session-handle-001",
    });
  });

  it("refresh가 불가능하고 unlocked private key가 있으면 challenge 로그인으로 fallback한다", async () => {
    const wallet: WalletMetadata = {
      walletId: "wallet-001",
      keystoreId: "keystore-001",
      nickname: "내 지갑",
      address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
      walletColor: "gray",
      refreshSessionHandle: null,
    };

    vi.mocked(walletAuthFlowService.loginWithWallet).mockResolvedValue({
      accessToken: "access-token-002",
      walletAddress: wallet.address,
      accessTokenExpiresAt: "2026-03-20T10:40:00",
      refreshSessionHandle: "session-handle-002",
    });

    const result = await restoreWalletSession({
      wallet,
      currentAccessToken: null,
      currentAccessTokenExpiresAt: null,
      unlockedPrivateKey: "1111111111111111111111111111111111111111111111111111111111111111",
    });

    expect(result).not.toBeNull();
    if (!result) {
      throw new Error("challenge 결과가 없습니다.");
    }
    expect(result.mode).toBe("challenge");
    expect(walletAuthFlowService.loginWithWallet).toHaveBeenCalled();
  });
});
