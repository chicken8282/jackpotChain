import type { DashboardBlockDetail } from "../components/dashboard/dashboardMockData";

export interface DashboardBlockSummaryApi {
  height: number;
  hash: string;
  txCount: number;
  minedAt: string;
  minerLabel: string | null;
  rewardJack: number;
  confirmations: number;
}

export interface BlockDetailApiResponse {
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
  merkleRoot: string | null;
  jackpotContribution: number;
}

export function formatDateTime(value: string) {
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

export function getMissingBlockHeights(
  blocks: DashboardBlockSummaryApi[],
  cache: Map<number, BlockDetailApiResponse>,
): number[] {
  return blocks
    .map((block) => block.height)
    .filter((height) => !cache.has(height));
}

export function mapDashboardBlock(
  summary: DashboardBlockSummaryApi,
  detail: BlockDetailApiResponse,
): DashboardBlockDetail {
  return {
    id: summary.hash,
    height: summary.height,
    hash: summary.hash,
    reward: summary.rewardJack / 100_000_000,
    feeReward: detail.feeReward / 100_000_000,
    jackpotContribution: detail.jackpotContribution / 100_000_000,
    status: "confirmed",
    txCount: summary.txCount,
    confirmations: summary.confirmations,
    version: detail.version,
    previousHash: detail.previousHash,
    nonce: detail.nonce,
    difficulty: detail.difficulty,
    minedAt: formatDateTime(summary.minedAt),
    miningElapsed: `${detail.miningElapsed}초`,
    isMainChain: detail.isMainChain,
    minerLabel: summary.minerLabel ?? detail.minerName ?? "Unknown Miner",
    merkleRoot: detail.merkleRoot ?? undefined,
  };
}
