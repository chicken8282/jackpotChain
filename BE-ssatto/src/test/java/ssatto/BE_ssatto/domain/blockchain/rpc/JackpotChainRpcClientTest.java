package ssatto.BE_ssatto.domain.blockchain.rpc;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * JackpotChain JSON-RPC 클라이언트의 요청/응답 경계를 검증한다.
 */
class JackpotChainRpcClientTest {

    /**
     * `getblockcount` 응답을 정상적으로 숫자로 변환해야 한다.
     */
    @Test
    void getBlockCountReturnsParsedResult() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainRpcClient client = createClient(builder);

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess("""
                {"jsonrpc":"2.0","id":"getblockcount","result":42}
                """, MediaType.APPLICATION_JSON));

        assertThat(client.getBlockCount()).isEqualTo(42L);
    }

    /**
     * 서명된 트랜잭션 제출은 `sendrawtransaction` JSON-RPC로 전달해야 한다.
     */
    @Test
    void sendRawTransactionReturnsTransactionId() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainRpcClient client = createClient(builder);

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().json("""
                {"jsonrpc":"2.0","id":"sendrawtransaction","method":"sendrawtransaction","params":["deadbeef"]}
                """, true))
            .andRespond(withSuccess("""
                {"jsonrpc":"2.0","id":"sendrawtransaction","result":"tx-123"}
                """, MediaType.APPLICATION_JSON));

        assertThat(client.sendRawTransaction("deadbeef")).isEqualTo("tx-123");
    }

    /**
     * 블록 높이 기반 해시 조회는 `getblockhash` JSON-RPC를 호출해야 한다.
     */
    @Test
    void getBlockHashReturnsResolvedHash() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainRpcClient client = createClient(builder);

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().json("""
                {"jsonrpc":"2.0","id":"getblockhash","method":"getblockhash","params":[7]}
                """, true))
            .andRespond(withSuccess("""
                {"jsonrpc":"2.0","id":"getblockhash","result":"block-hash-7"}
                """, MediaType.APPLICATION_JSON));

        assertThat(client.getBlockHash(7L)).isEqualTo("block-hash-7");
    }

    /**
     * 블록 상세 조회는 확장된 블록 메타데이터를 모두 파싱해야 한다.
     */
    @Test
    void getBlockReturnsParsedBlockDetails() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainRpcClient client = createClient(builder);

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().json("""
                {"jsonrpc":"2.0","id":"getblock","method":"getblock","params":["block-hash-7",1]}
                """, true))
            .andRespond(withSuccess("""
                {
                  "jsonrpc":"2.0",
                  "id":"getblock",
                  "result":{
                    "hash":"block-hash-7",
                    "confirmations":12,
                    "height":7,
                    "version":1,
                    "versionHex":"0x00000001",
                    "merkleroot":"merkle-1",
                    "time":1710811400,
                    "nonce":12345,
                    "difficulty":504365056,
                    "difficultyDisplay":"0x1E100000",
                    "nTx":3,
                    "previousblockhash":"prev-hash-6",
                    "rewardJack":5000000000,
                    "feeRewardJack":300000000,
                    "minerAddress":"JACK_TEST_ADDRESS",
                    "isMainChain":true
                  }
                }
                """, MediaType.APPLICATION_JSON));

        JackpotChainBlock block = client.getBlock("block-hash-7");

        assertThat(block.hash()).isEqualTo("block-hash-7");
        assertThat(block.confirmations()).isEqualTo(12);
        assertThat(block.height()).isEqualTo(7L);
        assertThat(block.version()).isEqualTo(1);
        assertThat(block.versionHex()).isEqualTo("0x00000001");
        assertThat(block.merkleRoot()).isEqualTo("merkle-1");
        assertThat(block.timestamp()).isEqualTo(1710811400L);
        assertThat(block.nonce()).isEqualTo(12345L);
        assertThat(block.difficulty()).isEqualTo(504365056L);
        assertThat(block.difficultyDisplay()).isEqualTo("0x1E100000");
        assertThat(block.transactionCount()).isEqualTo(3);
        assertThat(block.previousBlockHash()).isEqualTo("prev-hash-6");
        assertThat(block.rewardJack()).isEqualTo(5_000_000_000L);
        assertThat(block.feeRewardJack()).isEqualTo(300_000_000L);
        assertThat(block.minerAddress()).isEqualTo("JACK_TEST_ADDRESS");
        assertThat(block.mainChain()).isTrue();
    }

    /**
     * 노드가 JSON-RPC 에러를 반환하면 비즈니스 예외로 변환해야 한다.
     */
    @Test
    void getBlockCountThrowsBusinessExceptionWhenNodeReturnsRpcError() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainRpcClient client = createClient(builder);

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess("""
                {"jsonrpc":"2.0","id":"getblockcount","error":{"code":-32603,"message":"boom"}}
                """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(client::getBlockCount)
            .isInstanceOf(BusinessException.class)
            .extracting(exception -> ((BusinessException) exception).getErrorCode())
            .isEqualTo(ErrorCode.BLOCKCHAIN_RPC_FAILED);
    }

    /**
     * 블록이 존재하지 않으면 블록 조회 전용 예외로 변환해야 한다.
     */
    @Test
    void getBlockThrowsBlockNotFoundWhenNodeReturnsMissingBlockError() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainRpcClient client = createClient(builder);

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withSuccess("""
                {"jsonrpc":"2.0","id":"getblock","error":{"code":-32000,"message":"Block not found"}}
                """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.getBlock("missing"))
            .isInstanceOf(BusinessException.class)
            .extracting(exception -> ((BusinessException) exception).getErrorCode())
            .isEqualTo(ErrorCode.BLOCKCHAIN_BLOCK_NOT_FOUND);
    }

    /**
     * HTTP 계층 실패도 동일한 비즈니스 예외로 감싸야 한다.
     */
    @Test
    void getBlockchainInfoThrowsBusinessExceptionWhenHttpCallFails() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        JackpotChainRpcClient client = createClient(builder);

        server.expect(requestTo("http://localhost:8332/"))
            .andExpect(method(HttpMethod.POST))
            .andRespond(withServerError());

        assertThatThrownBy(client::getBlockchainInfo)
            .isInstanceOf(BusinessException.class)
            .extracting(exception -> ((BusinessException) exception).getErrorCode())
            .isEqualTo(ErrorCode.BLOCKCHAIN_RPC_FAILED);
    }

    private JackpotChainRpcClient createClient(RestClient.Builder builder) {
        RestClient restClient = builder
            .baseUrl("http://localhost:8332")
            .build();
        return JackpotChainHttpRpcClient.createForTest(restClient);
    }
}
