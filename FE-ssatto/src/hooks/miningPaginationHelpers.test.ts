import { describe, expect, it } from "vitest";
import { canAutoAppend, mapMiningPageSlice, mergeMiningBlocks } from "./miningPaginationHelpers";

describe("miningPaginationHelpers", () => {
  it("maps mining page response into FE slice state", () => {
    const slice = mapMiningPageSlice({
      hasNext: true,
      nextCursor: 1030,
      totalRewardJack: 20_000_000_000,
      blocks: [
        {
          blockId: 1042,
          height: 1042,
          hash: "0000a3f",
          rewardJack: 10_000_000_000,
          txCount: 3,
          minedAt: "2026-03-20T10:23:44",
        },
      ],
    });

    expect(slice.hasNext).toBe(true);
    expect(slice.nextCursor).toBe(1030);
    expect(slice.totalRewardJack).toBe(200);
    expect(slice.blocks[0]?.blockId).toBe(1042);
  });

  it("merges first page and appended pages without duplicate block ids", () => {
    const merged = mergeMiningBlocks(
      [
        { id: "a", blockId: 1042, height: 1042, hash: "0000a3f", reward: 100, createdAt: "03.20 10:23" },
        { id: "b", blockId: 1041, height: 1041, hash: "0000a3e", reward: 100, createdAt: "03.20 10:10" },
      ],
      [
        { id: "b-old", blockId: 1041, height: 1041, hash: "0000a3e", reward: 100, createdAt: "03.20 10:10" },
        { id: "c", blockId: 1040, height: 1040, hash: "0000a3d", reward: 100, createdAt: "03.20 09:58" },
      ],
    );

    expect(merged.map((block) => block.blockId)).toEqual([1042, 1041, 1040]);
  });

  it("allows auto append only while cursor pagination budget remains", () => {
    expect(
      canAutoAppend({
        hasNext: true,
        nextCursor: 1030,
        isLoadingMore: false,
        autoAppendCount: 1,
        maxAutoAppendPages: 2,
      }),
    ).toBe(true);

    expect(
      canAutoAppend({
        hasNext: true,
        nextCursor: 1030,
        isLoadingMore: false,
        autoAppendCount: 2,
        maxAutoAppendPages: 2,
      }),
    ).toBe(false);
  });
});
