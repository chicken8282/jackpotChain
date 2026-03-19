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
