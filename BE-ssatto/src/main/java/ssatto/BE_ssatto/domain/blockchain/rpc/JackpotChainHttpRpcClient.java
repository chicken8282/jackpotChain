package ssatto.BE_ssatto.domain.blockchain.rpc;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import ssatto.BE_ssatto.global.config.JackpotChainRpcProperties;
import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

import java.net.URI;
import java.util.List;

/**
 * HTTP 기반 JackpotChain JSON-RPC 클라이언트 구현체다.
 */
@Slf4j
@Component
public class JackpotChainHttpRpcClient implements JackpotChainRpcClient {

    private final RestClient restClient;

    /**
     * JSON-RPC 호출용 HTTP 클라이언트를 생성한다.
     *
     * @param builder 스프링이 제공하는 RestClient 빌더
     * @param properties RPC 엔드포인트 설정
     */
    @Autowired
    public JackpotChainHttpRpcClient(RestClient.Builder builder, JackpotChainRpcProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(properties.getConnectTimeoutMs());
        requestFactory.setReadTimeout(properties.getReadTimeoutMs());

        this.restClient = builder
            .baseUrl(normalizeBaseUrl(properties.getUrl()))
            .requestFactory(requestFactory)
            .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
            .build();
    }

    /**
     * 테스트 전용 RestClient를 직접 주입해 클라이언트를 생성한다.
     *
     * @param restClient 미리 구성된 RestClient
     */
    private JackpotChainHttpRpcClient(RestClient restClient) {
        this.restClient = restClient;
    }

    static JackpotChainHttpRpcClient createForTest(RestClient restClient) {
        return new JackpotChainHttpRpcClient(restClient);
    }

    /**
     * 현재 블록 높이를 조회한다.
     *
     * @return 현재 블록 높이
     */
    @Override
    public long getBlockCount() {
        JsonNode resultNode = invoke("getblockcount", List.of());
        return asRequiredLong(resultNode, "result");
    }

    /**
     * 블록체인 요약 정보를 조회한다.
     *
     * @return 블록체인 요약 정보
     */
    @Override
    public JackpotChainBlockchainInfo getBlockchainInfo() {
        JsonNode resultNode = invoke("getblockchaininfo", List.of());
        return new JackpotChainBlockchainInfo(
            asRequiredText(resultNode, "chain"),
            asRequiredLong(resultNode, "blocks"),
            asRequiredText(resultNode, "bestblockhash"),
            asRequiredLong(resultNode, "difficulty")
        );
    }

    /**
     * 노드가 연결한 피어 정보를 조회한다.
     *
     * @return 피어 목록
     */
    @Override
    public List<JackpotChainPeerInfo> getPeerInfo() {
        JsonNode resultNode = invoke("getpeerinfo", List.of());
        if (!resultNode.isArray()) {
            throw invalidResponse();
        }

        return resultNode.findValuesAsText("addr").stream()
            .map(address -> {
                JsonNode peerNode = findPeerNode(resultNode, address);
                return new JackpotChainPeerInfo(
                    address,
                    peerNode.path("version").asInt(0),
                    peerNode.path("subver").asText(""),
                    peerNode.path("inbound").asBoolean(false)
                );
            })
            .toList();
    }

    /**
     * mempool 트랜잭션 수를 조회한다.
     *
     * @return mempool 트랜잭션 수
     */
    @Override
    public int getMempoolTransactionCount() {
        JsonNode resultNode = invoke("getmempoolinfo", List.of());
        return resultNode.path("size").asInt(0);
    }

    /**
     * 서명된 원시 트랜잭션을 제출한다.
     *
     * @param signedTxHex 서명된 트랜잭션 hex
     * @return 제출된 txId
     */
    @Override
    public String sendRawTransaction(String signedTxHex) {
        if (!StringUtils.hasText(signedTxHex)) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }

        JsonNode resultNode = invoke("sendrawtransaction", List.of(signedTxHex));
        return asRequiredText(resultNode, "result");
    }

    private JsonNode invoke(String method, List<Object> params) {
        try {
            JsonNode responseNode = restClient.post()
                .uri(URI.create("/"))
                .contentType(MediaType.APPLICATION_JSON)
                .body(new JsonRpcRequest("2.0", method, method, params))
                .retrieve()
                .body(JsonNode.class);

            if (responseNode == null || responseNode.isNull()) {
                log.error("JACKPOTCHAIN_RPC_FAILURE method={} message={}", method, "response body is empty");
                throw invalidResponse();
            }

            if (responseNode.hasNonNull("error")) {
                JsonNode errorNode = responseNode.path("error");
                String message = errorNode.path("message").asText("unknown rpc error");
                log.error("JACKPOTCHAIN_RPC_FAILURE method={} message={}", method, message);
                throw new BusinessException(ErrorCode.BLOCKCHAIN_RPC_FAILED);
            }

            return responseNode;
        } catch (BusinessException exception) {
            throw exception;
        } catch (RestClientException exception) {
            log.error("JACKPOTCHAIN_RPC_FAILURE method={} message={}", method, exception.getMessage(), exception);
            throw new BusinessException(ErrorCode.BLOCKCHAIN_RPC_FAILED, exception);
        } catch (IllegalArgumentException exception) {
            log.error("JACKPOTCHAIN_RPC_FAILURE method={} message={}", method, exception.getMessage(), exception);
            throw new BusinessException(ErrorCode.BLOCKCHAIN_RPC_FAILED, exception);
        }
    }

    private BusinessException invalidResponse() {
        return new BusinessException(ErrorCode.BLOCKCHAIN_RPC_FAILED);
    }

    private String normalizeBaseUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return "http://localhost:8332";
        }

        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private String asRequiredText(JsonNode responseNode, String fieldName) {
        JsonNode resultNode = responseNode.path("result");
        JsonNode fieldNode = "result".equals(fieldName) ? resultNode : resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isTextual()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return fieldNode.asText();
    }

    private long asRequiredLong(JsonNode responseNode, String fieldName) {
        JsonNode resultNode = responseNode.path("result");
        JsonNode fieldNode = "result".equals(fieldName) ? resultNode : resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.canConvertToLong()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return fieldNode.asLong();
    }

    private JsonNode findPeerNode(JsonNode resultNode, String address) {
        for (JsonNode peerNode : resultNode) {
            if (address.equals(peerNode.path("addr").asText())) {
                return peerNode;
            }
        }

        log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", "addr", "peer entry is invalid");
        throw invalidResponse();
    }

    private record JsonRpcRequest(
        String jsonrpc,
        String id,
        String method,
        List<Object> params
    ) {
    }
}
