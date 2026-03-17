import { create } from "zustand";
import {
  INITIAL_ACTIVITIES,
  INITIAL_ENTRIES,
  INITIAL_MINED_BLOCKS,
  MNEMONIC_SEED,
} from "../lib/constants";
import type { Activity, LottoEntry, MinedBlock } from "../types";
import type { WalletThemeId } from "../components/wallet/walletThemes";

export interface WalletStore {
  isConnected: boolean;
  nickname: string;
  address: string;
  walletColor: WalletThemeId;
  jackBalance: number;
  potBalance: number;
  mnemonic: string[];
  entries: LottoEntry[];
  activities: Activity[];
  minedBlocks: MinedBlock[];
  createWallet: (nickname?: string, color?: WalletThemeId, mnemonic?: string[]) => void;
  restoreWallet: (mnemonic: string[], nickname?: string, color?: WalletThemeId) => void;
  exchangeJackToPot: (jackAmount: number) => void;
  exchangePotToJack: (potAmount: number) => void;
  commitLotto: (hexNumbers: string[]) => void;
  claimReward: (entryId: string) => void;
}

const makeAddress = () => `0x${Math.random().toString(16).slice(2, 18).padEnd(16, "0").toUpperCase()}AC34EF78`;
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(16).slice(2, 8)}`;
const makeTimestamp = () =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

export const useWalletStore = create<WalletStore>((set) => ({
  isConnected: false,
  nickname: "내 지갑",
  address: "",
  walletColor: "gray",
  jackBalance: 10250,
  potBalance: 184,
  mnemonic: [],
  entries: INITIAL_ENTRIES,
  activities: INITIAL_ACTIVITIES,
  minedBlocks: INITIAL_MINED_BLOCKS,
  createWallet: (nickname = "내 지갑", color = "gray", mnemonic = MNEMONIC_SEED) =>
    set(() => ({
      isConnected: true,
      nickname,
      address: makeAddress(),
      walletColor: color,
      mnemonic,
      activities: [
        {
          id: makeId("act"),
          type: "지갑 생성",
          description: `${nickname} 지갑을 생성했습니다.`,
          createdAt: makeTimestamp(),
        },
        ...INITIAL_ACTIVITIES,
      ],
    })),
  restoreWallet: (mnemonic, nickname = "복구 지갑", color = "gray") =>
    set((state) => ({
      isConnected: true,
      nickname,
      mnemonic,
      walletColor: color,
      address: makeAddress(),
      activities: [
        {
          id: makeId("act"),
          type: "지갑 생성",
          description: "복구 문구로 지갑을 등록했습니다.",
          createdAt: makeTimestamp(),
        },
        ...state.activities,
      ],
    })),
  exchangeJackToPot: (jackAmount) =>
    set((state) => {
      if (jackAmount <= 0 || jackAmount > state.jackBalance) {
        return state;
      }

      const potAmount = Math.floor(jackAmount / 100);

      return {
        jackBalance: state.jackBalance - potAmount * 100,
        potBalance: state.potBalance + potAmount,
        activities: [
          {
            id: makeId("act"),
            type: "교환",
            description: "JACK를 POT로 교환했습니다.",
            amount: `-${potAmount * 100} JACK / +${potAmount} POT`,
            createdAt: makeTimestamp(),
          },
          ...state.activities,
        ],
      };
    }),
  exchangePotToJack: (potAmount) =>
    set((state) => {
      if (potAmount <= 0 || potAmount > state.potBalance) {
        return state;
      }

      const jackAmount = potAmount * 100;

      return {
        jackBalance: state.jackBalance + jackAmount,
        potBalance: state.potBalance - potAmount,
        activities: [
          {
            id: makeId("act"),
            type: "교환",
            description: "POT를 JACK로 교환했습니다.",
            amount: `-${potAmount} POT / +${jackAmount} JACK`,
            createdAt: makeTimestamp(),
          },
          ...state.activities,
        ],
      };
    }),
  commitLotto: (hexNumbers) =>
    set((state) => {
      if (hexNumbers.length !== 6 || state.potBalance < 1) {
        return state;
      }

      const entry: LottoEntry = {
        id: makeId("entry"),
        createdAt: makeTimestamp(),
        numbers: hexNumbers,
        jackpotSnapshot: 1241500 + state.entries.length * 1200,
        status: "추첨중",
        reward: 0,
        claimed: false,
      };

      return {
        potBalance: Number((state.potBalance - 1).toFixed(2)),
        entries: [entry, ...state.entries],
        activities: [
          {
            id: makeId("act"),
            type: "로또 참여",
            description: `${hexNumbers.join(" ")} 조합으로 로또에 참여했습니다.`,
            amount: "-1 POT",
            createdAt: makeTimestamp(),
          },
          ...state.activities,
        ],
      };
    }),
  claimReward: (entryId) =>
    set((state) => {
      const target = state.entries.find((entry) => entry.id === entryId);
      if (!target || target.status !== "당첨" || target.claimed) {
        return state;
      }

      return {
        jackBalance: state.jackBalance + target.reward,
        entries: state.entries.map((entry) =>
          entry.id === entryId ? { ...entry, claimed: true } : entry,
        ),
        activities: [
          {
            id: makeId("act"),
            type: "보상 수령",
            description: "로또 보상을 수령했습니다.",
            amount: `+${target.reward} JACK`,
            createdAt: makeTimestamp(),
          },
          ...state.activities,
        ],
      };
    }),
}));
