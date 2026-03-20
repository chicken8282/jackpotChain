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
                    "payout_block": 128,
                    "status": "paid"
                  }
                }
                """, MediaType.APPLICATION_JSON));

        JackpotChainLottoResult result = client.checkLottoResult("abcd1234");

        assertThat(result.chosenNumbers()).containsExactly(10, 1, 15, 3, 4, 14);
        assertThat(result.resultNumbers()).containsExactly(10, 5, 15, 3, 9, 14);
        assertThat(result.matches()).isEqualTo(4);
        assertThat(result.payoutJack()).isEqualTo(20_000L * 100_000_000L);
        assertThat(result.status()).isEqualTo("paid");
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
