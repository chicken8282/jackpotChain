import { getLottoOverview, type LottoOverview } from "../services/lottoService";
import { usePollingQuery } from "./usePollingQuery";

interface UseLottoOverviewResult {
  overview: LottoOverview | null;
  isLoading: boolean;
  error: string | null;
}

export function useLottoOverview(
  activeAddress: string | null,
  token?: string,
  intervalMs = 10_000,
): UseLottoOverviewResult {
  const enabled = Boolean(activeAddress);

  const { data, isLoading, error } = usePollingQuery<LottoOverview | null>({
    enabled,
    intervalMs,
    initialData: null,
    errorFallback: "lotto-overview-load-failed",
    queryFn: async () => {
      if (!activeAddress) {
        return null;
      }

      return getLottoOverview(activeAddress, token);
    },
  });

  return {
    overview: enabled ? data : null,
    isLoading,
    error,
  };
}
