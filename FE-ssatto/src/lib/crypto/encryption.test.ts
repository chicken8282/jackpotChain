import { describe, expect, it } from "vitest";
import { decryptPrivateKey, encryptPrivateKey } from "./encryption";

describe("wallet encryption", () => {
  it("PBKDF2 + AES-GCM으로 private key를 암호화하고 복호화한다", async () => {
    const encrypted = await encryptPrivateKey(
      "1111111111111111111111111111111111111111111111111111111111111111",
      "wallet-passphrase",
      {
        salt: new Uint8Array(16).fill(7),
        iv: new Uint8Array(12).fill(9),
      },
    );

    expect(encrypted.kdf).toBe("PBKDF2-HMAC-SHA256");
    expect(encrypted.cipher).toBe("AES-256-GCM");
    expect(encrypted.ciphertextBase64.length).toBeGreaterThan(10);

    await expect(
      decryptPrivateKey(encrypted, "wallet-passphrase"),
    ).resolves.toBe("1111111111111111111111111111111111111111111111111111111111111111");
  });

  it("잘못된 비밀번호로는 복호화되지 않는다", async () => {
    const encrypted = await encryptPrivateKey(
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "correct-passphrase",
      {
        salt: new Uint8Array(16).fill(1),
        iv: new Uint8Array(12).fill(2),
      },
    );

    await expect(decryptPrivateKey(encrypted, "wrong-passphrase")).rejects.toThrow(
      "지갑 비밀번호가 올바르지 않습니다.",
    );
  });
});
