import { ripemd160 } from "@noble/hashes/ripemd160";
import { sha256 } from "@noble/hashes/sha256";
import { utf8ToBytes } from "@noble/hashes/utils";

export function sha256Bytes(data: Uint8Array) {
  return sha256(data);
}

export function sha256Text(text: string) {
  return sha256(utf8ToBytes(text));
}

export function doubleSha256Bytes(data: Uint8Array) {
  return sha256(sha256(data));
}

export function hash160Bytes(data: Uint8Array) {
  return ripemd160(sha256(data));
}
