import { getJson } from "../lib/api";

export interface MiningBlockItem {
  blockId: number;
  height: number;
  hash: string;
  rewardJack: number;
  txCount: number;
  minedAt: string;
}

export interface MiningBlocksPage {
  hasNext: boolean;
  nextCursor: number | null;
  totalRewardJack: number;
  blocks: MiningBlockItem[];
}

export function getMiningBlocks(address: string, token?: string, lastBlockId?: number | null, size = 10) {
  const params = new URLSearchParams({
    address,
    size: String(size),
  });

  if (lastBlockId != null) {
    params.set("lastBlockId", String(lastBlockId));
  }

  return getJson<MiningBlocksPage>(`/v1/mining/blocks?${params.toString()}`, undefined, token);
}
