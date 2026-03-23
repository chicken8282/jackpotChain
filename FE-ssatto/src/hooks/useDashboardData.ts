import { useRef } from "react";
import {
  confirmedBlocks as fallbackBlocks,
  type DashboardBlockDetail,
} from "../components/dashboard/dashboardMockData";
import { getJson } from "../lib/api";
import {
  getMissingBlockHeights,
  mapDashboardBlock,
  type BlockDetailApiResponse,
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

export function useDashboardData(limit = 5): DashboardDataState {
  const detailCacheRef = useRef<Map<number, BlockDetailApiResponse>>(new Map());

  const { data, isLoading, error } = usePollingQuery<Omit<DashboardDataState, "isLoading" | "error">>({
    enabled: true,
    intervalMs: 10_000,
    initialData: {
      blocks: fallbackBlocks,
      currentHeight: fallbackBlocks[0]?.height ?? 0,
      activeNodes: 0,
    },
    errorFallback: "dashboard-load-failed",
    queryFn: async (signal) => {
      const dashboard = await getJson<DashboardApiResponse>(
        `/v1/blockchain/dashboard?limit=${limit}`,
        signal,
      );
      const missingHeights = getMissingBlockHeights(dashboard.blocks, detailCacheRef.current);

      if (missingHeights.length > 0) {
        const hydratedDetails = await Promise.all(
          missingHeights.map((height) =>
            getJson<BlockDetailApiResponse>(`/v1/blockchain/blocks/${height}`, signal),
          ),
        );

        hydratedDetails.forEach((detail) => {
          detailCacheRef.current.set(detail.height, detail);
        });
      }

      return {
        blocks: dashboard.blocks
          .map((block) => {
            const detail = detailCacheRef.current.get(block.height);
            return detail ? mapDashboardBlock(block, detail) : null;
          })
          .filter((block): block is DashboardBlockDetail => block !== null),
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
