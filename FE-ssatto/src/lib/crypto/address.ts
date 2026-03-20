import { hexToBytes } from "@noble/hashes/utils";
import { decodeBase58Check, encodeBase58Check } from "./base58";
import { hash160Bytes } from "./hash";

export const VERSION_PUBKEY = 0x4a;
export const VERSION_SCRIPT = 0x4b;

function normalizeHex(value: string) {
  const normalized = value.trim().replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error("유효하지 않은 공개키 형식입니다.");
  }
  return normalized;
}

export function publicKeyHashToAddress(publicKeyHash: Uint8Array) {
  if (publicKeyHash.length !== 20) {
    throw new Error("공개키 해시는 20바이트여야 합니다.");
  }

  return encodeBase58Check(VERSION_PUBKEY, publicKeyHash);
}

export function publicKeyToAddress(publicKeyHex: string) {
  return publicKeyHashToAddress(hash160Bytes(hexToBytes(normalizeHex(publicKeyHex))));
}

export function addressToPublicKeyHash(address: string) {
  const { version, payload } = decodeBase58Check(address.trim());
  if (version !== VERSION_PUBKEY) {
    throw new Error("지원하지 않는 지갑 주소 버전입니다.");
  }
  if (payload.length !== 20) {
    throw new Error("유효하지 않은 지갑 주소 길이입니다.");
  }
  return payload;
}

export function validateAddress(address: string) {
  addressToPublicKeyHash(address);
  return true;
}
