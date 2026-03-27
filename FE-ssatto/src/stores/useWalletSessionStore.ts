import { create } from "zustand";
import { clearPendingState } from "../services/tx/pendingTxTracker";

export const WALLET_IDLE_LOCK_MS = 24 * 60 * 60 * 1000;

// sessionStorage key for persisting access tokens across normal page reloads (Ctrl+R).
// Cleared explicitly on hard refresh (Ctrl+Shift+R) via useHardRefreshHandler.
const SESSION_TOKENS_KEY = "ssatto-access-sessions";

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

function loadInitialAccessSessions(): Record<string, AccessSession> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(SESSION_TOKENS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AccessSession>;
    const now = Date.now();
    const valid: Record<string, AccessSession> = {};
    for (const [walletId, session] of Object.entries(parsed)) {
      if (
        session.accessToken &&
        session.accessTokenExpiresAt &&
        new Date(session.accessTokenExpiresAt).getTime() > now
      ) {
        valid[walletId] = session;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function persistAccessSessions(sessions: Record<string, AccessSession>): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_TOKENS_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage errors (e.g., private browsing quota exceeded)
  }
}

export const useWalletSessionStore = create<WalletSessionState>((set, get) => ({
  accessSessions: loadInitialAccessSessions(),
  unlockedWallets: {},
  lastInteractionAt: Date.now(),
  setAccessSession: (walletId, accessToken, accessTokenExpiresAt) =>
    set((state) => {
      const nextSessions = {
        ...state.accessSessions,
        [walletId]: { accessToken, accessTokenExpiresAt },
      };
      persistAccessSessions(nextSessions);
      return { accessSessions: nextSessions };
    }),
  clearAccessSession: (walletId) =>
    set((state) => {
      const nextAccessSessions = { ...state.accessSessions };
      delete nextAccessSessions[walletId];
      persistAccessSessions(nextAccessSessions);
      return { accessSessions: nextAccessSessions };
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
      clearPendingState();
      const nextUnlockedWallets = { ...state.unlockedWallets };
      const nextAccessSessions = { ...state.accessSessions };
      delete nextUnlockedWallets[walletId];
      delete nextAccessSessions[walletId];
      persistAccessSessions(nextAccessSessions);
      return {
        unlockedWallets: nextUnlockedWallets,
        accessSessions: nextAccessSessions,
      };
    }),
  lockAllWallets: () => {
    clearPendingState();
    return set(() => {
      persistAccessSessions({});
      return {
        unlockedWallets: {},
        accessSessions: {},
      };
    });
  },
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
    clearPendingState();
    persistAccessSessions({});
    set(() => ({
      unlockedWallets: {},
      accessSessions: {},
    }));
    return true;
  },
}));
