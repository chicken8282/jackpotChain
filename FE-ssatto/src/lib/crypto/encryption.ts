import { base64 } from "@scure/base";
import { normalizePrivateKey } from "./signature";

const DEFAULT_ITERATIONS = 100000;
const DEFAULT_SALT_LENGTH = 16;
const DEFAULT_IV_LENGTH = 12;

export interface EncryptedPrivateKeyPayload {
  cipher: "AES-256-GCM";
  kdf: "PBKDF2-HMAC-SHA256";
  iterations: number;
  saltBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
}

interface EncryptOptions {
  salt?: Uint8Array;
  iv?: Uint8Array;
  iterations?: number;
}

function getCryptoProvider() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("현재 환경에서는 Web Crypto를 사용할 수 없습니다.");
  }

  return globalThis.crypto;
}

function encodeBase64(value: Uint8Array) {
  return base64.encode(value);
}

function decodeBase64(value: string) {
  return base64.decode(value);
}

function asBufferSource(value: Uint8Array) {
  return new Uint8Array(value).buffer;
}

async function deriveAesKey(password: string, salt: Uint8Array, iterations: number) {
  const cryptoProvider = getCryptoProvider();
  const encoder = new TextEncoder();

  const keyMaterial = await cryptoProvider.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return cryptoProvider.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asBufferSource(salt),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPrivateKey(
  privateKey: string,
  password: string,
  options: EncryptOptions = {},
): Promise<EncryptedPrivateKeyPayload> {
  if (!password.trim()) {
    throw new Error("지갑 비밀번호를 입력해주세요.");
  }

  const cryptoProvider = getCryptoProvider();
  const encoder = new TextEncoder();
  const normalizedPrivateKey = normalizePrivateKey(privateKey);
  const salt = options.salt ?? cryptoProvider.getRandomValues(new Uint8Array(DEFAULT_SALT_LENGTH));
  const iv = options.iv ?? cryptoProvider.getRandomValues(new Uint8Array(DEFAULT_IV_LENGTH));
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const key = await deriveAesKey(password, salt, iterations);

  const ciphertext = await cryptoProvider.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: asBufferSource(iv),
    },
    key,
    encoder.encode(normalizedPrivateKey),
  );

  return {
    cipher: "AES-256-GCM",
    kdf: "PBKDF2-HMAC-SHA256",
    iterations,
    saltBase64: encodeBase64(salt),
    ivBase64: encodeBase64(iv),
    ciphertextBase64: encodeBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptPrivateKey(
  payload: EncryptedPrivateKeyPayload,
  password: string,
): Promise<string> {
  try {
    const cryptoProvider = getCryptoProvider();
    const decoder = new TextDecoder();
    const salt = decodeBase64(payload.saltBase64);
    const iv = decodeBase64(payload.ivBase64);
    const ciphertext = decodeBase64(payload.ciphertextBase64);
    const key = await deriveAesKey(password, salt, payload.iterations);

    const plaintext = await cryptoProvider.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: asBufferSource(iv),
      },
      key,
      asBufferSource(ciphertext),
    );

    return normalizePrivateKey(decoder.decode(plaintext));
  } catch {
    throw new Error("지갑 비밀번호가 올바르지 않습니다.");
  }
}
