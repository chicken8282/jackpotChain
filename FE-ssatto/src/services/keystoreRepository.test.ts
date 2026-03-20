import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { getWalletKeystore, resetKeystoreDatabase, saveWalletKeystore } from "./keystoreRepository";

describe("keystore repository", () => {
  beforeEach(async () => {
    await resetKeystoreDatabase();
  });

  it("지갑 keystore를 IndexedDB에 저장하고 다시 읽어온다", async () => {
    await saveWalletKeystore({
      id: "keystore-001",
      walletId: "wallet-001",
      address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
      publicKey: "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa",
      cipher: "AES-256-GCM",
      kdf: "PBKDF2-HMAC-SHA256",
      iterations: 100000,
      saltBase64: "AQEBAQEBAQEBAQEBAQEBAQ==",
      ivBase64: "AgICAgICAgICAgIC",
      ciphertextBase64: "c2FtcGxlLWNpcGhlcnRleHQ=",
      createdAt: "2026-03-20T00:00:00.000Z",
      updatedAt: "2026-03-20T00:00:00.000Z",
    });

    await expect(getWalletKeystore("keystore-001")).resolves.toMatchObject({
      walletId: "wallet-001",
      address: "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
    });
  });
});
