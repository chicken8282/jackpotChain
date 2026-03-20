import { getJson, postJson } from "../lib/api";

export interface ExchangeInfo {
  jackBalance: number;
  potBalance: number;
}

export interface ExchangeRequest {
  fromAddress: string;
  jackAmount: number;
  signedTxHex: string;
}

export interface ExchangeResponse {
  txId: string;
  burnedJack: number;
  receivedPot: number;
  exchangeRate: number;
}

export function getExchangeInfo(address: string, token?: string) {
  const query = encodeURIComponent(address);
  return getJson<ExchangeInfo>(`/v1/exchange/info?address=${query}`, undefined, token);
}

export function exchangeJackToPot(request: ExchangeRequest, token: string) {
  return postJson<ExchangeResponse, ExchangeRequest>("/v1/exchange/jack-to-pot", request, token);
}
