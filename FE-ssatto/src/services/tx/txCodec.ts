import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { doubleSha256Bytes } from "../../lib/crypto/hash";

export const COIN = 100_000_000;
export const POT_ASSET_ID = "POT";
export const MIN_TX_FEE = 1_000_000;
export const EXCHANGE_RATE_JACK = 100;
export const COINBASE_MATURITY_CONFIRMATIONS = 101;

export interface UnsignedTxInput {
  prevTxId: Uint8Array;
  outputIndex: number;
  scriptSig: Uint8Array;
  sequence: number;
}

export interface UnsignedTxOutput {
  jackValue: number;
  assets: Record<string, number>;
  scriptPubKey: Uint8Array;
}

export interface UnsignedTransaction {
  version: number;
  inputs: UnsignedTxInput[];
  outputs: UnsignedTxOutput[];
  locktime: number;
}

export interface DecodedTransaction {
  version: number;
  inputs: Array<{
    prevTxIdHex: string;
    outputIndex: number;
    scriptSigHex: string;
    sequence: number;
  }>;
  outputs: Array<{
    jackValue: number;
    assets: Record<string, number>;
    scriptPubKeyHex: string;
  }>;
  locktime: number;
}

function encodeUint32(value: number) {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value, true);
  return bytes;
}

function encodeUint64(value: number) {
  const bytes = new Uint8Array(8);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, BigInt(value), true);
  return bytes;
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

export function utf8Bytes(value: string) {
  return new TextEncoder().encode(value);
}

export function encodeVarint(value: number) {
  if (value < 0xfd) {
    return Uint8Array.of(value);
  }

  if (value <= 0xffff) {
    const bytes = new Uint8Array(3);
    bytes[0] = 0xfd;
    new DataView(bytes.buffer).setUint16(1, value, true);
    return bytes;
  }

  if (value <= 0xffffffff) {
    return concatBytes(Uint8Array.of(0xfe), encodeUint32(value));
  }

  return concatBytes(Uint8Array.of(0xff), encodeUint64(value));
}

export function encodeVarstr(bytes: Uint8Array) {
  return concatBytes(encodeVarint(bytes.length), bytes);
}

export function serializeInput(input: UnsignedTxInput) {
  return concatBytes(
    Uint8Array.from(input.prevTxId).reverse(),
    encodeUint32(input.outputIndex),
    encodeVarstr(input.scriptSig),
    encodeUint32(input.sequence),
  );
}

export function serializeOutput(output: UnsignedTxOutput) {
  const assetEntries = Object.entries(output.assets)
    .filter(([, amount]) => amount > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  const assetBytes = assetEntries.map(([assetId, amount]) =>
    concatBytes(encodeVarstr(utf8Bytes(assetId)), encodeUint64(amount)),
  );

  return concatBytes(
    encodeUint64(output.jackValue),
    encodeVarint(assetEntries.length),
    ...assetBytes,
    encodeVarstr(output.scriptPubKey),
  );
}

export function serializeTransaction(transaction: UnsignedTransaction) {
  return concatBytes(
    encodeUint32(transaction.version),
    encodeVarint(transaction.inputs.length),
    ...transaction.inputs.map(serializeInput),
    encodeVarint(transaction.outputs.length),
    ...transaction.outputs.map(serializeOutput),
    encodeUint32(transaction.locktime),
  );
}

export function txToHex(transaction: UnsignedTransaction) {
  return bytesToHex(serializeTransaction(transaction));
}

export function transactionIdHex(transaction: UnsignedTransaction) {
  return bytesToHex(doubleSha256Bytes(serializeTransaction(transaction)));
}

function readVarint(bytes: Uint8Array, offset: number) {
  const prefix = bytes[offset];
  if (prefix < 0xfd) {
    return { value: prefix, nextOffset: offset + 1 };
  }
  if (prefix === 0xfd) {
    return { value: new DataView(bytes.buffer, bytes.byteOffset + offset + 1, 2).getUint16(0, true), nextOffset: offset + 3 };
  }
  if (prefix === 0xfe) {
    return { value: new DataView(bytes.buffer, bytes.byteOffset + offset + 1, 4).getUint32(0, true), nextOffset: offset + 5 };
  }
  return { value: Number(new DataView(bytes.buffer, bytes.byteOffset + offset + 1, 8).getBigUint64(0, true)), nextOffset: offset + 9 };
}

function readBytes(bytes: Uint8Array, offset: number, length: number) {
  return {
    value: bytes.slice(offset, offset + length),
    nextOffset: offset + length,
  };
}

function readVarstr(bytes: Uint8Array, offset: number) {
  const { value: length, nextOffset } = readVarint(bytes, offset);
  return readBytes(bytes, nextOffset, length);
}

function readUint32(bytes: Uint8Array, offset: number) {
  return {
    value: new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, true),
    nextOffset: offset + 4,
  };
}

function readUint64(bytes: Uint8Array, offset: number) {
  return {
    value: Number(new DataView(bytes.buffer, bytes.byteOffset + offset, 8).getBigUint64(0, true)),
    nextOffset: offset + 8,
  };
}

export function decodeTransactionHex(txHex: string): DecodedTransaction {
  const bytes = hexToBytes(txHex);
  let offset = 0;

  const version = readUint32(bytes, offset);
  offset = version.nextOffset;

  const inputCount = readVarint(bytes, offset);
  offset = inputCount.nextOffset;
  const inputs: DecodedTransaction["inputs"] = [];
  for (let index = 0; index < inputCount.value; index += 1) {
    const prevTx = readBytes(bytes, offset, 32);
    offset = prevTx.nextOffset;
    const outputIndex = readUint32(bytes, offset);
    offset = outputIndex.nextOffset;
    const scriptSig = readVarstr(bytes, offset);
    offset = scriptSig.nextOffset;
    const sequence = readUint32(bytes, offset);
    offset = sequence.nextOffset;

    inputs.push({
      prevTxIdHex: bytesToHex(Uint8Array.from(prevTx.value).reverse()),
      outputIndex: outputIndex.value,
      scriptSigHex: bytesToHex(scriptSig.value),
      sequence: sequence.value,
    });
  }

  const outputCount = readVarint(bytes, offset);
  offset = outputCount.nextOffset;
  const outputs: DecodedTransaction["outputs"] = [];
  for (let index = 0; index < outputCount.value; index += 1) {
    const jackValue = readUint64(bytes, offset);
    offset = jackValue.nextOffset;
    const assetCount = readVarint(bytes, offset);
    offset = assetCount.nextOffset;

    const assets: Record<string, number> = {};
    for (let assetIndex = 0; assetIndex < assetCount.value; assetIndex += 1) {
      const assetId = readVarstr(bytes, offset);
      offset = assetId.nextOffset;
      const amount = readUint64(bytes, offset);
      offset = amount.nextOffset;
      assets[new TextDecoder().decode(assetId.value)] = amount.value;
    }

    const scriptPubKey = readVarstr(bytes, offset);
    offset = scriptPubKey.nextOffset;
    outputs.push({
      jackValue: jackValue.value,
      assets,
      scriptPubKeyHex: bytesToHex(scriptPubKey.value),
    });
  }

  const locktime = readUint32(bytes, offset);

  return {
    version: version.value,
    inputs,
    outputs,
    locktime: locktime.value,
  };
}
