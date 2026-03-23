import { describe, expect, it } from "vitest";
import { prepareWalletAddSubmission, validateWalletPassword } from "./walletAddFormService";

describe("wallet add form service", () => {
  it("create mode는 생성된 주소와 private key를 그대로 payload로 만든다", () => {
    const result = prepareWalletAddSubmission({
      mode: "create",
      nickname: "추가 지갑",
      color: "gray",
      password: "password1",
      passwordConfirm: "password1",
      generatedCredentials: {
        address: "addr-001",
        privateKey: "priv-001",
      },
    });

    expect(result.type).toBe("create");
    expect(result.payload).toEqual({
      address: "addr-001",
      privateKey: "priv-001",
      password: "password1",
    });
  });

  it("restore mode는 private key로 주소를 다시 계산한다", () => {
    const result = prepareWalletAddSubmission({
      mode: "restore",
      nickname: "복구 지갑",
      color: "gray",
      password: "password1",
      passwordConfirm: "password1",
      restorePrivateKey: "1111111111111111111111111111111111111111111111111111111111111111",
    });

    expect(result.type).toBe("restore");
    expect(result.payload.address).toBe("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82");
  });

  it("비밀번호 확인이 다르면 검증 에러를 반환한다", () => {
    expect(validateWalletPassword("password1", "password2")).toBe("비밀번호 확인이 일치하지 않습니다.");
  });
});
