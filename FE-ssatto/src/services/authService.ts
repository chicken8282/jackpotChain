import { postJson } from "../lib/api";

export interface IssueTokenRequest {
  address: string;
}

export interface AuthTokenResponse {
  token: string;
  address: string;
  expiresAt: string;
}

export function issueAuthToken(request: IssueTokenRequest) {
  return postJson<AuthTokenResponse, IssueTokenRequest>("/v1/auth/token", request);
}
