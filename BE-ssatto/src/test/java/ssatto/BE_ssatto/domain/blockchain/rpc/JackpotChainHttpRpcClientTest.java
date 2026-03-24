package ssatto.BE_ssatto.domain.blockchain.rpc;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * JackpotChain HTTP RPC 클라이언트의 추가 메서드 파싱을 검증한다.
 */
class JackpotChainHttpRpcClientTest {

    @Test
    @DisplayName("주소 기준 JACK/POT 잔액을 조회한다")
    void getBalancesReturnsParsedBalances() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8332");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainHttpRpcClient client = JackpotChainHttpRpcClient.createForTest(builder.build());

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(content().json("""
                {
                  "jsonrpc": "2.0",
                  "id": "getbalances",
                  "method": "getbalances",
                  "params": ["JackpotAddress01"]
                }
                """, false))
            .andRespond(withSuccess("""
                {
                  "jsonrpc": "2.0",
                  "id": "getbalances",
                  "result": {
                    "jack": 125.0,
                    "pot": 3.0,
                    "jack_satoshi": 12500000000,
                    "pot_satoshi": 300000000
                  }
                }
                """, MediaType.APPLICATION_JSON));

        JackpotChainBalances balances = client.getBalances("JackpotAddress01");

        assertThat(balances.jackSatoshi()).isEqualTo(12_500_000_000L);
        assertThat(balances.potSatoshi()).isEqualTo(300_000_000L);
    }

    @Test
    @DisplayName("로또 결과를 조회한다")
    void checkLottoResultReturnsParsedResult() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8332");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainHttpRpcClient client = JackpotChainHttpRpcClient.createForTest(builder.build());

        server.expect(requestTo("http://localhost:8332/"))
            .andRespond(withSuccess("""
                {
                  "jsonrpc": "2.0",
                  "id": "lottocheckresult",
                  "result": {
                    "success": true,
                    "chosen_numbers": [10, 1, 15, 3, 4, 14],
                    "result_digits": [10, 5, 15, 3, 9, 14],
                    "matches": 4,
                    "payout_jack": 20000.0,
                    "payout_pot": 0.0,
                    "paid": true,
                    "claimable_height": 128,
                    "claimable": false,
                    "status": "claimed"
                  }
                }
                """, MediaType.APPLICATION_JSON));

        JackpotChainLottoResult result = client.checkLottoResult("abcd1234");

        assertThat(result.chosenNumbers()).containsExactly(10, 1, 15, 3, 4, 14);
        assertThat(result.resultNumbers()).containsExactly(10, 5, 15, 3, 9, 14);
        assertThat(result.matches()).isEqualTo(4);
        assertThat(result.payoutJack()).isEqualTo(20_000L * 100_000_000L);
        assertThat(result.claimableHeight()).isEqualTo(128L);
        assertThat(result.claimable()).isFalse();
        assertThat(result.status()).isEqualTo("claimed");
    }

    @Test
    @DisplayName("인덱싱용 블록 상세를 조회한다")
    void getIndexedBlockReturnsParsedBlock() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8332");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainHttpRpcClient client = JackpotChainHttpRpcClient.createForTest(builder.build());

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(content().json("""
                {
                  "jsonrpc": "2.0",
                  "id": "getblock",
                  "method": "getblock",
                  "params": ["block-001", 2]
                }
                """, false))
            .andRespond(withSuccess("""
                {
                  "jsonrpc": "2.0",
                  "id": "getblock",
                  "result": {
                    "hash": "block-001",
                    "confirmations": 3,
                    "height": 42,
                    "versionHex": "0x20000000",
                    "time": 1710000000,
                    "nonce": 11,
                    "difficultyDisplay": "7.42T",
                    "previousblockhash": "block-000",
                    "rewardJack": 10000000000,
                    "feeRewardJack": 10000000,
                    "minerAddress": "JackpotAddress01",
                    "isMainChain": true,
                    "tx": [
                      {
                        "txid": "tx-001",
                        "version": 3,
                        "inputs": [
                          {
                            "txid": "input-001",
                            "vout": 0
                          }
                        ],
                        "outputs": [
                          {
                            "n": 0,
                            "jack_value": 0,
                            "assets": {
                              "POT": 100000000
                            },
                            "script_pubkey_hex": "6a0b4c4f54544f0a010f03040e",
                            "address": "JackpotAddress01"
                          }
                        ]
                      }
                    ]
                  }
                }
                """, MediaType.APPLICATION_JSON));

        JackpotChainIndexedBlock block = client.getIndexedBlock("block-001");

        assertThat(block.hash()).isEqualTo("block-001");
        assertThat(block.height()).isEqualTo(42L);
        assertThat(block.minerAddress()).isEqualTo("JackpotAddress01");
        assertThat(block.transactions()).hasSize(1);
        assertThat(block.transactions().getFirst().outputs()).singleElement().satisfies(output -> {
            assertThat(output.index()).isEqualTo(0);
            assertThat(output.assets()).containsEntry("POT", 100_000_000L);
            assertThat(output.scriptPubKeyHex()).isEqualTo("6a0b4c4f54544f0a010f03040e");
        });
    }

    @Test
    @DisplayName("교환 정보를 조회한다")
    void getExchangeInfoReturnsParsedInfo() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8332");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainHttpRpcClient client = JackpotChainHttpRpcClient.createForTest(builder.build());

        server.expect(requestTo("http://localhost:8332/"))
            .andRespond(withSuccess("""
                {
                  "jsonrpc": "2.0",
                  "id": "getexchangeinfo",
                  "result": {
                    "rate": "100 JACK = 1 POT",
                    "jack_per_pot": 100,
                    "direction": "JACK -> POT only (one-way)",
                    "min_jack": 100
                  }
                }
                """, MediaType.APPLICATION_JSON));

        JackpotChainExchangeInfo exchangeInfo = client.getExchangeInfo();

        assertThat(exchangeInfo.jackPerPot()).isEqualTo(100);
        assertThat(exchangeInfo.minJack()).isEqualTo(100);
    }

    @Test
    @DisplayName("onboarding POT 지급 결과를 조회한다")
    void grantOnboardingPotRewardReturnsParsedInfo() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8332");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainHttpRpcClient client = JackpotChainHttpRpcClient.createForTest(builder.build());

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(content().json("""
                {
                  "jsonrpc": "2.0",
                  "id": "grantonboardingreward",
                  "method": "grantonboardingreward",
                  "params": ["JackpotAddress01"]
                }
                """, false))
            .andRespond(withSuccess("""
                {
                  "jsonrpc": "2.0",
                  "id": "grantonboardingreward",
                  "result": {
                    "success": true,
                    "tx_id": "reward-tx-001",
                    "recipient_address": "JackpotAddress01",
                    "pot_amount": 1.0
                  }
                }
                """, MediaType.APPLICATION_JSON));

        JackpotChainOnboardingReward reward = client.grantOnboardingPotReward("JackpotAddress01");

        assertThat(reward.txId()).isEqualTo("reward-tx-001");
        assertThat(reward.potSatoshi()).isEqualTo(100_000_000L);
    }

    @Test
    @DisplayName("주소 기준 UTXO 목록을 조회한다")
    void listUnspentReturnsParsedOutputs() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8332");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainHttpRpcClient client = JackpotChainHttpRpcClient.createForTest(builder.build());

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(content().json("""
                {
                  "jsonrpc": "2.0",
                  "id": "listunspent",
                  "method": "listunspent",
                  "params": ["JackpotAddress01"]
                }
                """, false))
            .andRespond(withSuccess("""
                {
                  "jsonrpc": "2.0",
                  "id": "listunspent",
                  "result": [
                    {
                      "txid": "tx-001",
                      "vout": 1,
                      "address": "JackpotAddress01",
                      "amount": 1.25,
                      "assets": {
                        "POT": 200000000
                      },
                      "confirmations": 12,
                      "is_coinbase": false
                    }
                  ]
                }
                """, MediaType.APPLICATION_JSON));

        assertThat(client.listUnspent("JackpotAddress01"))
            .singleElement()
            .satisfies(utxo -> {
                assertThat(utxo.txId()).isEqualTo("tx-001");
                assertThat(utxo.vout()).isEqualTo(1);
                assertThat(utxo.jackSatoshi()).isEqualTo(125_000_000L);
                assertThat(utxo.assets()).containsEntry("POT", 200_000_000L);
                assertThat(utxo.confirmations()).isEqualTo(12);
                assertThat(utxo.coinbase()).isFalse();
            });
    }

    @Test
    @DisplayName("잭팟 풀 UTXO 목록을 조회한다")
    void listPoolUnspentReturnsParsedOutputs() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8332");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainHttpRpcClient client = JackpotChainHttpRpcClient.createForTest(builder.build());

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(content().json("""
                {
                  "jsonrpc": "2.0",
                  "id": "listpoolunspent",
                  "method": "listpoolunspent",
                  "params": []
                }
                """, false))
            .andRespond(withSuccess("""
                {
                  "jsonrpc": "2.0",
                  "id": "listpoolunspent",
                  "result": [
                    {
                      "txid": "pool-utxo-001",
                      "vout": 2,
                      "amount": 1600.0,
                      "jack_satoshi": 160000000000,
                      "confirmations": 19
                    }
                  ]
                }
                """, MediaType.APPLICATION_JSON));

        assertThat(client.listPoolUnspent())
            .singleElement()
            .satisfies(utxo -> {
                assertThat(utxo.txId()).isEqualTo("pool-utxo-001");
                assertThat(utxo.vout()).isEqualTo(2);
                assertThat(utxo.jackSatoshi()).isEqualTo(160_000_000_000L);
                assertThat(utxo.confirmations()).isEqualTo(19);
            });
    }

    @Test
    @DisplayName("피어 목록을 result 배열 기준으로 파싱한다")
    void getPeerInfoReturnsParsedPeers() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:8332");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainHttpRpcClient client = JackpotChainHttpRpcClient.createForTest(builder.build());

        server.expect(requestTo("http://localhost:8332/"))
            .andRespond(withSuccess("""
                {
                  "jsonrpc": "2.0",
                  "id": "getpeerinfo",
                  "result": [
                    {
                      "addr": "10.0.0.12:8333",
                      "version": 70015,
                      "subver": "/JackpotChain:0.1.0/",
                      "inbound": false
                    }
                  ]
                }
                """, MediaType.APPLICATION_JSON));

        assertThat(client.getPeerInfo())
            .extracting(JackpotChainPeerInfo::address)
            .containsExactly("10.0.0.12:8333");
    }
}
