import type { MinedBlock } from "../types";
import type { MiningBlocksPage } from "../services/miningService";
import { mapMiningBlocks } from "../services/readModelAdapters";

export interface MiningPageSlice {
  nextCursor: number | null;
  hasNext: boolean;
  totalRewardJack: number;
  blocks: MinedBlock[];
}

export interface AutoAppendAvailabilityInput {
  hasNext: boolean;
  nextCursor: number | null;
  isLoadingMore: boolean;
  autoAppendCount: number;
  maxAutoAppendPages: number;
}

export function mapMiningPageSlice(page: MiningBlocksPage): MiningPageSlice {
  const mapped = mapMiningBlocks(page);
  return {
    nextCursor: page.nextCursor,
    hasNext: page.hasNext,
    totalRewardJack: mapped.totalRewardJack,
    blocks: mapped.blocks,
  };
}

export function mergeMiningBlocks(firstPage: MinedBlock[], appendedPages: MinedBlock[]): MinedBlock[] {
  const nextBlocks = [...firstPage, ...appendedPages];
  const seen = new Set<number>();

  return nextBlocks.filter((block) => {
    if (seen.has(block.blockId)) {
      return false;
    }
    seen.add(block.blockId);
    return true;
  });
}

export function canAutoAppend({
  hasNext,
  nextCursor,
  isLoadingMore,
  autoAppendCount,
  maxAutoAppendPages,
}: AutoAppendAvailabilityInput): boolean {
  return hasNext && nextCursor != null && !isLoadingMore && autoAppendCount < maxAutoAppendPages;
}
