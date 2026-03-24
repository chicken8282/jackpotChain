import { requestAuthChallenge, verifyAuthChallenge } from "./authService";
import { deriveWalletCredentials, signAuthMessage } from "../lib/crypto/wallet";

export interface WalletAuthInput {
  address: string;
  privateKey: string;
}

export async function loginWithWallet(input: WalletAuthInput) {
  const credentials = deriveWalletCredentials(input.privateKey, input.address);
  const challenge = await requestAuthChallenge({ address: credentials.address });
  const signature = signAuthMessage(challenge.message, credentials.privateKey);

  return verifyAuthChallenge({
    challengeId: challenge.challengeId,
    address: credentials.address,
    publicKey: credentials.publicKey,
    signature,
  });
}
