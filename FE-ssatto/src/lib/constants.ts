import type { Activity, BlockData, LottoEntry, MinedBlock } from "../types";

export const COLORS = {
  bgPrimary: "#060B18",
  surface: "#0D1322",
  surfaceElevated: "#111827",
  border: "#1E293B",
  textPrimary: "#F1F5F9",
  textSecondary: "#64748B",
  textTertiary: "#475569",
  accentGold: "#E5A000",
  accentGoldDark: "#B8860B",
  success: "#10B981",
  danger: "#EF4444",
  info: "#3B82F6",
} as const;

export const DASHBOARD_BLOCKS: BlockData[] = [
  { id: "B-924", hash: "0x8A24F1", reward: 50, status: "confirmed" },
  { id: "B-925", hash: "0x8A251C", reward: 50, status: "confirmed" },
  { id: "B-926", hash: "0x8A267D", reward: 50, status: "confirmed" },
  { id: "B-927", hash: "0x8A27E9", reward: 50, status: "confirmed" },
  { id: "B-928", hash: "0x8A2840", reward: 50, status: "confirmed" },
];

export const MEMPOOL_BLOCKS: BlockData[] = [
  { id: "MP-21", hash: "0xP021AF", reward: 20, status: "pending" },
  { id: "MP-22", hash: "0xP022D1", reward: 20, status: "pending" },
  { id: "MP-23", hash: "0xP0239C", reward: 20, status: "pending" },
];

export const INITIAL_ENTRIES: LottoEntry[] = [
  {
    id: "entry-001",
    createdAt: "03.16 13:20",
    numbers: ["a", "f", "b", "d", "4", "e"],
    jackpotSnapshot: 1241500,
    status: "당첨",
    reward: 380,
    claimed: false,
  },
  {
    id: "entry-002",
    createdAt: "03.16 11:45",
    numbers: ["9", "1", "a", "1", "7", "b"],
    jackpotSnapshot: 1238800,
    status: "추첨중",
    reward: 0,
    claimed: false,
  },
  {
    id: "entry-003",
    createdAt: "03.15 21:12",
    numbers: ["3", "5", "7", "8", "a", "f"],
    jackpotSnapshot: 1231200,
    status: "미당첨",
    reward: 0,
    claimed: true,
  },
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: "act-001",
    type: "채굴",
    description: "블록 #928 채굴 보상이 지급되었습니다.",
    amount: "+50 JACK",
    createdAt: "03.16 15:22",
  },
  {
    id: "act-002",
    type: "교환",
    description: "JACK를 POT로 교환했습니다.",
    amount: "-120 JACK / +24 POT",
    createdAt: "03.16 14:10",
  },
  {
    id: "act-003",
    type: "로또 참여",
    description: "6개 번호 조합으로 로또에 참여했습니다.",
    amount: "-1 POT",
    createdAt: "03.16 13:20",
  },
];

export const INITIAL_MINED_BLOCKS: MinedBlock[] = [
  { id: "mine-928", blockId: 928, height: 928, hash: "0x8A2840", reward: 50, createdAt: "03.16 15:22" },
  { id: "mine-927", blockId: 927, height: 927, hash: "0x8A27E9", reward: 50, createdAt: "03.16 12:05" },
  { id: "mine-922", blockId: 922, height: 922, hash: "0x8A22CF", reward: 50, createdAt: "03.15 18:44" },
  { id: "mine-917", blockId: 917, height: 917, hash: "0x8A179B", reward: 50, createdAt: "03.15 08:21" },
];

export const LOTTO_TIER_RANKING = [
  { rank: 1, nickname: "hashnova", reward: 182000, matchCount: 6 },
  { rank: 2, nickname: "abcd", reward: 142000, matchCount: 5 },
  { rank: 3, nickname: "mymy", reward: 142000, matchCount: 4 },
] as const;

export const PRIZE_ROWS = [
  { label: "6개 일치", reward: "잭팟 풀 100%" },
  { label: "5개 + 보너스", reward: "8,500 JACK" },
  { label: "5개 일치", reward: "2,100 JACK" },
  { label: "4개 일치", reward: "240 JACK" },
  { label: "3개 일치", reward: "60 JACK" },
];

export const MNEMONIC_SEED = [
  "ledger",
  "copper",
  "orbit",
  "silver",
  "ticket",
  "mint",
  "planet",
  "vertex",
  "lucky",
  "signal",
  "puzzle",
  "anchor",
];
