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
  /** 로또 commit 후 블록 확정 전까지 즉시 표시할 POT 오프셋 (POT 단위). persist 제외. */
  potOptimisticOffsetByAddress: Record<string, number>;
  upsertWallet: (wallet: WalletMetadata) => void;
  replaceWallets: (wallets: WalletMetadata[]) => void;
  setActiveAddress: (address: string | null) => void;
  applyPotOptimisticOffset: (address: string, delta: number) => void;
  clearPotOptimisticOffset: (address: string) => void;
}

export const useWalletStore = create<WalletStoreState>()(
  persist(
    (set) => ({
      schemaVersion: WALLET_STORE_SCHEMA_VERSION,
      wallets: [],
      activeAddress: null,
      potOptimisticOffsetByAddress: {},
      upsertWallet: (wallet) =>
        set((state) => {
          const existingIndex = state.wallets.findIndex((item) => item.address === wallet.address);
          const existingWallet = existingIndex >= 0 ? state.wallets[existingIndex] : undefined;
          const mergedWallet = {
            ...existingWallet,
            ...wallet,
            refreshSessionHandle: wallet.refreshSessionHandle ?? existingWallet?.refreshSessionHandle ?? null,
          };
          const nextWallets =
            existingIndex >= 0
              ? state.wallets.map((item, index) => (index === existingIndex ? mergedWallet : item))
              : [...state.wallets, mergedWallet];

          return {
            wallets: nextWallets,
            activeAddress: existingIndex < 0 ? wallet.address : state.activeAddress,
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
      applyPotOptimisticOffset: (address, delta) =>
        set((state) => ({
          potOptimisticOffsetByAddress: {
            ...state.potOptimisticOffsetByAddress,
            [address]: (state.potOptimisticOffsetByAddress[address] ?? 0) + delta,
          },
        })),
      clearPotOptimisticOffset: (address) =>
        set((state) => {
          const next = { ...state.potOptimisticOffsetByAddress };
          delete next[address];
          return { potOptimisticOffsetByAddress: next };
        }),
    }),
    {
      name: WALLET_STORE_KEY,
      version: WALLET_STORE_SCHEMA_VERSION,
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        wallets: state.wallets,
        activeAddress: state.activeAddress,
      }),
    },
  ),
);
