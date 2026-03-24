import { secp256k1 } from "@noble/curves/secp256k1";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { addressToPublicKeyHash } from "../../lib/crypto/address";
import { doubleSha256Bytes } from "../../lib/crypto/hash";
import { deriveWalletCredentials } from "../../lib/crypto/wallet";
import type { WalletUtxo } from "../walletService";
import {
  COIN,
  COINBASE_MATURITY_CONFIRMATIONS,
  EXCHANGE_RATE_JACK,
  MIN_TX_FEE,
  POT_ASSET_ID,
  type UnsignedTransaction,
  transactionIdHex,
  txToHex,
  utf8Bytes,
} from "./txCodec";

const EXCHANGE_TX_VERSION = 2;
const LOTTO_COMMIT_TX_VERSION = 3;
const LOTTO_CLAIM_TX_VERSION = 5;
const SEQUENCE_FINAL = 0xffffffff;
const JACKPOT_POOL_MARKER = utf8Bytes("JACKPOT_POOL");

interface BuilderBaseInput {
  address: string;
  privateKey: string;
  utxos: WalletUtxo[];
}

export interface ExchangeBuildInput extends BuilderBaseInput {
  jackAmount: number;
}

export interface LottoCommitBuildInput extends BuilderBaseInput {
  chosenNumbers: number[];
}

export interface LottoClaimPoolUtxo {
  txId: string;
  vout: number;
  jackAmount: number;
  confirmations: number;
}

export interface LottoClaimBuildInput {
  address: string;
  privateKey: string;
  walletUtxos: WalletUtxo[];
  poolUtxos: LottoClaimPoolUtxo[];
  commitHash: string;
  rewardJack: number;
  rewardPot: number;
}

export interface BuiltTransaction {
  signedTxHex: string;
  txId: string;
}

function concatBytes(...chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function encodeUint32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function encodeVarint(value: number) {
  if (value < 0xfd) {
    return Uint8Array.of(value);
  }
  if (value <= 0xffff) {
    const bytes = new Uint8Array(3);
    bytes[0] = 0xfd;
    new DataView(bytes.buffer).setUint16(1, value, true);
    return bytes;
  }
  return concatBytes(Uint8Array.of(0xfe), encodeUint32(value));
}

function encodeVarstr(bytes: Uint8Array) {
  return concatBytes(encodeVarint(bytes.length), bytes);
}

function createP2pkhScriptPubKey(address: string) {
  const publicKeyHash = addressToPublicKeyHash(address);
  return Uint8Array.of(0x76, 0xa9, 0x14, ...publicKeyHash, 0x88, 0xac);
}

function createOpReturnScript(data: Uint8Array) {
  if (data.length > 80) {
    throw new Error("OP_RETURN 데이터가 너무 깁니다.");
  }
  return Uint8Array.of(0x6a, ...encodeVarstr(data));
}

function createClaimScript(commitHash: string) {
  const commitHashBytes = hexToBytes(commitHash);
  if (commitHashBytes.length !== 32) {
    throw new Error("클레임 대상 커밋 해시 형식이 올바르지 않습니다.");
  }
  return createOpReturnScript(concatBytes(utf8Bytes("CLAIM"), commitHashBytes));
}

function createScriptSig(signature: Uint8Array, publicKey: Uint8Array) {
  const signatureWithType = concatBytes(signature, Uint8Array.of(0x01));
  return concatBytes(encodeVarstr(signatureWithType), encodeVarstr(publicKey));
}

function createSignatureHash(transaction: UnsignedTransaction, inputIndex: number, scriptPubKey: Uint8Array) {
  const signingTx: UnsignedTransaction = {
    version: transaction.version,
    locktime: transaction.locktime,
    outputs: transaction.outputs.map((output) => ({
      jackValue: output.jackValue,
      assets: { ...output.assets },
      scriptPubKey: output.scriptPubKey,
    })),
    inputs: transaction.inputs.map((input, index) => ({
      prevTxId: input.prevTxId,
      outputIndex: input.outputIndex,
      scriptSig: index === inputIndex ? scriptPubKey : new Uint8Array(),
      sequence: input.sequence,
    })),
  };

  return doubleSha256Bytes(concatBytes(hexToBytes(txToHex(signingTx)), encodeUint32(1)));
}

function signTransaction(
  transaction: UnsignedTransaction,
  signingUtxos: WalletUtxo[],
  privateKey: string,
  publicKeyHex: string,
  inputOffset = 0,
) {
  const publicKeyBytes = hexToBytes(publicKeyHex);
  signingUtxos.forEach((utxo, index) => {
    const inputIndex = index + inputOffset;
    const scriptPubKey = createP2pkhScriptPubKey(utxo.address);
    const signatureHash = createSignatureHash(transaction, inputIndex, scriptPubKey);
    const signature = secp256k1.sign(signatureHash, hexToBytes(privateKey), { prehash: false }).toDERRawBytes();
    transaction.inputs[inputIndex].scriptSig = createScriptSig(signature, publicKeyBytes);
  });
}

function isCoinbaseSpendable(utxo: WalletUtxo) {
  return !utxo.coinbase || utxo.confirmations >= COINBASE_MATURITY_CONFIRMATIONS;
}

function hasPositiveAssets(utxo: WalletUtxo) {
  return Object.values(utxo.assets).some((amount) => amount > 0);
}

function selectUtxos<T>(candidates: T[], requiredAmount: number, amountSelector: (utxo: T) => number) {
  let total = 0;
  const selected: T[] = [];
  [...candidates]
    .sort((left, right) => amountSelector(right) - amountSelector(left))
    .some((candidate) => {
      selected.push(candidate);
      total += amountSelector(candidate);
      return total >= requiredAmount;
    });

  return { selected, total };
}

function assertHexNumbers(chosenNumbers: number[]) {
  if (chosenNumbers.length !== 6 || chosenNumbers.some((value) => value < 0 || value > 15 || !Number.isInteger(value))) {
    throw new Error("로또 번호는 0부터 15까지 6개를 선택해야 합니다.");
  }
}

export function buildExchangeTransaction(input: ExchangeBuildInput): BuiltTransaction {
  const credentials = deriveWalletCredentials(input.privateKey, input.address);
  if (input.jackAmount < EXCHANGE_RATE_JACK * COIN) {
    throw new Error("교환하려면 최소 100 JACK이 필요합니다.");
  }

  const spendableJackUtxos = input.utxos.filter(
    (utxo) => utxo.address === input.address && utxo.jackAmount > 0 && !hasPositiveAssets(utxo) && isCoinbaseSpendable(utxo),
  );
  const { selected, total } = selectUtxos(spendableJackUtxos, input.jackAmount, (utxo) => utxo.jackAmount);
  if (total < input.jackAmount) {
    throw new Error("교환에 사용할 JACK UTXO가 부족합니다.");
  }

  const exchangeUnit = EXCHANGE_RATE_JACK * COIN;
  const potAmount = Math.floor(input.jackAmount / exchangeUnit) * COIN;
  const jackExchanged = (potAmount / COIN) * exchangeUnit;
  const jackToPool = Math.floor((jackExchanged * 80) / 100);
  const jackBurned = Math.floor((jackExchanged * 19) / 100);
  const jackChange = total - jackExchanged;

  const transaction: UnsignedTransaction = {
    version: EXCHANGE_TX_VERSION,
    locktime: 0,
    inputs: selected.map((utxo) => ({
      prevTxId: hexToBytes(utxo.txId),
      outputIndex: utxo.vout,
      scriptSig: new Uint8Array(),
      sequence: SEQUENCE_FINAL,
    })),
    outputs: [
      {
        jackValue: 0,
        assets: { [POT_ASSET_ID]: potAmount },
        scriptPubKey: createP2pkhScriptPubKey(input.address),
      },
      {
        jackValue: jackToPool,
        assets: {},
        scriptPubKey: JACKPOT_POOL_MARKER,
      },
      {
        jackValue: 0,
        assets: {},
        scriptPubKey: createOpReturnScript(utf8Bytes(`EXCHANGE:${jackBurned}`)),
      },
      ...(jackChange > 0
        ? [{
            jackValue: jackChange,
            assets: {},
            scriptPubKey: createP2pkhScriptPubKey(input.address),
          }]
        : []),
    ],
  };

  signTransaction(transaction, selected, credentials.privateKey, credentials.publicKey);

  return {
    signedTxHex: txToHex(transaction),
    txId: transactionIdHex(transaction),
  };
}

export function buildLottoCommitTransaction(input: LottoCommitBuildInput): BuiltTransaction {
  const credentials = deriveWalletCredentials(input.privateKey, input.address);
  assertHexNumbers(input.chosenNumbers);

  const spendablePotUtxos = input.utxos.filter(
    (utxo) =>
      utxo.address === input.address &&
      (utxo.assets[POT_ASSET_ID] ?? 0) > 0 &&
      isCoinbaseSpendable(utxo),
  );
  const potSelection = selectUtxos(spendablePotUtxos, COIN, (utxo) => utxo.assets[POT_ASSET_ID] ?? 0);
  if (potSelection.total < COIN) {
    throw new Error("로또 참여에 필요한 POT UTXO가 부족합니다.");
  }

  const jackFromPotInputs = potSelection.selected.reduce((sum, utxo) => sum + utxo.jackAmount, 0);
  const feeJackUtxos = input.utxos.filter(
    (utxo) =>
      utxo.address === input.address &&
      utxo.jackAmount > 0 &&
      !hasPositiveAssets(utxo) &&
      !potSelection.selected.some((selected) => selected.txId === utxo.txId && selected.vout === utxo.vout) &&
      isCoinbaseSpendable(utxo),
  );
  const extraJackSelection = jackFromPotInputs >= MIN_TX_FEE
    ? { selected: [] as WalletUtxo[], total: 0 }
    : selectUtxos(feeJackUtxos, MIN_TX_FEE - jackFromPotInputs, (utxo) => utxo.jackAmount);
  const totalJack = jackFromPotInputs + extraJackSelection.total;
  if (totalJack < MIN_TX_FEE) {
    throw new Error("로또 참여 수수료를 위한 JACK UTXO가 부족합니다.");
  }

  const selected = [...potSelection.selected, ...extraJackSelection.selected];
  const potChange = potSelection.total - COIN;
  const jackChange = totalJack - MIN_TX_FEE;
  const transaction: UnsignedTransaction = {
    version: LOTTO_COMMIT_TX_VERSION,
    locktime: 0,
    inputs: selected.map((utxo) => ({
      prevTxId: hexToBytes(utxo.txId),
      outputIndex: utxo.vout,
      scriptSig: new Uint8Array(),
      sequence: SEQUENCE_FINAL,
    })),
    outputs: [
      {
        jackValue: 0,
        assets: {},
        scriptPubKey: createOpReturnScript(concatBytes(utf8Bytes("LOTTO"), Uint8Array.from(input.chosenNumbers))),
      },
      ...(potChange > 0
        ? [{
            jackValue: 0,
            assets: { [POT_ASSET_ID]: potChange },
            scriptPubKey: createP2pkhScriptPubKey(input.address),
          }]
        : []),
      ...(jackChange > 0
        ? [{
            jackValue: jackChange,
            assets: {},
            scriptPubKey: createP2pkhScriptPubKey(input.address),
          }]
        : []),
    ],
  };

  signTransaction(transaction, selected, credentials.privateKey, credentials.publicKey);

  return {
    signedTxHex: txToHex(transaction),
    txId: transactionIdHex(transaction),
  };
}

export function buildLottoClaimTransaction(input: LottoClaimBuildInput): BuiltTransaction {
  const credentials = deriveWalletCredentials(input.privateKey, input.address);

  const feeUtxos = input.walletUtxos.filter(
    (utxo) => utxo.address === input.address && utxo.jackAmount > 0 && !hasPositiveAssets(utxo) && isCoinbaseSpendable(utxo),
  );
  const feeSelection = selectUtxos(feeUtxos, MIN_TX_FEE, (utxo) => utxo.jackAmount);
  if (feeSelection.total < MIN_TX_FEE) {
    throw new Error("클레임 수수료를 위한 JACK UTXO가 부족합니다.");
  }

  const rewardJack = Math.max(0, input.rewardJack);
  const rewardPot = Math.max(0, input.rewardPot);
  const poolSelection = rewardJack > 0
    ? selectUtxos(input.poolUtxos, rewardJack, (utxo) => utxo.jackAmount)
    : { selected: [] as LottoClaimPoolUtxo[], total: 0 };
  if (rewardJack > 0 && poolSelection.total < rewardJack) {
    throw new Error("클레임 보상을 위한 잭팟 풀 UTXO가 부족합니다.");
  }

  const recipientJack = rewardJack + Math.max(0, feeSelection.total - MIN_TX_FEE);
  const poolChange = poolSelection.total - rewardJack;
  const transaction: UnsignedTransaction = {
    version: LOTTO_CLAIM_TX_VERSION,
    locktime: 0,
    inputs: [
      ...feeSelection.selected.map((utxo) => ({
        prevTxId: hexToBytes(utxo.txId),
        outputIndex: utxo.vout,
        scriptSig: new Uint8Array(),
        sequence: SEQUENCE_FINAL,
      })),
      ...poolSelection.selected.map((utxo) => ({
        prevTxId: hexToBytes(utxo.txId),
        outputIndex: utxo.vout,
        scriptSig: new Uint8Array(),
        sequence: SEQUENCE_FINAL,
      })),
    ],
    outputs: [
      {
        jackValue: recipientJack,
        assets: rewardPot > 0 ? { [POT_ASSET_ID]: rewardPot } : {},
        scriptPubKey: createP2pkhScriptPubKey(input.address),
      },
      ...(poolChange > 0
        ? [{
            jackValue: poolChange,
            assets: {},
            scriptPubKey: JACKPOT_POOL_MARKER,
          }]
        : []),
      {
        jackValue: 0,
        assets: {},
        scriptPubKey: createClaimScript(input.commitHash),
      },
    ],
  };

  signTransaction(transaction, feeSelection.selected, credentials.privateKey, credentials.publicKey);

  return {
    signedTxHex: txToHex(transaction),
    txId: transactionIdHex(transaction),
  };
}

export function decodeOpReturnData(scriptPubKeyHex: string) {
  const bytes = hexToBytes(scriptPubKeyHex);
  if (bytes[0] !== 0x6a) {
    return null;
  }
  const length = bytes[1];
  return bytes.slice(2, 2 + length);
}

export function scriptPubKeyHexForAddress(address: string) {
  return bytesToHex(createP2pkhScriptPubKey(address));
}
