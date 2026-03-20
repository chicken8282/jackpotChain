import { beforeEach, describe, expect, it } from "vitest";
import {
  backupLegacyWalletPayload,
  clearLegacyWalletPayloads,
  extractLegacyWallets,
  getLegacyWalletPayload,
  restoreLegacyWalletPayloadFromBackup,
} from "./legacyWalletMigrationService";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe("legacy wallet migration service", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("legacy persisted wallet payload를 읽어 migration 대상 지갑 목록을 추출한다", () => {
    storage.setItem(
      "ssatto-wallet-session",
      JSON.stringify({
        state: {
          wallets: [
            {
              nickname: "내 지갑",
              address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
              privateKey: "1111111111111111111111111111111111111111111111111111111111111111",
              walletColor: "gray",
            },
          ],
          activeAddress: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
        },
      }),
    );

    expect(extractLegacyWallets(storage)).toEqual([
      {
        nickname: "내 지갑",
        address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
        privateKey: "1111111111111111111111111111111111111111111111111111111111111111",
        walletColor: "gray",
      },
    ]);
  });

  it("migration 시작 시 backup을 만들고 필요하면 복원한다", () => {
    storage.setItem("ssatto-wallet-session", "{\"state\":{\"wallets\":[]}}");

    backupLegacyWalletPayload(storage);
    storage.removeItem("ssatto-wallet-session");

    expect(getLegacyWalletPayload(storage)).toBeNull();

    restoreLegacyWalletPayloadFromBackup(storage);

    expect(getLegacyWalletPayload(storage)).toBe("{\"state\":{\"wallets\":[]}}");

    clearLegacyWalletPayloads(storage);

    expect(storage.getItem("ssatto-wallet-session")).toBeNull();
    expect(storage.getItem("ssatto-wallet-session-backup")).toBeNull();
  });
});
