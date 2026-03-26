import { usePollingQuery } from "./usePollingQuery";
import { getWalletActivities } from "../services/walletService";
import { mapWalletActivities } from "../services/readModelAdapters";
import type { Activity } from "../types";

interface UseWalletActivitiesResult {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWalletActivities(
  address?: string | null,
  token?: string,
  intervalMs = 10_000,
): UseWalletActivitiesResult {
  const { data, isLoading, error, refetch } = usePollingQuery<Activity[]>({
    enabled: Boolean(address && token),
    intervalMs,
    initialData: [],
    errorFallback: "wallet-activities-load-failed",
    queryFn: async () => {
      if (!address || !token) {
        return [];
      }

      const page = await getWalletActivities(address, token);
      return mapWalletActivities(page);
    },
  });

  return {
    activities: data,
    isLoading,
    error,
    refetch,
  };
}
