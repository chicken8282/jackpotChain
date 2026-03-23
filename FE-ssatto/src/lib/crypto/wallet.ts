import { publicKeyToAddress, validateAddress } from "./address";
import {
  generatePrivateKey as generateRawPrivateKey,
  normalizePrivateKey,
  privateKeyToPublicKey,
  signAuthMessage,
} from "./signature";

export interface WalletCredentials {
  address: string;
  privateKey: string;
  publicKey: string;
}

export function deriveWalletCredentials(privateKeyHex: string, expectedAddress?: string): WalletCredentials {
  const privateKey = normalizePrivateKey(privateKeyHex);
  const publicKey = privateKeyToPublicKey(privateKey);
  const address = publicKeyToAddress(publicKey);

  if (expectedAddress && expectedAddress.trim() !== address) {
    throw new Error("private key와 지갑 주소가 일치하지 않습니다.");
  }

  validateAddress(address);

  return {
    address,
    privateKey,
    publicKey,
  };
}

export function createWalletCredentials() {
  return deriveWalletCredentials(generateRawPrivateKey());
}

export { signAuthMessage };
