import { getJson } from "../lib/api";

export interface ExchangeInfo {
  jackBalance: number;
  potBalance: number;
}

export function getExchangeInfo(address: string) {
  const query = encodeURIComponent(address);
  return getJson<ExchangeInfo>(`/v1/exchange/info?address=${query}`);
}
