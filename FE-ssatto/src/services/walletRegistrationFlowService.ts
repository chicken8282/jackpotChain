import { ApiError } from "../lib/api";
import type { WalletThemeId } from "../components/wallet/walletThemes";
import { deleteWalletKeystore } from "./keystoreRepository";
import { secureWallet } from "./walletSecurityService";
import { registerWallet, type RegisterWalletResponse } from "./walletService";
import type { WalletMetadata } from "../stores/useWalletStore";

interface WalletPersistPayload {
  address?: string;
  privateKey?: string;
  password?: string;
}

interface WalletRegistrationInput {
  walletNickname: string;
  type: "create" | "restore";
  color: WalletThemeId;
  payload: WalletPersistPayload;
  existingWallet?: WalletMetadata;
}

interface WalletRegistrationSecureResult {
  metadata: WalletMetadata;
  privateKey: string;
}

interface WalletRegistrationDependencies {
  secureWallet: typeof secureWallet;
  registerWallet: typeof registerWallet;
  deleteWalletKeystore: typeof deleteWalletKeystore;
}

export interface WalletRegistrationResult {
  status: "registered" | "duplicate_restore";
  securedWallet: WalletRegistrationSecureResult;
  response?: RegisterWalletResponse;
}

const defaultDependencies: WalletRegistrationDependencies = {
  secureWallet,
  registerWallet,
  deleteWalletKeystore,
};

export async function registerWalletWithRollback(
  input: WalletRegistrationInput,
  dependencies: WalletRegistrationDependencies = defaultDependencies,
): Promise<WalletRegistrationResult> {
  const address = input.payload.address;
  const privateKey = input.payload.privateKey;
  const password = input.payload.password;

  if (!address || !privateKey || !password) {
    throw new Error("생성된 지갑 정보를 찾을 수 없습니다.");
  }

  const hadExistingKeystore = Boolean(input.existingWallet?.keystoreId);
  const securedWallet = await dependencies.secureWallet({
    walletId: input.existingWallet?.walletId,
    keystoreId: input.existingWallet?.keystoreId,
    nickname: input.walletNickname,
    walletColor: input.color,
    privateKey,
    address,
    password,
  });

  try {
    const response = await dependencies.registerWallet({
      address,
      nickname: input.walletNickname,
      walletColor: input.color.toUpperCase(),
      grantOnboardingReward: input.type === "create",
    });

    return {
      status: "registered",
      securedWallet,
      response,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409 && input.type === "restore") {
      return {
        status: "duplicate_restore",
        securedWallet,
      };
    }

    if (!hadExistingKeystore) {
      await dependencies.deleteWalletKeystore(securedWallet.metadata.keystoreId).catch(() => undefined);
    }

    throw error;
  }
}
