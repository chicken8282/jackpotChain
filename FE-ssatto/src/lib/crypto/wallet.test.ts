import { describe, expect, it } from "vitest";
import { deriveWalletCredentials, signAuthMessage } from "./wallet";
import fixtureVectors from "../../../../docs/fixtures/wallet_vectors.json";

describe("wallet crypto parity", () => {
  it("고정 private key에서 blockchain과 동일한 공개키와 주소를 유도한다", () => {
    const [fixture] = fixtureVectors;
    const credentials = deriveWalletCredentials(fixture.privateKeyHex);

    expect(credentials.publicKey).toBe(fixture.publicKeyHex);
    expect(credentials.address).toBe(fixture.address);
  });

  it("서버가 준 메시지를 blockchain과 동일한 방식으로 서명한다", () => {
    const [fixture] = fixtureVectors;
    const signature = signAuthMessage(fixture.loginMessage, fixture.privateKeyHex);

    expect(signature).toMatch(/^30[0-9a-f]+$/);
    expect(signature.length).toBeGreaterThanOrEqual(140);
  });
});
