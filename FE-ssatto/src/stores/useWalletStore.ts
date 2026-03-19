import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WalletThemeId } from "../components/wallet/walletThemes";

export interface LocalWallet {
  nickname: string;
  address: string;
  privateKey: string;
  walletColor: WalletThemeId;
}

interface WalletStoreState {
  wallets: LocalWallet[];
  activeAddress: string | null;
  token: string | null;
  createWallet: (
    nickname?: string,
    color?: WalletThemeId,
    credentials?: { address?: string; privateKey?: string },
  ) => void;
  restoreWallet: (
    privateKey: string,
    address: string,
    nickname?: string,
    color?: WalletThemeId,
  ) => void;
  setActiveAddress: (address: string) => void;
  setToken: (token: string | null) => void;
}

const makeId = (length: number, fallback: string) =>
  `${Math.random().toString(16).slice(2).toUpperCase().padEnd(length, fallback).slice(0, length)}`;

export const useWalletStore = create<WalletStoreState>()(
  persist(
    (set) => ({
      wallets: [],
      activeAddress: null,
      token: null,
      createWallet: (nickname = "내 지갑", color = "gray", credentials) =>
        set((state) => {
          const address = credentials?.address ?? `0x${makeId(40, "0")}`;
          const privateKey = credentials?.privateKey ?? `0x${makeId(64, "A")}`;
          const nextWallets = [
            ...state.wallets.filter((wallet) => wallet.address !== address),
            { nickname, address, privateKey, walletColor: color },
          ];

          return {
            wallets: nextWallets,
            activeAddress: address,
          };
        }),
      restoreWallet: (privateKey, address, nickname = "기존 지갑", color = "gray") =>
        set((state) => {
          const nextWallets = [
            ...state.wallets.filter((wallet) => wallet.address !== address),
            { nickname, address, privateKey, walletColor: color },
          ];

          return {
            wallets: nextWallets,
            activeAddress: address,
          };
        }),
      setActiveAddress: (address) =>
        set(() => ({
          activeAddress: address,
        })),
      setToken: (token) =>
        set(() => ({
          token,
        })),
    }),
    {
      name: "ssatto-wallet-session",
    },
  ),
);
