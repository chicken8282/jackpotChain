import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WalletThemeId } from "../components/wallet/walletThemes";

export const WALLET_STORE_KEY = "ssatto-wallet-session-v2";
export const WALLET_STORE_SCHEMA_VERSION = 2;

export interface WalletMetadata {
  walletId: string;
  keystoreId: string;
  nickname: string;
  address: string;
  walletColor: WalletThemeId;
  refreshSessionHandle: string | null;
}

interface WalletStoreState {
  schemaVersion: number;
  wallets: WalletMetadata[];
  activeAddress: string | null;
  upsertWallet: (wallet: WalletMetadata) => void;
  replaceWallets: (wallets: WalletMetadata[]) => void;
  setActiveAddress: (address: string | null) => void;
}

export const useWalletStore = create<WalletStoreState>()(
  persist(
    (set) => ({
      schemaVersion: WALLET_STORE_SCHEMA_VERSION,
      wallets: [],
      activeAddress: null,
      upsertWallet: (wallet) =>
        set((state) => {
          const existingWallet = state.wallets.find((item) => item.address === wallet.address);
          const nextWallets = [
            ...state.wallets.filter((item) => item.address !== wallet.address),
            {
              ...existingWallet,
              ...wallet,
              refreshSessionHandle: wallet.refreshSessionHandle ?? existingWallet?.refreshSessionHandle ?? null,
            },
          ];

          return {
            wallets: nextWallets,
            activeAddress: wallet.address,
          };
        }),
      replaceWallets: (wallets) =>
        set((state) => ({
          wallets,
          activeAddress:
            state.activeAddress && wallets.some((wallet) => wallet.address === state.activeAddress)
              ? state.activeAddress
              : wallets[0]?.address ?? null,
        })),
      setActiveAddress: (address) =>
        set(() => ({
          activeAddress: address,
        })),
    }),
    {
      name: WALLET_STORE_KEY,
      version: WALLET_STORE_SCHEMA_VERSION,
    },
  ),
);
