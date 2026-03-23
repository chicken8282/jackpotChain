import type { WalletThemeId } from "../components/wallet/walletThemes";

export const LEGACY_WALLET_STORE_KEY = "ssatto-wallet-session";
export const LEGACY_WALLET_BACKUP_KEY = "ssatto-wallet-session-backup";

export interface LegacyWalletRecord {
  nickname: string;
  address: string;
  privateKey: string;
  walletColor: WalletThemeId;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function getLegacyWalletPayload(storage: Pick<Storage, "getItem">) {
  return storage.getItem(LEGACY_WALLET_STORE_KEY);
}

export function extractLegacyWallets(storage: Pick<Storage, "getItem">): LegacyWalletRecord[] {
  const raw = parseJson<{ state?: { wallets?: unknown[] }; wallets?: unknown[] }>(getLegacyWalletPayload(storage));
  const wallets = raw?.state?.wallets ?? raw?.wallets ?? [];

  return wallets
    .filter(
      (wallet): wallet is LegacyWalletRecord =>
        typeof wallet === "object" &&
        wallet !== null &&
        typeof (wallet as LegacyWalletRecord).nickname === "string" &&
        typeof (wallet as LegacyWalletRecord).address === "string" &&
        typeof (wallet as LegacyWalletRecord).privateKey === "string" &&
        typeof (wallet as LegacyWalletRecord).walletColor === "string",
    )
    .map((wallet) => ({ ...wallet }));
}

export function backupLegacyWalletPayload(storage: StorageLike) {
  const payload = getLegacyWalletPayload(storage);
  if (payload) {
    storage.setItem(LEGACY_WALLET_BACKUP_KEY, payload);
  }
}

export function restoreLegacyWalletPayloadFromBackup(storage: StorageLike) {
  const backup = storage.getItem(LEGACY_WALLET_BACKUP_KEY);
  if (!storage.getItem(LEGACY_WALLET_STORE_KEY) && backup) {
    storage.setItem(LEGACY_WALLET_STORE_KEY, backup);
  }
}

export function clearLegacyWalletPayloads(storage: StorageLike) {
  storage.removeItem(LEGACY_WALLET_STORE_KEY);
  storage.removeItem(LEGACY_WALLET_BACKUP_KEY);
}
