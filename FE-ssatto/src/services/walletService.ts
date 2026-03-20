import { getJson, postJson } from "../lib/api";

export interface RegisterWalletRequest {
  address: string;
  nickname?: string;
  walletColor?: string;
}

export interface WalletSummary {
  address: string;
  nickname: string | null;
  walletColor: string;
  jackBalance: number;
  potBalance: number;
  createdAt: string;
}

interface WalletListResponse {
  wallets: WalletSummary[];
}

export interface WalletActivityItem {
  activityId: number;
  type: "WALLET_CREATED" | "EXCHANGE" | "LOTTO_COMMIT" | "LOTTO_CLAIM" | "MINING" | "TRANSFER";
  description: string;
  txId: string | null;
  jackAmount: number | null;
  potAmount: number | null;
  createdAt: string;
}

export interface WalletActivityPage {
  hasNext: boolean;
  nextCursor: number | null;
  activities: WalletActivityItem[];
}

export function registerWallet(request: RegisterWalletRequest) {
  return postJson<WalletSummary, RegisterWalletRequest>("/v1/wallet", request);
}

export function getWallets(addresses: string[]) {
  const query = encodeURIComponent(addresses.join(","));
  return getJson<WalletListResponse>(`/v1/wallet?addresses=${query}`);
}

export function getWalletActivities(
  address: string,
  token?: string,
  cursor?: number | null,
  size = 20,
  type?: WalletActivityItem["type"] | "ALL",
) {
  const params = new URLSearchParams({
    size: String(size),
  });

  if (cursor != null) {
    params.set("lastActivityId", String(cursor));
  }
  if (type && type !== "ALL") {
    params.set("type", type);
  }

  return getJson<WalletActivityPage>(`/v1/wallet/${encodeURIComponent(address)}/activities?${params.toString()}`, undefined, token);
}
