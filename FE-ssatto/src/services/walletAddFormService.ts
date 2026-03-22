import { deriveWalletCredentials } from "../lib/crypto/wallet";
import type { WalletThemeId } from "../components/wallet/walletThemes";

interface WalletCredentialPayload {
  address?: string;
  privateKey?: string;
  password?: string;
}

interface PrepareWalletAddSubmissionInput {
  mode: "create" | "restore";
  nickname: string;
  color: WalletThemeId;
  password: string;
  passwordConfirm: string;
  restorePrivateKey?: string;
  generatedCredentials?: WalletCredentialPayload;
}

interface PrepareWalletAddSubmissionResult {
  nickname: string;
  type: "create" | "restore";
  color: WalletThemeId;
  payload: Required<WalletCredentialPayload>;
}

export function validateWalletPassword(password: string, passwordConfirm: string) {
  if (password.trim().length < 8) {
    return "지갑 비밀번호는 8자 이상이어야 합니다.";
  }

  if (password !== passwordConfirm) {
    return "비밀번호 확인이 일치하지 않습니다.";
  }

  return null;
}

export function prepareWalletAddSubmission(
  input: PrepareWalletAddSubmissionInput,
): PrepareWalletAddSubmissionResult {
  const passwordError = validateWalletPassword(input.password, input.passwordConfirm);
  if (passwordError) {
    throw new Error(passwordError);
  }

  const nickname = input.nickname.trim();
  if (!nickname) {
    throw new Error("지갑 이름을 입력해주세요.");
  }

  if (input.mode === "restore") {
    if (!input.restorePrivateKey?.trim()) {
      throw new Error("개인 키를 입력해주세요.");
    }

    const credentials = deriveWalletCredentials(input.restorePrivateKey.trim());
    return {
      nickname,
      type: "restore",
      color: input.color,
      payload: {
        address: credentials.address,
        privateKey: credentials.privateKey,
        password: input.password.trim(),
      },
    };
  }

  if (!input.generatedCredentials?.address || !input.generatedCredentials.privateKey) {
    throw new Error("생성된 지갑 정보를 찾을 수 없습니다.");
  }

  return {
    nickname,
    type: "create",
    color: input.color,
    payload: {
      address: input.generatedCredentials.address,
      privateKey: input.generatedCredentials.privateKey,
      password: input.password.trim(),
    },
  };
}
