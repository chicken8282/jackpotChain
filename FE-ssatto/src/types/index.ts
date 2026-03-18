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
  type: "지갑 생성" | "지갑 등록" | "교환" | "로또 참여" | "보상 수령" | "채굴";
  description: string;
  amount?: string;
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
