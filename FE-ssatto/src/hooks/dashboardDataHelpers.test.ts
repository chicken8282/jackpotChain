import { describe, expect, it } from "vitest";
import {
  getMissingBlockHeights,
  mapDashboardBlock,
  type BlockDetailApiResponse,
  type DashboardBlockSummaryApi,
} from "./dashboardDataHelpers";

describe("dashboard data helpers", () => {
  it("returns only unseen heights for detail hydration", () => {
    const cache = new Map<number, BlockDetailApiResponse>([
      [
        101,
        {
          height: 101,
          hash: "hash-101",
          reward: 10000000000,
          feeReward: 0,
          txCount: 2,
          confirmations: 3,
          minedAt: "2026-03-20T10:00:00Z",
          miningElapsed: 12,
          version: "0x20000000",
          previousHash: "hash-100",
          nonce: 1,
          difficulty: "7.42T",
          minerName: "Miner-101",
          isMainChain: true,
        },
      ],
    ]);

    const blocks: DashboardBlockSummaryApi[] = [
      {
        height: 102,
        hash: "hash-102",
        txCount: 2,
        minedAt: "2026-03-20T10:01:00Z",
        minerLabel: "Miner-102",
        rewardJack: 10000000000,
        confirmations: 2,
      },
      {
        height: 101,
        hash: "hash-101",
        txCount: 2,
        minedAt: "2026-03-20T10:00:00Z",
        minerLabel: "Miner-101",
        rewardJack: 10000000000,
        confirmations: 3,
      },
    ];

    expect(getMissingBlockHeights(blocks, cache)).toEqual([102]);
  });

  it("maps dashboard summary and cached detail into the UI block detail model", () => {
    const summary: DashboardBlockSummaryApi = {
      height: 102,
      hash: "hash-102",
      txCount: 5,
      minedAt: "2026-03-20T10:01:00Z",
      minerLabel: "Validator-01",
      rewardJack: 10000000000,
      confirmations: 8,
    };

    const detail: BlockDetailApiResponse = {
      height: 102,
      hash: "hash-102",
      reward: 10000000000,
      feeReward: 250000000,
      txCount: 5,
      confirmations: 8,
      minedAt: "2026-03-20T10:01:00Z",
      miningElapsed: 14,
      version: "0x20000000",
      previousHash: "hash-101",
      nonce: 12345,
      difficulty: "7.42T",
      minerName: "Validator-01",
      isMainChain: true,
    };

    const mapped = mapDashboardBlock(summary, detail);

    expect(mapped.hash).toBe("hash-102");
    expect(mapped.reward).toBe(100);
    expect(mapped.feeReward).toBe(2.5);
    expect(mapped.confirmations).toBe(8);
    expect(mapped.version).toBe("0x20000000");
    expect(mapped.previousHash).toBe("hash-101");
    expect(mapped.minerLabel).toBe("Validator-01");
  });
});
