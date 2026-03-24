import { createBase58check } from "@scure/base";
import { sha256Bytes } from "./hash";

const base58check = createBase58check(sha256Bytes);

export function encodeBase58Check(version: number, payload: Uint8Array) {
  const body = new Uint8Array(payload.length + 1);
  body[0] = version;
  body.set(payload, 1);
  return base58check.encode(body);
}

export function decodeBase58Check(value: string) {
  const decoded = base58check.decode(value);
  if (decoded.length < 2) {
    throw new Error("유효하지 않은 지갑 주소 형식입니다.");
  }

  return {
    version: decoded[0],
    payload: decoded.slice(1),
  };
}
