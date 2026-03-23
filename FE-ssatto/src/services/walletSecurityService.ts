import { decryptPrivateKey, encryptPrivateKey } from "../lib/crypto/encryption";
import { deriveWalletCredentials } from "../lib/crypto/wallet";
import type { WalletThemeId } from "../components/wallet/walletThemes";
import type { LegacyWalletRecord } from "./legacyWalletMigrationService";
import { deleteWalletKeystore, getWalletKeystore, saveWalletKeystore } from "./keystoreRepository";
import type { WalletMetadata } from "../stores/useWalletStore";

interface SecureWalletInput {
  walletId?: string;
  keystoreId?: string;
  nickname: string;
  walletColor: WalletThemeId;
  privateKey: string;
  address?: string;
  password: string;
}

interface SecureWalletResult {
  metadata: WalletMetadata;
  privateKey: string;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function secureWallet(input: SecureWalletInput): Promise<SecureWalletResult> {
  const credentials = deriveWalletCredentials(input.privateKey, input.address);
  const walletId = input.walletId ?? createId();
  const keystoreId = input.keystoreId ?? createId();
  const now = new Date().toISOString();
  const encrypted = await encryptPrivateKey(credentials.privateKey, input.password);

  await saveWalletKeystore({
    id: keystoreId,
    walletId,
    address: credentials.address,
    publicKey: credentials.publicKey,
    ...encrypted,
    createdAt: now,
    updatedAt: now,
  });

  return {
    metadata: {
      walletId,
      keystoreId,
      nickname: input.nickname,
      address: credentials.address,
      walletColor: input.walletColor,
      refreshSessionHandle: null,
    },
    privateKey: credentials.privateKey,
  };
}

export async function unlockWalletPrivateKey(metadata: WalletMetadata, password: string) {
  const keystore = await getWalletKeystore(metadata.keystoreId);
  const privateKey = await decryptPrivateKey(keystore, password);
  deriveWalletCredentials(privateKey, metadata.address);
  return privateKey;
}

export async function migrateLegacyWallets(
  legacyWallets: LegacyWalletRecord[],
  password: string,
  existingWallets: WalletMetadata[],
) {
  const createdKeystoreIds: string[] = [];

  try {
    const secureWallets = [];
    for (const legacyWallet of legacyWallets) {
      const existing = existingWallets.find((wallet) => wallet.address === legacyWallet.address);
      const result = await secureWallet({
        walletId: existing?.walletId,
        keystoreId: existing?.keystoreId,
        nickname: legacyWallet.nickname,
        walletColor: legacyWallet.walletColor,
        privateKey: legacyWallet.privateKey,
        address: legacyWallet.address,
        password,
      });

      if (!existing?.keystoreId) {
        createdKeystoreIds.push(result.metadata.keystoreId);
      }
      secureWallets.push(result);
    }

    return secureWallets;
  } catch (error) {
    await Promise.all(createdKeystoreIds.map((id) => deleteWalletKeystore(id).catch(() => undefined)));
    throw error;
  }
}
