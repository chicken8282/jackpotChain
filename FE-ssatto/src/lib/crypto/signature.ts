import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { sha256Text } from "./hash";

export function normalizePrivateKey(privateKeyHex: string) {
  const normalized = privateKeyHex.trim().replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("유효하지 않은 private key 형식입니다.");
  }
  return normalized;
}

export function generatePrivateKey() {
  return bytesToHex(secp256k1.utils.randomSecretKey());
}

export function privateKeyToPublicKey(privateKeyHex: string) {
  return bytesToHex(secp256k1.getPublicKey(hexToBytes(normalizePrivateKey(privateKeyHex)), true));
}

export function signAuthMessage(message: string, privateKeyHex: string) {
  const signature = secp256k1.sign(sha256Text(message), hexToBytes(normalizePrivateKey(privateKeyHex)), {
    prehash: false,
    format: "der",
  });
  return signature.toDERHex();
}
