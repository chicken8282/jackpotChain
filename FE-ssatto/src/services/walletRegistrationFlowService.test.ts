import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import { registerWalletWithRollback } from "./walletRegistrationFlowService";

describe("walletRegistrationFlowService", () => {
  it("새 지갑 등록이 실패하면 생성한 keystore를 롤백한다", async () => {
    const secureWallet = vi.fn().mockResolvedValue({
      metadata: {
        walletId: "wallet-001",
        keystoreId: "keystore-001",
        nickname: "내 지갑",
        address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
        walletColor: "gray",
        refreshSessionHandle: null,
      },
      privateKey: "11".repeat(32),
    });
    const registerWallet = vi.fn().mockRejectedValue(new ApiError("블록체인 RPC 호출에 실패했습니다.", 503));
    const deleteWalletKeystore = vi.fn().mockResolvedValue(undefined);

    await expect(
      registerWalletWithRollback(
        {
          walletNickname: "내 지갑",
          type: "create",
          color: "gray",
          payload: {
            address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            privateKey: "11".repeat(32),
            password: "password123!",
          },
        },
        {
          secureWallet,
          registerWallet,
          deleteWalletKeystore,
        },
      ),
    ).rejects.toBeInstanceOf(ApiError);

    expect(deleteWalletKeystore).toHaveBeenCalledWith("keystore-001");
  });

  it("기존 지갑 복구 등록에서 중복 응답이면 로컬 keystore를 유지한다", async () => {
    const secureWallet = vi.fn().mockResolvedValue({
      metadata: {
        walletId: "wallet-002",
        keystoreId: "keystore-002",
        nickname: "기존 지갑",
        address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
        walletColor: "gray",
        refreshSessionHandle: null,
      },
      privateKey: "22".repeat(32),
    });
    const registerWallet = vi.fn().mockRejectedValue(new ApiError("이미 등록된 지갑 주소입니다.", 409));
    const deleteWalletKeystore = vi.fn().mockResolvedValue(undefined);

    const result = await registerWalletWithRollback(
      {
        walletNickname: "기존 지갑",
        type: "restore",
        color: "gray",
        payload: {
          address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
          privateKey: "22".repeat(32),
          password: "password123!",
        },
      },
      {
        secureWallet,
        registerWallet,
        deleteWalletKeystore,
      },
    );

    expect(result.status).toBe("duplicate_restore");
    expect(deleteWalletKeystore).not.toHaveBeenCalled();
  });
});
