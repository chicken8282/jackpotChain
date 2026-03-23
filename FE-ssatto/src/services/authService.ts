import { postJson } from "../lib/api";

export interface AuthChallengeRequest {
  address: string;
}

export interface AuthChallengeResponse {
  challengeId: string;
  address: string;
  nonce: string;
  message: string;
  expiresAt: string;
}

export interface AuthVerifyRequest {
  challengeId: string;
  address: string;
  publicKey: string;
  signature: string;
}

export interface AuthVerifyResponse {
  accessToken: string;
  walletAddress: string;
  accessTokenExpiresAt: string;
  refreshSessionHandle: string;
  refreshToken?: string;
}

export interface AuthRefreshRequest {
  sessionHandle: string;
}

export interface AuthRefreshResponse {
  accessToken: string;
  walletAddress: string;
  accessTokenExpiresAt: string;
  refreshSessionHandle: string;
  refreshToken?: string;
}

export interface AuthLogoutRequest {
  sessionHandle: string;
}

export function requestAuthChallenge(request: AuthChallengeRequest) {
  return postJson<AuthChallengeResponse, AuthChallengeRequest>("/v1/auth/challenge", request);
}

export function verifyAuthChallenge(request: AuthVerifyRequest) {
  return postJson<AuthVerifyResponse, AuthVerifyRequest>("/v1/auth/verify", request);
}

export function refreshAuthSession(request: AuthRefreshRequest) {
  return postJson<AuthRefreshResponse, AuthRefreshRequest>("/v1/auth/refresh", request);
}

export function logoutAuthSession(request: AuthLogoutRequest) {
  return postJson<void, AuthLogoutRequest>("/v1/auth/logout", request);
}
