import { exchangeJackToPot } from "./exchangeService";
import { claimLottoReward, commitLotto, getLottoClaimContext } from "./lottoService";
import { getWalletUtxos } from "./walletService";
import { COIN } from "./tx/txCodec";
import { buildExchangeTransaction, buildLottoClaimTransaction, buildLottoCommitTransaction } from "./tx/txBuilder";

interface WriteFlowBaseInput {
  address: string;
  privateKey: string;
  accessToken: string;
}

interface ExchangeWriteInput extends WriteFlowBaseInput {
  jackAmount?: number;
}

interface LottoCommitWriteInput extends WriteFlowBaseInput {
  chosenNumbers: number[];
}

interface LottoClaimWriteInput extends WriteFlowBaseInput {
  commitHash: string;
}

export async function submitExchangeWrite(input: ExchangeWriteInput) {
  const jackAmount = input.jackAmount ?? 100 * COIN;
  const utxoResponse = await getWalletUtxos(input.address, input.accessToken);
  const transaction = buildExchangeTransaction({
    address: input.address,
    privateKey: input.privateKey,
    utxos: utxoResponse.utxos,
    jackAmount,
  });

  return exchangeJackToPot(
    {
      fromAddress: input.address,
      jackAmount,
      signedTxHex: transaction.signedTxHex,
    },
    input.accessToken,
  );
}

export async function submitLottoCommitWrite(input: LottoCommitWriteInput) {
  const utxoResponse = await getWalletUtxos(input.address, input.accessToken);
  const transaction = buildLottoCommitTransaction({
    address: input.address,
    privateKey: input.privateKey,
    utxos: utxoResponse.utxos,
    chosenNumbers: input.chosenNumbers,
  });

  return commitLotto(
    {
      fromAddress: input.address,
      chosenNumbers: input.chosenNumbers,
      signedTxHex: transaction.signedTxHex,
    },
    input.accessToken,
  );
}

export async function submitLottoClaimWrite(input: LottoClaimWriteInput) {
  const [utxoResponse, claimContext] = await Promise.all([
    getWalletUtxos(input.address, input.accessToken),
    getLottoClaimContext(input.commitHash, input.accessToken),
  ]);
  if (!claimContext.claimable) {
    throw new Error("현재 수령 가능한 보상만 클레임할 수 있습니다.");
  }

  const transaction = buildLottoClaimTransaction({
    address: input.address,
    privateKey: input.privateKey,
    walletUtxos: utxoResponse.utxos,
    poolUtxos: claimContext.poolUtxos,
    commitHash: input.commitHash,
    rewardJack: claimContext.rewardJack ?? 0,
    rewardPot: claimContext.rewardPot ?? 0,
  });

  return claimLottoReward(
    {
      fromAddress: input.address,
      commitHash: input.commitHash,
      signedTxHex: transaction.signedTxHex,
    },
    input.accessToken,
  );
}
