import { bytesToHex } from "@noble/hashes/utils";
import { describe, expect, it } from "vitest";
import fixtureVectors from "../../../../docs/fixtures/wallet_vectors.json";
import type { WalletUtxo } from "../walletService";
import { COIN, decodeTransactionHex } from "./txCodec";
import {
  buildExchangeTransaction,
  buildLottoClaimTransaction,
  buildLottoCommitTransaction,
  decodeOpReturnData,
  scriptPubKeyHexForAddress,
} from "./txBuilder";

const [fixture] = fixtureVectors;

describe("txBuilder", () => {
  it("version=2 교환 트랜잭션을 서명해 생성한다", () => {
    const utxos: WalletUtxo[] = [
      {
        txId: "11".repeat(32),
        vout: 0,
        address: fixture.address,
        jackAmount: 150 * COIN,
        assets: {},
        confirmations: 120,
        coinbase: true,
      },
    ];

    const built = buildExchangeTransaction({
      address: fixture.address,
      privateKey: fixture.privateKeyHex,
      utxos,
      jackAmount: 100 * COIN,
    });
    const decoded = decodeTransactionHex(built.signedTxHex);

    expect(decoded.version).toBe(2);
    expect(decoded.inputs).toHaveLength(1);
    expect(decoded.inputs[0].scriptSigHex.length).toBeGreaterThan(0);
    expect(decoded.outputs[0].assets.POT).toBe(1 * COIN);
    expect(decoded.outputs[1].jackValue).toBe(80 * COIN);
    expect(bytesToHex(decodeOpReturnData(decoded.outputs[2].scriptPubKeyHex) ?? new Uint8Array())).toContain(
      bytesToHex(new TextEncoder().encode("EXCHANGE:1900000000")),
    );
    expect(decoded.outputs[3].jackValue).toBe(50 * COIN);
  });

  it("version=3 로또 참여 트랜잭션을 서명해 생성한다", () => {
    const utxos: WalletUtxo[] = [
      {
        txId: "22".repeat(32),
        vout: 1,
        address: fixture.address,
        jackAmount: 0,
        assets: { POT: 2 * COIN },
        confirmations: 6,
        coinbase: false,
      },
      {
        txId: "33".repeat(32),
        vout: 0,
        address: fixture.address,
        jackAmount: 2_000_000,
        assets: {},
        confirmations: 120,
        coinbase: true,
      },
    ];

    const built = buildLottoCommitTransaction({
      address: fixture.address,
      privateKey: fixture.privateKeyHex,
      utxos,
      chosenNumbers: [10, 1, 15, 3, 4, 14],
    });
    const decoded = decodeTransactionHex(built.signedTxHex);
    const opReturnData = decodeOpReturnData(decoded.outputs[0].scriptPubKeyHex);

    expect(decoded.version).toBe(3);
    expect(decoded.inputs).toHaveLength(2);
    expect(opReturnData ? new TextDecoder().decode(opReturnData.slice(0, 5)) : "").toBe("LOTTO");
    expect(opReturnData ? Array.from(opReturnData.slice(5)) : []).toEqual([10, 1, 15, 3, 4, 14]);
    expect(decoded.outputs[1].assets.POT).toBe(1 * COIN);
    expect(decoded.outputs[2].jackValue).toBe(1_000_000);
    expect(scriptPubKeyHexForAddress(fixture.address)).toBe(decoded.outputs[1].scriptPubKeyHex);
  });

  it("미성숙 coinbase JACK UTXO는 교환 입력으로 사용하지 않는다", () => {
    const utxos: WalletUtxo[] = [
      {
        txId: "44".repeat(32),
        vout: 0,
        address: fixture.address,
        jackAmount: 100 * COIN,
        assets: {},
        confirmations: 50,
        coinbase: true,
      },
    ];

    expect(() =>
      buildExchangeTransaction({
        address: fixture.address,
        privateKey: fixture.privateKeyHex,
        utxos,
        jackAmount: 100 * COIN,
      }),
    ).toThrow("교환에 사용할 JACK UTXO가 부족합니다.");
  });

  it("version=5 로또 클레임 트랜잭션을 서명해 생성한다", () => {
    const walletUtxos: WalletUtxo[] = [
      {
        txId: "55".repeat(32),
        vout: 0,
        address: fixture.address,
        jackAmount: 2_000_000,
        assets: {},
        confirmations: 120,
        coinbase: true,
      },
    ];
    const poolUtxos = [
      {
        txId: "66".repeat(32),
        vout: 1,
        jackAmount: 2_500 * COIN,
        confirmations: 18,
      },
    ];

    const built = buildLottoClaimTransaction({
      address: fixture.address,
      privateKey: fixture.privateKeyHex,
      walletUtxos,
      poolUtxos,
      commitHash: "77".repeat(32),
      rewardJack: 2_000 * COIN,
      rewardPot: 0,
    });
    const decoded = decodeTransactionHex(built.signedTxHex);
    const opReturnData = decodeOpReturnData(decoded.outputs[2].scriptPubKeyHex);

    expect(decoded.version).toBe(5);
    expect(decoded.inputs).toHaveLength(2);
    expect(decoded.outputs[0].jackValue).toBe(2_000 * COIN + 1_000_000);
    expect(decoded.outputs[1].jackValue).toBe(500 * COIN);
    expect(opReturnData ? new TextDecoder().decode(opReturnData.slice(0, 5)) : "").toBe("CLAIM");
    expect(bytesToHex(opReturnData ? opReturnData.slice(5) : new Uint8Array())).toBe("77".repeat(32));
  });
});
