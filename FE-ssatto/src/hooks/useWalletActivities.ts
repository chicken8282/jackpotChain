import { usePollingQuery } from "./usePollingQuery";
import { getWalletActivities } from "../services/walletService";
import { mapWalletActivities } from "../services/readModelAdapters";
import type { Activity } from "../types";

interface UseWalletActivitiesResult {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
}

export function useWalletActivities(address?: string | null, token?: string): UseWalletActivitiesResult {
  const { data, isLoading, error } = usePollingQuery<Activity[]>({
    enabled: Boolean(address && token),
    intervalMs: 10_000,
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
  };
}
