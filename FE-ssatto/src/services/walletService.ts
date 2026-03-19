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

export function registerWallet(request: RegisterWalletRequest) {
  return postJson<WalletSummary, RegisterWalletRequest>("/v1/wallet", request);
}

export function getWallets(addresses: string[]) {
  const query = encodeURIComponent(addresses.join(","));
  return getJson<WalletListResponse>(`/v1/wallet?addresses=${query}`);
}
