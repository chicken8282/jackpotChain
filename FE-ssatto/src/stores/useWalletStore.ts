import { create } from "zustand";
import {
  INITIAL_ACTIVITIES,
  INITIAL_ENTRIES,
  INITIAL_MINED_BLOCKS,
} from "../lib/constants";
import type { Activity, LottoEntry, MinedBlock } from "../types";
import type { WalletThemeId } from "../components/wallet/walletThemes";

interface WalletCredentials {
  address: string;
  privateKey: string;
}

export interface WalletStore {
  isConnected: boolean;
  nickname: string;
  address: string;
  privateKey: string;
  walletColor: WalletThemeId;
  jackBalance: number;
  potBalance: number;
  entries: LottoEntry[];
  activities: Activity[];
  minedBlocks: MinedBlock[];
  createWallet: (
    nickname?: string,
    color?: WalletThemeId,
    credentials?: Partial<WalletCredentials>,
  ) => void;
  restoreWallet: (
    privateKey: string,
    address: string,
    nickname?: string,
    color?: WalletThemeId,
  ) => void;
  exchangeJackToPot: (jackAmount: number) => void;
  commitLotto: (hexNumbers: string[]) => void;
  claimReward: (entryId: string) => void;
}

const makeId = (prefix: string) => `${prefix}-${Math.random().toString(16).slice(2, 8)}`;

const makeTimestamp = () =>
  new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

const makeAddress = () =>
  `0x${Math.random().toString(16).slice(2).toUpperCase().padEnd(40, "0").slice(0, 40)}`;

const makePrivateKey = () =>
  `0x${Math.random().toString(16).slice(2).toUpperCase().padEnd(64, "A").slice(0, 64)}`;

export const useWalletStore = create<WalletStore>((set) => ({
  isConnected: false,
  nickname: "내 지갑",
  address: "",
  privateKey: "",
  walletColor: "gray",
  jackBalance: 10250,
  potBalance: 184,
  entries: INITIAL_ENTRIES,
  activities: INITIAL_ACTIVITIES,
  minedBlocks: INITIAL_MINED_BLOCKS,
  createWallet: (nickname = "내 지갑", color = "gray", credentials) => {
    const address = credentials?.address ?? makeAddress();
    const privateKey = credentials?.privateKey ?? makePrivateKey();

    set(() => ({
      isConnected: true,
      nickname,
      address,
      privateKey,
      walletColor: color,
      activities: [
        {
          id: makeId("act"),
          type: "지갑 생성",
          description: `${nickname} 지갑을 생성했습니다.`,
          createdAt: makeTimestamp(),
        },
        ...INITIAL_ACTIVITIES,
      ],
    }));
  },
  restoreWallet: (privateKey, address, nickname = "기존 지갑", color = "gray") =>
    set((state) => ({
      isConnected: true,
      nickname,
      privateKey,
      address,
      walletColor: color,
      activities: [
        {
          id: makeId("act"),
          type: "지갑 등록",
          description: "기존 지갑을 private key와 주소로 등록했습니다.",
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
      if (potAmount < 1) {
        return state;
      }

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
