import { useMemo } from "react";
import { getWallets, type WalletSummary } from "../services/walletService";
import type { WalletMetadata } from "../stores/useWalletStore";
import { usePollingQuery } from "./usePollingQuery";

interface UseWalletSummariesResult {
  walletSummaries: WalletSummary[];
  isLoading: boolean;
  error: string | null;
}

export function useWalletSummaries(
  wallets: WalletMetadata[],
  intervalMs = 10_000,
): UseWalletSummariesResult {
  const addresses = useMemo(() => wallets.map((wallet) => wallet.address), [wallets]);
  const enabled = addresses.length > 0;
  const queryKey = useMemo(() => addresses.join(","), [addresses]);

  const { data, isLoading, error } = usePollingQuery<WalletSummary[]>({
    enabled,
    intervalMs,
    initialData: [],
    errorFallback: "wallet-summary-load-failed",
    queryFn: async () => {
      const response = await getWallets(addresses);
      return response.wallets;
    },
  });

  if (!enabled) {
    return {
      walletSummaries: [],
      isLoading: false,
      error: null,
    };
  }

  return {
    walletSummaries: queryKey ? data : [],
    isLoading,
    error,
  };
}
