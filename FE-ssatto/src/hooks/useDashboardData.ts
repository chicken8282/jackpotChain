import type { DashboardBlockDetail } from "../components/dashboard/dashboardMockData";
import { getJson } from "../lib/api";
import {
  formatDateTime,
  type DashboardBlockSummaryApi,
} from "./dashboardDataHelpers";
import { usePollingQuery } from "./usePollingQuery";

interface DashboardApiResponse {
  height: number;
  connections: number;
  blocks: DashboardBlockSummaryApi[];
}

export interface DashboardDataState {
  blocks: DashboardBlockDetail[];
  currentHeight: number;
  activeNodes: number;
  isLoading: boolean;
  error: string | null;
}

function mapSummaryToBlock(block: DashboardBlockSummaryApi): DashboardBlockDetail {
  return {
    id: block.hash,
    height: block.height,
    hash: block.hash,
    reward: block.rewardJack / 100_000_000,
    feeReward: 0,
    jackpotContribution: 0,
    status: "confirmed",
    txCount: block.txCount,
    confirmations: block.confirmations,
    version: "",
    previousHash: "",
    nonce: 0,
    difficulty: "",
    minedAt: formatDateTime(block.minedAt),
    miningElapsed: "",
    isMainChain: true,
    minerLabel: block.minerLabel ?? "Unknown Miner",
  };
}

export function useDashboardData(limit = 5): DashboardDataState {
  const { data, isLoading, error } = usePollingQuery<Omit<DashboardDataState, "isLoading" | "error">>({
    enabled: true,
    intervalMs: 10_000,
    initialData: {
      blocks: [] as DashboardBlockDetail[],
      currentHeight: 0,
      activeNodes: 0,
    },
    errorFallback: "dashboard-load-failed",
    queryFn: async (signal) => {
      const dashboard = await getJson<DashboardApiResponse>(
        `/v1/blockchain/dashboard?limit=${limit}`,
        signal,
      );

      return {
        blocks: dashboard.blocks.map(mapSummaryToBlock),
        currentHeight: dashboard.height,
        activeNodes: dashboard.connections,
      };
    },
  });

  return {
    blocks: data.blocks,
    currentHeight: data.currentHeight,
    activeNodes: data.activeNodes,
    isLoading,
    error,
  };
}
