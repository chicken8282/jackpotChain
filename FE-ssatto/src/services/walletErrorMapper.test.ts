import { describe, expect, it } from "vitest";
import { ApiError } from "../lib/api";
import { toWalletAuthErrorMessage, toWalletWriteErrorMessage } from "./walletErrorMapper";

describe("wallet error mapper", () => {
  it("Failed to fetch를 지갑 인증용 안내 메시지로 변환한다", () => {
    expect(toWalletAuthErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "지갑 인증 연결에 실패했습니다. 백엔드 또는 네트워크 연결을 확인해 주세요.",
    );
  });

  it("API 예외 메시지는 write flow에서 그대로 유지한다", () => {
    expect(toWalletWriteErrorMessage(new ApiError("지갑 등록에 실패했습니다.", 503))).toBe(
      "지갑 등록에 실패했습니다.",
    );
  });
});
