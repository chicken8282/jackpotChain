import { getLottoRanking, type LottoRankingItem } from "../services/lottoService";
import { usePollingQuery } from "./usePollingQuery";

interface UseLottoRankingResult {
  winners: LottoRankingItem[];
  isLoading: boolean;
  error: string | null;
}

export function useLottoRanking(intervalMs = 10_000): UseLottoRankingResult {
  const { data, isLoading, error } = usePollingQuery<LottoRankingItem[]>({
    enabled: true,
    intervalMs,
    initialData: [],
    errorFallback: "lotto-ranking-load-failed",
    queryFn: async () => getLottoRanking(),
  });

  return { winners: data, isLoading, error };
}
