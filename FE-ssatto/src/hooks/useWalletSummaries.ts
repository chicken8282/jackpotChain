import { useEffect, useMemo } from "react";
import { getWallets, type WalletSummary } from "../services/walletService";
import type { WalletMetadata } from "../stores/useWalletStore";
import { usePollingQuery } from "./usePollingQuery";

interface UseWalletSummariesResult {
  walletSummaries: WalletSummary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWalletSummaries(
  wallets: WalletMetadata[],
  intervalMs = 10_000,
): UseWalletSummariesResult {
  const addresses = useMemo(() => wallets.map((wallet) => wallet.address), [wallets]);
  const enabled = addresses.length > 0;
  const queryKey = useMemo(() => addresses.join(","), [addresses]);

  const { data, isLoading, error, refetch } = usePollingQuery<WalletSummary[]>({
    enabled,
    intervalMs,
    initialData: [],
    errorFallback: "wallet-summary-load-failed",
    queryFn: async () => {
      const response = await getWallets(addresses);
      return response.wallets;
    },
  });

  // When addresses change (wallet added/removed), trigger an immediate refetch
  // so the new wallet is included without waiting for the next interval tick.
  // refetch is intentionally omitted from deps — it wraps a stable useEffectEvent.
  useEffect(() => {
    if (addresses.length === 0) return;
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  if (!enabled) {
    return {
      walletSummaries: [],
      isLoading: false,
      error: null,
      refetch: async () => {},
    };
  }

  return {
    walletSummaries: queryKey ? data : [],
    isLoading,
    error,
    refetch,
  };
}
