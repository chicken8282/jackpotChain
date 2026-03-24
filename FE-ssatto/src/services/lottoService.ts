import { getJson, postJson } from "../lib/api";

export interface LottoPrizeTier {
  rank: number;
  matches: number;
  rewardJack: number;
}

export interface LottoOverview {
  jackBalance: number;
  potBalance: number;
  poolBalanceJack: number;
  totalEntries: number;
  totalWinners: number;
  prizeTiers: LottoPrizeTier[];
}

export interface LottoEntryItem {
  entryId: number;
  commitHash: string;
  chosenNumbers: number[];
  status: "DRAWING" | "WINNING" | "LOSING" | "EXPIRED";
  matchCount: number | null;
  rewardJack: number | null;
  claimed: boolean;
  isClaimable: boolean;
  enteredAt: string;
}

export interface LottoEntriesResponse {
  entries: LottoEntryItem[];
}

export interface LottoEntryResult {
  commitHash: string;
  chosenNumbers: number[];
  resultNumbers: number[] | null;
  matchCount: number | null;
  isClaimable: boolean;
  status: "DRAWING" | "WINNING" | "LOSING" | "EXPIRED";
  rewardJack: number | null;
}

export interface LottoCommitRequest {
  fromAddress: string;
  chosenNumbers: number[];
  signedTxHex: string;
}

export interface LottoClaimRequest {
  fromAddress: string;
  commitHash: string;
  signedTxHex: string;
}

export interface LottoClaimPoolUtxo {
  txId: string;
  vout: number;
  jackAmount: number;
  confirmations: number;
}

export interface LottoClaimContext {
  commitHash: string;
  matchCount: number | null;
  rewardJack: number | null;
  rewardPot: number | null;
  claimable: boolean;
  poolUtxos: LottoClaimPoolUtxo[];
}

export interface LottoClaimResponse {
  claimTxId: string;
  matchCount: number;
  rewardJack: number | null;
  claimedAt: string;
}

export function getLottoOverview(address: string, token?: string) {
  const query = encodeURIComponent(address);
  return getJson<LottoOverview>(`/v1/lotto?address=${query}`, undefined, token);
}

export function getLottoEntries(address: string, token?: string, status: LottoEntryItem["status"] | "ALL" = "ALL") {
  const params = new URLSearchParams({ address });
  if (status !== "ALL") {
    params.set("status", status);
  }

  return getJson<LottoEntriesResponse>(`/v1/lotto/entries?${params.toString()}`, undefined, token);
}

export function getLottoEntryResult(commitHash: string, token?: string) {
  return getJson<LottoEntryResult>(`/v1/lotto/entries/${encodeURIComponent(commitHash)}/result`, undefined, token);
}

export function getLottoClaimContext(commitHash: string, token: string) {
  return getJson<LottoClaimContext>(`/v1/lotto/entries/${encodeURIComponent(commitHash)}/claim-context`, undefined, token);
}

export function commitLotto(request: LottoCommitRequest, token: string) {
  return postJson<null, LottoCommitRequest>("/v1/lotto/commit", request, token);
}

export function claimLottoReward(request: LottoClaimRequest, token: string) {
  return postJson<LottoClaimResponse, LottoClaimRequest>("/v1/lotto/claim", request, token);
}
