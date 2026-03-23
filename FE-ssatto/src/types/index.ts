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
  status: "당첨" | "추첨중" | "미당첨";
  reward: number;
  claimed: boolean;
}

export interface Activity {
  id: string;
  type: "지갑 생성" | "교환" | "로또 참여" | "보상 수령" | "채굴" | "전송";
  description: string;
  amount?: string;
  jackAmount?: number;
  potAmount?: number;
  txId?: string | null;
  createdAt: string;
}

export interface MinedBlock {
  id: string;
  blockId: number;
  height: number;
  hash: string;
  reward: number;
  createdAt: string;
}
