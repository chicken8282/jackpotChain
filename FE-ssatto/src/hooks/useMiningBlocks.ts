import { useEffect, useMemo, useState } from "react";
import { usePollingQuery } from "./usePollingQuery";
import { getMiningBlocks } from "../services/miningService";
import {
  canAutoAppend,
  mapMiningPageSlice,
  mergeMiningBlocks,
  type MiningPageSlice,
} from "./miningPaginationHelpers";
import type { MinedBlock } from "../types";

const MAX_AUTO_APPEND_PAGES = 2;

interface UseMiningBlocksResult {
  totalRewardJack: number;
  blocks: MinedBlock[];
  appendedBlockCount: number;
  latestBlockHeight: number | null;
  autoAppendCount: number;
  maxAutoAppendPages: number;
  isAutoAppendBlocked: boolean;
  hasNext: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMore: (mode?: "manual" | "auto") => Promise<void>;
}

export function useMiningBlocks(address?: string | null, token?: string): UseMiningBlocksResult {
  const [appendedBlocks, setAppendedBlocks] = useState<MinedBlock[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [autoAppendCount, setAutoAppendCount] = useState(0);

  const { data, isLoading, error } = usePollingQuery<MiningPageSlice>({
    enabled: Boolean(address && token),
    intervalMs: 15_000,
    initialData: {
      nextCursor: null,
      hasNext: false,
      totalRewardJack: 0,
      blocks: [],
    },
    errorFallback: "mining-blocks-load-failed",
    queryFn: async () => {
      if (!address || !token) {
        return {
          nextCursor: null,
          hasNext: false,
          totalRewardJack: 0,
          blocks: [],
        };
      }

      const response = await getMiningBlocks(address, token);
      return mapMiningPageSlice(response);
    },
  });

  useEffect(() => {
    setNextCursor(data.nextCursor);
    setHasNext(data.hasNext);
  }, [data.hasNext, data.nextCursor]);

  useEffect(() => {
    if (!address || !token) {
      setAppendedBlocks([]);
      setNextCursor(null);
      setHasNext(false);
      setIsLoadingMore(false);
      setLoadMoreError(null);
      setAutoAppendCount(0);
    }
  }, [address, token]);

  const blocks = useMemo(
    () => mergeMiningBlocks(data.blocks, appendedBlocks),
    [appendedBlocks, data.blocks],
  );
  const latestBlockHeight = data.blocks[0]?.height ?? null;
  const isAutoAppendBlocked =
    hasNext &&
    !canAutoAppend({
      hasNext,
      nextCursor,
      isLoadingMore,
      autoAppendCount,
      maxAutoAppendPages: MAX_AUTO_APPEND_PAGES,
    });

  const loadMore = async (mode: "manual" | "auto" = "manual") => {
    const shouldAutoAppend =
      mode === "auto" &&
      canAutoAppend({
        hasNext,
        nextCursor,
        isLoadingMore,
        autoAppendCount,
        maxAutoAppendPages: MAX_AUTO_APPEND_PAGES,
      });

    if (!address || !token || !hasNext || nextCursor == null || isLoadingMore) {
      return;
    }

    if (mode === "auto" && !shouldAutoAppend) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const response = await getMiningBlocks(address, token, nextCursor);
      const nextPage = mapMiningPageSlice(response);
      setAppendedBlocks((previous) => mergeMiningBlocks(previous, nextPage.blocks));
      setNextCursor(nextPage.nextCursor);
      setHasNext(nextPage.hasNext);
      if (mode === "auto") {
        setAutoAppendCount((previous) => previous + 1);
      }
    } catch (nextError) {
      setLoadMoreError(nextError instanceof Error ? nextError.message : "mining-blocks-load-more-failed");
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    totalRewardJack: data.totalRewardJack,
    blocks,
    appendedBlockCount: appendedBlocks.length,
    latestBlockHeight,
    autoAppendCount,
    maxAutoAppendPages: MAX_AUTO_APPEND_PAGES,
    isAutoAppendBlocked,
    hasNext,
    isLoading,
    isLoadingMore,
    error: loadMoreError ?? error,
    loadMore,
  };
}
