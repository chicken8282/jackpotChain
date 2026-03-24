import { describe, expect, it } from "vitest";
import {
  mapLottoEntry,
  mapLottoResult,
  mapMiningBlocks,
  mapWalletActivity,
} from "./readModelAdapters";

describe("readModelAdapters", () => {
  it("maps wallet activity types and amounts for the wallet page", () => {
    const activity = mapWalletActivity({
      activityId: 20,
      type: "LOTTO_COMMIT",
      description: "로또 참여 (1 POT)",
      txId: "tx-001",
      jackAmount: null,
      potAmount: -100_000_000,
      createdAt: "2026-03-20T10:23:44",
    });

    expect(activity.type).toBe("로또 참여");
    expect(activity.potAmount).toBe(-100_000_000);
    expect(activity.txId).toBe("tx-001");
  });

  it("maps lotto entries and detail results to history models", () => {
    const entry = mapLottoEntry({
      entryId: 42,
      commitHash: "commit-001",
      chosenNumbers: [10, 1, 15, 3, 4, 14],
      status: "WINNING",
      matchCount: 4,
      rewardJack: 2_000_000_000_000,
      claimed: false,
      isClaimable: true,
      enteredAt: "2026-03-20T10:00:00",
    });
    const detail = mapLottoResult(entry, {
      commitHash: "commit-001",
      chosenNumbers: [10, 1, 15, 3, 4, 14],
      resultNumbers: [10, 5, 15, 3, 9, 14],
      matchCount: 4,
      isClaimable: true,
      status: "WINNING",
      rewardJack: 2_000_000_000_000,
    });

    expect(entry.numbers).toEqual(["a", "1", "f", "3", "4", "e"]);
    expect(detail.resultNumbers).toEqual(["a", "5", "f", "3", "9", "e"]);
    expect(detail.rewardLabel).toBe("20,000 JACK");
  });

  it("maps mining pages to JACK units for the mining page", () => {
    const mining = mapMiningBlocks({
      hasNext: false,
      nextCursor: null,
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

    expect(mining.totalRewardJack).toBe(200);
    expect(mining.blocks[0]).toMatchObject({
      blockId: 1042,
      height: 1042,
      reward: 100,
    });
  });
});
