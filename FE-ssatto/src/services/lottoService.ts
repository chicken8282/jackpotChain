import { getJson } from "../lib/api";

export interface LottoPrizeTier {
  rank: number;
  matches: number;
  rewardJack: number;
}

export interface LottoOverview {
  jackBalance: number;
  potBalance: number;
  poolBalanceJack: number;
  totalEntries: number;
  totalWinners: number;
  prizeTiers: LottoPrizeTier[];
}

export function getLottoOverview(address: string) {
  const query = encodeURIComponent(address);
  return getJson<LottoOverview>(`/v1/lotto?address=${query}`);
}
