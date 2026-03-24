import { beforeEach, describe, expect, it, vi } from "vitest";
import fixtureVectors from "../../../docs/fixtures/wallet_vectors.json";
import * as exchangeService from "./exchangeService";
import * as lottoService from "./lottoService";
import * as walletService from "./walletService";
import { COIN } from "./tx/txCodec";
import { submitExchangeWrite, submitLottoClaimWrite, submitLottoCommitWrite } from "./writeFlowService";

vi.mock("./walletService");
vi.mock("./exchangeService");
vi.mock("./lottoService");

const [fixture] = fixtureVectors;

describe("writeFlowService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("교환 write flow는 UTXO 조회 후 서명된 TX를 API로 전송한다", async () => {
    vi.mocked(walletService.getWalletUtxos).mockResolvedValue({
      utxos: [
        {
          txId: "11".repeat(32),
          vout: 0,
          address: fixture.address,
          jackAmount: 150 * COIN,
          assets: {},
          confirmations: 120,
          coinbase: true,
        },
      ],
    });
    vi.mocked(exchangeService.exchangeJackToPot).mockResolvedValue({
      txId: "exchange-tx-001",
      burnedJack: 100 * COIN,
      receivedPot: 1 * COIN,
      exchangeRate: 100,
    });

    const response = await submitExchangeWrite({
      address: fixture.address,
      privateKey: fixture.privateKeyHex,
      accessToken: "token-001",
    });

    expect(walletService.getWalletUtxos).toHaveBeenCalledWith(fixture.address, "token-001");
    expect(exchangeService.exchangeJackToPot).toHaveBeenCalledWith(
      expect.objectContaining({
        fromAddress: fixture.address,
        jackAmount: 100 * COIN,
        signedTxHex: expect.stringMatching(/^[0-9a-f]+$/),
      }),
      "token-001",
    );
    expect(response.txId).toBe("exchange-tx-001");
  });

  it("로또 참여 write flow는 선택 번호를 포함한 서명 TX를 전송한다", async () => {
    vi.mocked(walletService.getWalletUtxos).mockResolvedValue({
      utxos: [
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
      ],
    });
    vi.mocked(lottoService.commitLotto).mockResolvedValue(null);

    await submitLottoCommitWrite({
      address: fixture.address,
      privateKey: fixture.privateKeyHex,
      accessToken: "token-002",
      chosenNumbers: [10, 1, 15, 3, 4, 14],
    });

    expect(lottoService.commitLotto).toHaveBeenCalledWith(
      expect.objectContaining({
        fromAddress: fixture.address,
        chosenNumbers: [10, 1, 15, 3, 4, 14],
        signedTxHex: expect.stringMatching(/^[0-9a-f]+$/),
      }),
      "token-002",
    );
  });

  it("현재 체인에서 claim write flow는 명시적으로 차단한다", async () => {
    vi.mocked(walletService.getWalletUtxos).mockResolvedValue({
      utxos: [
        {
          txId: "44".repeat(32),
          vout: 0,
          address: fixture.address,
          jackAmount: 2_000_000,
          assets: {},
          confirmations: 120,
          coinbase: true,
        },
      ],
    });
    vi.mocked(lottoService.getLottoClaimContext).mockResolvedValue({
      commitHash: "77".repeat(32),
      matchCount: 4,
      rewardJack: 2_000 * COIN,
      rewardPot: 0,
      claimable: true,
      poolUtxos: [
        {
          txId: "55".repeat(32),
          vout: 1,
          jackAmount: 2_500 * COIN,
          confirmations: 18,
        },
      ],
    });
    vi.mocked(lottoService.claimLottoReward).mockResolvedValue({
      claimTxId: "claim-tx-001",
      matchCount: 4,
      rewardJack: 2_000 * COIN,
      claimedAt: "2026-03-22T14:00:00",
    });

    const response = await submitLottoClaimWrite({
      address: fixture.address,
      privateKey: fixture.privateKeyHex,
      accessToken: "token-003",
      commitHash: "77".repeat(32),
    });

    expect(walletService.getWalletUtxos).toHaveBeenCalledWith(fixture.address, "token-003");
    expect(lottoService.getLottoClaimContext).toHaveBeenCalledWith("77".repeat(32), "token-003");
    expect(lottoService.claimLottoReward).toHaveBeenCalledWith(
      expect.objectContaining({
        fromAddress: fixture.address,
        commitHash: "77".repeat(32),
        signedTxHex: expect.stringMatching(/^[0-9a-f]+$/),
      }),
      "token-003",
    );
    expect(response.claimTxId).toBe("claim-tx-001");
  });
});
