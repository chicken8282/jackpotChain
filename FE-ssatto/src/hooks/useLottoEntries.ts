import { usePollingQuery } from "./usePollingQuery";
import { getLottoEntries } from "../services/lottoService";
import { mapLottoEntries, type LottoHistoryEntry } from "../services/readModelAdapters";

interface UseLottoEntriesResult {
  entries: LottoHistoryEntry[];
  isLoading: boolean;
  error: string | null;
}

export function useLottoEntries(address?: string | null, token?: string): UseLottoEntriesResult {
  const { data, isLoading, error } = usePollingQuery<LottoHistoryEntry[]>({
    enabled: Boolean(address && token),
    intervalMs: 10_000,
    initialData: [],
    errorFallback: "lotto-entries-load-failed",
    queryFn: async () => {
      if (!address || !token) {
        return [];
      }

      const response = await getLottoEntries(address, token);
      return mapLottoEntries(response.entries);
    },
  });

  return {
    entries: data,
    isLoading,
    error,
  };
}
