import { beforeEach, describe, expect, test } from "vitest";
import { useWalletStore } from "./useWalletStore";

describe("useWalletStore", () => {
  beforeEach(() => {
    useWalletStore.setState({
      schemaVersion: 2,
      wallets: [],
      activeAddress: null,
    });
  });

  test("preserves existing wallet order when updating wallet metadata", () => {
    const firstWallet = {
      walletId: "wallet-a",
      keystoreId: "keystore-a",
      nickname: "지갑 A",
      address: "JackpotAddressA",
      walletColor: "gray" as const,
      refreshSessionHandle: "session-a",
    };
    const secondWallet = {
      walletId: "wallet-b",
      keystoreId: "keystore-b",
      nickname: "지갑 B",
      address: "JackpotAddressB",
      walletColor: "blue" as const,
      refreshSessionHandle: "session-b",
    };

    useWalletStore.getState().replaceWallets([firstWallet, secondWallet]);
    useWalletStore.getState().setActiveAddress(firstWallet.address);

    useWalletStore.getState().upsertWallet({
      ...firstWallet,
      refreshSessionHandle: "session-a-next",
    });

    const state = useWalletStore.getState();

    expect(state.wallets.map((wallet) => wallet.address)).toEqual([
      firstWallet.address,
      secondWallet.address,
    ]);
    expect(state.wallets[0]?.refreshSessionHandle).toBe("session-a-next");
    expect(state.activeAddress).toBe(firstWallet.address);
  });
});
