import { ApiError } from "../lib/api";

const WALLET_AUTH_NETWORK_ERROR = "지갑 인증 연결에 실패했습니다. 백엔드 또는 네트워크 연결을 확인해 주세요.";
const WALLET_WRITE_NETWORK_ERROR = "지갑 등록 요청을 전송하지 못했습니다. 백엔드 또는 네트워크 연결을 확인해 주세요.";

function isFailedToFetch(error: unknown) {
  return error instanceof TypeError && error.message.includes("Failed to fetch");
}

export function toWalletAuthErrorMessage(error: unknown) {
  if (isFailedToFetch(error)) {
    return WALLET_AUTH_NETWORK_ERROR;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "지갑 인증에 실패했습니다.";
}

export function toWalletWriteErrorMessage(error: unknown) {
  if (isFailedToFetch(error)) {
    return WALLET_WRITE_NETWORK_ERROR;
  }

  if (error instanceof ApiError && error.message.trim()) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "지갑 등록에 실패했습니다.";
}
