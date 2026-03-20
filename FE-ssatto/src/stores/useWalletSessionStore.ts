import { create } from "zustand";

export const WALLET_IDLE_LOCK_MS = 5 * 60 * 1000;

interface UnlockedWallet {
  privateKey: string;
  unlockedAt: number;
}

interface AccessSession {
  accessToken: string;
  accessTokenExpiresAt: string;
}

interface WalletSessionState {
  accessSessions: Record<string, AccessSession>;
  unlockedWallets: Record<string, UnlockedWallet>;
  lastInteractionAt: number;
  setAccessSession: (walletId: string, accessToken: string, accessTokenExpiresAt: string) => void;
  clearAccessSession: (walletId: string) => void;
  unlockWallet: (walletId: string, privateKey: string) => void;
  lockWallet: (walletId: string) => void;
  lockAllWallets: () => void;
  touchSession: () => void;
  lockExpiredWallets: (maxIdleMs?: number) => boolean;
}

export const useWalletSessionStore = create<WalletSessionState>((set, get) => ({
  accessSessions: {},
  unlockedWallets: {},
  lastInteractionAt: Date.now(),
  setAccessSession: (walletId, accessToken, accessTokenExpiresAt) =>
    set((state) => ({
      accessSessions: {
        ...state.accessSessions,
        [walletId]: {
          accessToken,
          accessTokenExpiresAt,
        },
      },
    })),
  clearAccessSession: (walletId) =>
    set((state) => {
      const nextAccessSessions = { ...state.accessSessions };
      delete nextAccessSessions[walletId];
      return {
        accessSessions: nextAccessSessions,
      };
    }),
  unlockWallet: (walletId, privateKey) =>
    set((state) => ({
      unlockedWallets: {
        ...state.unlockedWallets,
        [walletId]: {
          privateKey,
          unlockedAt: Date.now(),
        },
      },
      lastInteractionAt: Date.now(),
    })),
  lockWallet: (walletId) =>
    set((state) => {
      const nextUnlockedWallets = { ...state.unlockedWallets };
      const nextAccessSessions = { ...state.accessSessions };
      delete nextUnlockedWallets[walletId];
      delete nextAccessSessions[walletId];
      return {
        unlockedWallets: nextUnlockedWallets,
        accessSessions: nextAccessSessions,
      };
    }),
  lockAllWallets: () =>
    set(() => ({
      unlockedWallets: {},
      accessSessions: {},
    })),
  touchSession: () =>
    set(() => ({
      lastInteractionAt: Date.now(),
    })),
  lockExpiredWallets: (maxIdleMs = WALLET_IDLE_LOCK_MS) => {
    const state = get();
    if (Object.keys(state.unlockedWallets).length === 0) {
      return false;
    }
    if (Date.now() - state.lastInteractionAt < maxIdleMs) {
      return false;
    }
    set(() => ({
      unlockedWallets: {},
      accessSessions: {},
    }));
    return true;
  },
}));
