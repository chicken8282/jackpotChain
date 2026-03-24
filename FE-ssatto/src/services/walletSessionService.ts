import { refreshAuthSession, type AuthRefreshResponse } from "./authService";
import { loginWithWallet } from "./walletAuthFlowService";
import type { WalletMetadata } from "../stores/useWalletStore";

const refreshInFlight = new Map<string, Promise<AuthRefreshResponse>>();

interface RestoreWalletSessionInput {
  wallet: WalletMetadata;
  currentAccessToken: string | null;
  currentAccessTokenExpiresAt: string | null;
  unlockedPrivateKey?: string;
}

interface RestoreWalletSessionResult extends AuthRefreshResponse {
  mode: "memory" | "refresh" | "challenge";
}

function isAccessTokenActive(accessToken: string | null, accessTokenExpiresAt: string | null) {
  if (!accessToken || !accessTokenExpiresAt) {
    return false;
  }

  return new Date(accessTokenExpiresAt).getTime() > Date.now();
}

/**
 * 지갑별 세션을 메모리 access, refresh, challenge 순서로 복구한다.
 */
export async function restoreWalletSession(
  input: RestoreWalletSessionInput,
): Promise<RestoreWalletSessionResult | null> {
  if (isAccessTokenActive(input.currentAccessToken, input.currentAccessTokenExpiresAt)) {
    return {
      mode: "memory",
      accessToken: input.currentAccessToken as string,
      walletAddress: input.wallet.address,
      accessTokenExpiresAt: input.currentAccessTokenExpiresAt as string,
      refreshSessionHandle: input.wallet.refreshSessionHandle ?? "",
    };
  }

  if (input.wallet.refreshSessionHandle) {
    const handle = input.wallet.refreshSessionHandle;

    if (!refreshInFlight.has(handle)) {
      const promise = refreshAuthSession({ sessionHandle: handle }).finally(() => {
        refreshInFlight.delete(handle);
      });
      refreshInFlight.set(handle, promise);
    }

    try {
      const refreshResponse = await refreshInFlight.get(handle)!;
      return {
        mode: "refresh",
        ...refreshResponse,
      };
    } catch {
      // Fallback to challenge when an unlocked key is available.
    }
  }

  if (input.unlockedPrivateKey) {
    const challengeResponse = await loginWithWallet({
      address: input.wallet.address,
      privateKey: input.unlockedPrivateKey,
    });

    return {
      mode: "challenge",
      ...challengeResponse,
    };
  }

  return null;
}
