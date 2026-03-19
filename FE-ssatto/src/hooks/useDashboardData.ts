import { useEffect, useState } from "react";
import {
  confirmedBlocks as fallbackBlocks,
  type DashboardBlockDetail,
} from "../components/dashboard/dashboardMockData";
import { getJson } from "../lib/api";

interface DashboardBlockSummaryApi {
  height: number;
}

interface DashboardApiResponse {
  height: number;
  connections: number;
  blocks: DashboardBlockSummaryApi[];
}

interface BlockDetailApiResponse {
  height: number;
  hash: string;
  reward: number;
  feeReward: number;
  txCount: number;
  confirmations: number;
  minedAt: string;
  miningElapsed: number;
  version: string;
  previousHash: string;
  nonce: number;
  difficulty: string;
  minerName: string | null;
  isMainChain: boolean;
}

export interface DashboardDataState {
  blocks: DashboardBlockDetail[];
  currentHeight: number;
  activeNodes: number;
  isLoading: boolean;
  error: string | null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function mapBlockDetail(detail: BlockDetailApiResponse): DashboardBlockDetail {
  return {
    id: detail.hash,
    height: detail.height,
    hash: detail.hash,
    reward: detail.reward / 100_000_000,
    feeReward: detail.feeReward / 100_000_000,
    jackpotContribution: 0,
    status: "confirmed",
    txCount: detail.txCount,
    confirmations: detail.confirmations,
    version: detail.version,
    previousHash: detail.previousHash,
    nonce: detail.nonce,
    difficulty: detail.difficulty,
    minedAt: formatDateTime(detail.minedAt),
    miningElapsed: `${detail.miningElapsed}초`,
    isMainChain: detail.isMainChain,
    minerLabel: detail.minerName ?? "Unknown Miner",
  };
}

export function useDashboardData(limit = 5): DashboardDataState {
  const [state, setState] = useState<DashboardDataState>({
    blocks: fallbackBlocks,
    currentHeight: fallbackBlocks[0]?.height ?? 0,
    activeNodes: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const controller = new AbortController();

      try {
        const dashboard = await getJson<DashboardApiResponse>(
          `/v1/blockchain/dashboard?limit=${limit}`,
          controller.signal,
        );

        const details = await Promise.all(
          dashboard.blocks.map((block) =>
            getJson<BlockDetailApiResponse>(
              `/v1/blockchain/blocks/${block.height}`,
              controller.signal,
            ),
          ),
        );

        if (cancelled) {
          return;
        }

        setState({
          blocks: details.map(mapBlockDetail),
          currentHeight: dashboard.height,
          activeNodes: dashboard.connections,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState((previousState) => ({
          ...previousState,
          isLoading: false,
          error: error instanceof Error ? error.message : "dashboard-load-failed",
        }));
      }
    };

    void load();

    const intervalId = window.setInterval(() => {
      void load();
    }, 10_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [limit]);

  return state;
}
