import { useEffect } from "react";

// Must stay in sync with the key used in useWalletSessionStore
const SESSION_TOKENS_KEY = "ssatto-access-sessions";

// localStorage flag set on Ctrl+Shift+R to force re-auth after the hard reload
const FORCE_REAUTH_KEY = "ssatto-reauth-required";

// How long (ms) the flag is considered valid after being set.
// Guards against the edge case where Ctrl+Shift+R is pressed but the reload is cancelled.
const FORCE_REAUTH_WINDOW_MS = 10_000;

/**
 * Checks whether a Ctrl+Shift+R hard-refresh was the cause of this page load.
 * Consumes the flag so subsequent calls in the same load return false.
 */
export function consumeForceReauthFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(FORCE_REAUTH_KEY);
    if (!raw) return false;
    const timestamp = parseInt(raw, 10);
    window.localStorage.removeItem(FORCE_REAUTH_KEY);
    if (Number.isNaN(timestamp)) return false;
    return Date.now() - timestamp < FORCE_REAUTH_WINDOW_MS;
  } catch {
    return false;
  }
}

/**
 * Registers a global keydown listener that detects Ctrl+Shift+R (hard refresh).
 * On hard refresh:
 *   1. Clears access tokens from sessionStorage so the session is not restored.
 *   2. Sets a short-lived localStorage flag so WalletPage can skip session
 *      restoration entirely and show the unlock modal directly.
 *
 * Normal Ctrl+R does NOT trigger this handler, so sessionStorage tokens are
 * preserved and the session resumes without an unlock modal.
 */
export function useHardRefreshHandler(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isHardRefresh =
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        (event.key === "r" || event.key === "R");

      if (!isHardRefresh) return;

      try {
        window.sessionStorage.removeItem(SESSION_TOKENS_KEY);
        window.localStorage.setItem(FORCE_REAUTH_KEY, Date.now().toString());
      } catch {
        // Ignore storage errors
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
