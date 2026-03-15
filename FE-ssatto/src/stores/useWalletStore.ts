import { create } from "zustand";
import { INITIAL_ACTIVITIES, INITIAL_ENTRIES, INITIAL_MINED_BLOCKS, MNEMONIC_SEED } from "../lib/constants";
import type { Activity, LottoEntry, MinedBlock } from "../types";

export interface WalletStore {
  isConnected: boolean;
  nickname: string;
  address: string;
  jackBalance: number;
  potBalance: number;
  mnemonic: string[];
  entries: LottoEntry[];
  activities: Activity[];
  minedBlocks: MinedBlock[];
  createWallet: (nickname?: string) => void;
  restoreWallet: (mnemonic: string[]) => void;
  exchangeJackToPot: (jackAmount: number) => void;
  commitLotto: (hexNumbers: string[]) => void;
  claimReward: (entryId: string) => void;
}

const makeAddress = () => "0x7FA1B8D2C4E6901234AB56CD78EF9012AC34EF78";
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(16).slice(2, 8)}`;

export const useWalletStore = create<WalletStore>((set) => ({
  isConnected: false,
  nickname: "행운 채굴자",
  address: "",
  jackBalance: 10250,
  potBalance: 184,
  mnemonic: [],
  entries: INITIAL_ENTRIES,
  activities: INITIAL_ACTIVITIES,
  minedBlocks: INITIAL_MINED_BLOCKS,
  createWallet: (nickname = "행운 채굴자") =>
    set(() => ({
      isConnected: true,
      nickname,
      address: makeAddress(),
      mnemonic: MNEMONIC_SEED,
      activities: [
        {
          id: makeId("act"),
          type: "지갑 생성",
          description: `${nickname} 지갑 생성 완료`,
          createdAt: "방금 전",
        },
        ...INITIAL_ACTIVITIES,
      ],
    })),
  restoreWallet: (mnemonic) =>
    set((state) => ({
      isConnected: true,
      mnemonic,
      address: makeAddress(),
      activities: [
        {
          id: makeId("act"),
          type: "지갑 생성",
          description: "니모닉으로 지갑 복구 완료",
          createdAt: "방금 전",
        },
        ...state.activities,
      ],
    })),
  exchangeJackToPot: (jackAmount) =>
    set((state) => {
      if (jackAmount <= 0 || jackAmount > state.jackBalance) {
        return state;
      }

      const potAmount = Number((jackAmount / 5).toFixed(2));

      return {
        jackBalance: state.jackBalance - jackAmount,
        potBalance: Number((state.potBalance + potAmount).toFixed(2)),
        activities: [
          {
            id: makeId("act"),
            type: "교환",
            description: "JACK를 POT로 전환",
            amount: `-${jackAmount} JACK / +${potAmount} POT`,
            createdAt: "방금 전",
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
        createdAt: "방금 전",
        numbers: hexNumbers,
        jackpotSnapshot: 1241500 + state.entries.length * 1200,
        status: "대기",
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
            description: `${hexNumbers.join(" · ")} 번호로 회차 참여`,
            amount: "-1 POT",
            createdAt: "방금 전",
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
            description: "로또 보상 수령 완료",
            amount: `+${target.reward} JACK`,
            createdAt: "방금 전",
          },
          ...state.activities,
        ],
      };
    }),
}));
