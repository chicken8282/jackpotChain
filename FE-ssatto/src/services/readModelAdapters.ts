import type { Activity, MinedBlock } from "../types";
import type { WalletActivityItem, WalletActivityPage } from "./walletService";
import type { LottoEntryItem, LottoEntryResult } from "./lottoService";
import type { MiningBlockItem, MiningBlocksPage } from "./miningService";

export interface LottoHistoryEntry {
  id: string;
  commitHash: string;
  numbers: string[];
  date: string;
  statusLabel: "PENDING" | "DRAWING" | "WINNING" | "LOSING" | "EXPIRED";
  matchCount: number | null;
  rewardLabel?: string;
  claimable: boolean;
  claimed: boolean;
}

export interface LottoHistoryDetail extends LottoHistoryEntry {
  resultNumbers: string[] | null;
}

const SATOSHI = 100_000_000;

function formatDateTime(value: string) {
  // Backend timestamps are UTC but may lack a timezone indicator.
  // Append 'Z' so JavaScript parses them as UTC instead of local time.
  const normalized = /Z|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function toHexDigits(numbers: number[]) {
  return numbers.map((number) => number.toString(16));
}

function toKoreanActivityType(type: WalletActivityItem["type"]): Activity["type"] {
  switch (type) {
    case "WALLET_CREATED":
      return "지갑 생성";
    case "EXCHANGE":
      return "교환";
    case "LOTTO_COMMIT":
      return "로또 참여";
    case "LOTTO_CLAIM":
      return "보상 수령";
    case "MINING":
      return "채굴";
    case "TRANSFER":
      return "전송";
    default:
      return "전송";
  }
}

function toStatusLabel(status: LottoEntryItem["status"] | LottoEntryResult["status"]): LottoHistoryEntry["statusLabel"] {
  switch (status) {
    case "WINNING":
      return "WINNING";
    case "LOSING":
      return "LOSING";
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "DRAWING";
  }
}

function formatRewardLabel(rewardJack: number | null) {
  if (!rewardJack || rewardJack <= 0) {
    return undefined;
  }

  return `${(rewardJack / SATOSHI).toLocaleString("ko-KR")} JACK`;
}

export function mapWalletActivity(item: WalletActivityItem): Activity {
  return {
    id: String(item.activityId),
    type: toKoreanActivityType(item.type),
    description: item.description,
    txId: item.txId ?? null,
    jackAmount: item.jackAmount ?? undefined,
    potAmount: item.potAmount ?? undefined,
    createdAt: formatDateTime(item.createdAt),
  };
}

export function mapWalletActivities(page: WalletActivityPage): Activity[] {
  return page.activities.map(mapWalletActivity);
}

export function mapLottoEntry(item: LottoEntryItem): LottoHistoryEntry {
  return {
    id: String(item.entryId),
    commitHash: item.commitHash,
    numbers: toHexDigits(item.chosenNumbers),
    date: formatDateTime(item.enteredAt),
    statusLabel: toStatusLabel(item.status),
    matchCount: item.matchCount,
    rewardLabel: formatRewardLabel(item.rewardJack),
    claimable: item.isClaimable,
    claimed: item.claimed,
  };
}

export function mapLottoEntries(items: LottoEntryItem[]): LottoHistoryEntry[] {
  return items.map(mapLottoEntry);
}

export function mapLottoResult(baseEntry: LottoHistoryEntry, result: LottoEntryResult): LottoHistoryDetail {
  return {
    ...baseEntry,
    statusLabel: toStatusLabel(result.status),
    matchCount: result.matchCount,
    rewardLabel: formatRewardLabel(result.rewardJack),
    claimable: result.isClaimable,
    resultNumbers: result.resultNumbers ? toHexDigits(result.resultNumbers) : null,
  };
}

export function mapMiningBlock(item: MiningBlockItem): MinedBlock {
  return {
    id: item.hash,
    blockId: item.blockId,
    height: item.height,
    hash: item.hash,
    reward: item.rewardJack / SATOSHI,
    createdAt: formatDateTime(item.minedAt),
  };
}

export function mapMiningBlocks(page: MiningBlocksPage): { totalRewardJack: number; blocks: MinedBlock[] } {
  return {
    totalRewardJack: page.totalRewardJack / SATOSHI,
    blocks: page.blocks.map(mapMiningBlock),
  };
}
