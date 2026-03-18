export interface BlockData {
  id: string;
  hash: string;
  reward: number;
  status: "confirmed" | "pending";
}

export interface LottoEntry {
  id: string;
  createdAt: string;
  numbers: string[];
  jackpotSnapshot: number;
  status: "DRAWING" | "WINNING" | "LOSING";
  reward: number;
  claimed: boolean;
  isClaimable: boolean;
}

export interface Activity {
  id: string;
  type: "WALLET_CREATED" | "WALLET_REGISTERED" | "EXCHANGE" | "LOTTO_COMMIT" | "LOTTO_CLAIM" | "MINING";
  description: string;
  jackAmount?: number;
  potAmount?: number;
  createdAt: string;
}

export interface MinedBlock {
  id: string;
  height: number;
  hash: string;
  reward: number;
  createdAt: string;
}
