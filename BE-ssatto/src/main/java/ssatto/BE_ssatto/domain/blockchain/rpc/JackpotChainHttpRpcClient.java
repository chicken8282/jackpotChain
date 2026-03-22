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
import ssatto.BE_ssatto.global.logging.LoggingEventType;
import ssatto.BE_ssatto.global.logging.LoggingFields;
import ssatto.BE_ssatto.global.logging.LoggingUtils;

import java.net.URI;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * HTTP 기반 JackpotChain JSON-RPC 클라이언트 구현체다.
 */
@Slf4j
@Component
public class JackpotChainHttpRpcClient implements JackpotChainRpcClient {

    private static final long RPC_WARN_THRESHOLD_MS = 1_000L;

    private final RestClient restClient;
    private final String rpcEndpoint;

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
        String normalizedBaseUrl = normalizeBaseUrl(properties.getUrl());

        this.restClient = builder
            .baseUrl(normalizedBaseUrl)
            .requestFactory(requestFactory)
            .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
            .build();
        this.rpcEndpoint = normalizedBaseUrl;
    }

    /**
     * 테스트 전용 RestClient를 직접 주입해 클라이언트를 생성한다.
     *
     * @param restClient 미리 구성된 RestClient
     */
    private JackpotChainHttpRpcClient(RestClient restClient) {
        this.restClient = restClient;
        this.rpcEndpoint = "test";
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
     * 주소 기준 JACK/POT 잔액을 조회한다.
     *
     * @param address 지갑 주소
     * @return 잔액 정보
     */
    @Override
    public JackpotChainBalances getBalances(String address) {
        JsonNode resultNode = invoke("getbalances", List.of(address));
        return new JackpotChainBalances(
            asRequiredLong(resultNode, "jack_satoshi"),
            asRequiredLong(resultNode, "pot_satoshi")
        );
    }

    /**
     * 주소 기준 UTXO 목록을 조회한다.
     *
     * @param address 지갑 주소
     * @return UTXO 목록
     */
    @Override
    public List<JackpotChainUnspentOutput> listUnspent(String address) {
        JsonNode responseNode = invoke("listunspent", List.of(address));
        JsonNode resultNode = responseNode.path("result");
        if (!resultNode.isArray()) {
            throw invalidResponse();
        }

        List<JackpotChainUnspentOutput> outputs = new ArrayList<>();
        for (JsonNode item : resultNode) {
            outputs.add(new JackpotChainUnspentOutput(
                asRequiredText(item, "txid", false),
                asRequiredInt(item, "vout", false),
                asRequiredText(item, "address", false),
                asCoinDecimalToSatoshi(item, "amount"),
                asAssetMap(item.path("assets")),
                asRequiredInt(item, "confirmations", false),
                item.path("is_coinbase").asBoolean(false)
            ));
        }
        return outputs;
    }

    /**
     * 잭팟 풀 기준 UTXO 목록을 조회한다.
     *
     * @return 잭팟 풀 UTXO 목록
     */
    @Override
    public List<JackpotChainPoolUnspentOutput> listPoolUnspent() {
        JsonNode responseNode = invoke("listpoolunspent", List.of());
        JsonNode resultNode = responseNode.path("result");
        if (!resultNode.isArray()) {
            throw invalidResponse();
        }

        List<JackpotChainPoolUnspentOutput> outputs = new ArrayList<>();
        for (JsonNode item : resultNode) {
            outputs.add(new JackpotChainPoolUnspentOutput(
                asRequiredText(item, "txid", false),
                asRequiredInt(item, "vout", false),
                asRequiredLong(item, "jack_satoshi", false),
                asRequiredInt(item, "confirmations", false)
            ));
        }
        return outputs;
    }

    /**
     * 블록 높이 기준 해시를 조회한다.
     *
     * @param height 블록 높이
     * @return 블록 해시
     */
    @Override
    public String getBlockHash(long height) {
        JsonNode resultNode = invoke("getblockhash", List.of(height));
        return asRequiredText(resultNode, "result");
    }

    /**
     * 블록 해시 기준 상세 정보를 조회한다.
     *
     * @param blockHash 블록 해시
     * @return 블록 상세 정보
     */
    @Override
    public JackpotChainBlock getBlock(String blockHash) {
        JsonNode resultNode = invoke("getblock", List.of(blockHash, 1));
        return new JackpotChainBlock(
            asRequiredText(resultNode, "hash"),
            asRequiredInt(resultNode, "confirmations"),
            asRequiredLong(resultNode, "height"),
            asRequiredInt(resultNode, "version"),
            asRequiredText(resultNode, "versionHex"),
            asRequiredText(resultNode, "merkleroot"),
            asRequiredLong(resultNode, "time"),
            asRequiredLong(resultNode, "nonce"),
            asRequiredLong(resultNode, "difficulty"),
            asRequiredText(resultNode, "difficultyDisplay"),
            asRequiredInt(resultNode, "nTx"),
            asRequiredText(resultNode, "previousblockhash"),
            asRequiredLong(resultNode, "rewardJack"),
            asRequiredLong(resultNode, "feeRewardJack"),
            asOptionalText(resultNode, "minerAddress"),
            asRequiredBoolean(resultNode, "isMainChain")
        );
    }

    /**
     * 블록 해시 기준으로 인덱싱용 상세 블록 정보를 조회한다.
     *
     * @param blockHash 블록 해시
     * @return 인덱싱용 상세 블록 DTO
     */
    @Override
    public JackpotChainIndexedBlock getIndexedBlock(String blockHash) {
        JsonNode resultNode = invoke("getblock", List.of(blockHash, 2));
        JsonNode payload = resultNode.path("result");
        JsonNode transactionsNode = payload.path("tx");
        if (!transactionsNode.isArray()) {
            throw invalidResponse();
        }

        List<JackpotChainIndexedTransaction> transactions = new ArrayList<>();
        for (JsonNode transactionNode : transactionsNode) {
            JsonNode inputsNode = transactionNode.path("inputs");
            JsonNode outputsNode = transactionNode.path("outputs");
            if (!inputsNode.isArray() || !outputsNode.isArray()) {
                throw invalidResponse();
            }

            List<JackpotChainBlockTransactionInput> inputs = new ArrayList<>();
            for (JsonNode inputNode : inputsNode) {
                inputs.add(new JackpotChainBlockTransactionInput(
                    asRequiredText(inputNode, "txid", false),
                    asRequiredLong(inputNode, "vout", false)
                ));
            }

            List<JackpotChainBlockTransactionOutput> outputs = new ArrayList<>();
            for (JsonNode outputNode : outputsNode) {
                outputs.add(new JackpotChainBlockTransactionOutput(
                    asRequiredInt(outputNode, "n", false),
                    asRequiredLong(outputNode, "jack_value", false),
                    asAssetMap(outputNode.path("assets")),
                    asRequiredText(outputNode, "script_pubkey_hex", false),
                    asOptionalText(outputNode, "address", false)
                ));
            }

            transactions.add(new JackpotChainIndexedTransaction(
                asRequiredText(transactionNode, "txid", false),
                asRequiredInt(transactionNode, "version", false),
                List.copyOf(inputs),
                List.copyOf(outputs)
            ));
        }

        return new JackpotChainIndexedBlock(
            asRequiredText(payload, "hash", false),
            asRequiredInt(payload, "confirmations", false),
            asRequiredLong(payload, "height", false),
            asRequiredText(payload, "versionHex", false),
            asRequiredLong(payload, "time", false),
            asRequiredLong(payload, "nonce", false),
            asRequiredText(payload, "difficultyDisplay", false),
            asRequiredText(payload, "previousblockhash", false),
            asRequiredLong(payload, "rewardJack", false),
            asRequiredLong(payload, "feeRewardJack", false),
            asOptionalText(payload, "minerAddress", false),
            asRequiredBoolean(payload, "isMainChain", false),
            List.copyOf(transactions)
        );
    }

    /**
     * 로또 개요 정보를 조회한다.
     *
     * @return 로또 개요 정보
     */
    @Override
    public JackpotChainLottoInfo getLottoInfo() {
        JsonNode resultNode = invoke("getlottoinfo", List.of());
        return new JackpotChainLottoInfo(
            asRequiredLong(resultNode, "pool_balance_satoshi"),
            asCoinToSatoshi(resultNode, "next_jackpot"),
            asRequiredLong(resultNode, "total_entries"),
            asRequiredLong(resultNode, "payout_count")
        );
    }

    /**
     * 잭팟 풀 상태를 조회한다.
     *
     * @return 잭팟 풀 상태
     */
    @Override
    public JackpotChainJackpotPool getJackpotPool() {
        JsonNode resultNode = invoke("getjackpotpool", List.of());
        return new JackpotChainJackpotPool(
            asRequiredLong(resultNode, "balance_satoshi"),
            asRequiredLong(resultNode, "next_jackpot_satoshi"),
            asLongOrZero(resultNode, "total_entries"),
            asCoinToSatoshi(resultNode, "total_collected"),
            asLongOrZero(resultNode, "snapshot_count")
        );
    }

    /**
     * 노드가 연결한 피어 정보를 조회한다.
     *
     * @return 피어 목록
     */
    @Override
    public List<JackpotChainPeerInfo> getPeerInfo() {
        JsonNode responseNode = invoke("getpeerinfo", List.of());
        JsonNode resultNode = responseNode.path("result");
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
     * 로또 결과를 조회한다.
     *
     * @param commitHash 커밋 트랜잭션 해시
     * @return 로또 결과
     */
    @Override
    public JackpotChainLottoResult checkLottoResult(String commitHash) {
        JsonNode resultNode = invoke("lottocheckresult", List.of(commitHash));
        JsonNode payload = resultNode.path("result");

        return new JackpotChainLottoResult(
            payload.path("success").asBoolean(false),
            asOptionalIntegerList(payload, "chosen_numbers"),
            asOptionalIntegerList(payload, "result_digits"),
            asOptionalInteger(payload, "matches"),
            asOptionalCoinToSatoshi(payload, "payout_jack"),
            asOptionalCoinToSatoshi(payload, "payout_pot"),
            payload.path("paid").asBoolean(false),
            asOptionalLong(payload, "claimable_height"),
            payload.path("claimable").asBoolean(false),
            payload.path("status").asText("")
        );
    }

    /**
     * 교환 규칙을 조회한다.
     *
     * @return 교환 정보
     */
    @Override
    public JackpotChainExchangeInfo getExchangeInfo() {
        JsonNode resultNode = invoke("getexchangeinfo", List.of());
        return new JackpotChainExchangeInfo(
            asRequiredInt(resultNode, "jack_per_pot"),
            asRequiredInt(resultNode, "min_jack")
        );
    }

    /**
     * 신규 지갑 onboarding 용 1 POT 지급을 수행한다.
     *
     * @param address 지급 대상 지갑 주소
     * @return 지급 결과
     */
    @Override
    public JackpotChainOnboardingReward grantOnboardingPotReward(String address) {
        JsonNode resultNode = invoke("grantonboardingreward", List.of(address));
        return new JackpotChainOnboardingReward(
            asRequiredText(resultNode, "tx_id"),
            asCoinToSatoshi(resultNode, "pot_amount")
        );
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
        long startedAt = System.currentTimeMillis();
        try {
            JsonNode responseNode = restClient.post()
                .uri(URI.create("/"))
                .contentType(MediaType.APPLICATION_JSON)
                .body(new JsonRpcRequest("2.0", method, method, params))
                .retrieve()
                .body(JsonNode.class);

            if (responseNode == null || responseNode.isNull()) {
                logRpcFailure(method, startedAt, "response body is empty", null);
                throw invalidResponse();
            }

            if (responseNode.hasNonNull("error")) {
                JsonNode errorNode = responseNode.path("error");
                String message = errorNode.path("message").asText("unknown rpc error");
                logRpcFailure(method, startedAt, message, null);
                throw mapRpcError(message);
            }

            logSlowRpcIfNeeded(method, startedAt);
            return responseNode;
        } catch (BusinessException exception) {
            throw exception;
        } catch (RestClientException exception) {
            logRpcFailure(method, startedAt, exception.getMessage(), exception);
            throw new BusinessException(ErrorCode.BLOCKCHAIN_RPC_FAILED, exception);
        } catch (IllegalArgumentException exception) {
            logRpcFailure(method, startedAt, exception.getMessage(), exception);
            throw new BusinessException(ErrorCode.BLOCKCHAIN_RPC_FAILED, exception);
        }
    }

    private void logSlowRpcIfNeeded(String method, long startedAt) {
        long latencyMs = System.currentTimeMillis() - startedAt;
        if (latencyMs < RPC_WARN_THRESHOLD_MS) {
            return;
        }

        LoggingUtils.withFields(LoggingUtils.fields(
            LoggingFields.EVENT_TYPE, LoggingEventType.JACKPOTCHAIN_RPC_SLOW.name(),
            LoggingFields.RPC_METHOD, method,
            LoggingFields.RPC_ENDPOINT, rpcEndpoint,
            LoggingFields.LATENCY_MS, latencyMs
        ), () -> log.warn("jackpotchain rpc latency exceeded threshold"));
    }

    private void logRpcFailure(String method, long startedAt, String message, Exception exception) {
        long latencyMs = System.currentTimeMillis() - startedAt;
        LoggingUtils.withFields(LoggingUtils.fields(
            LoggingFields.EVENT_TYPE, LoggingEventType.JACKPOTCHAIN_RPC_FAILURE.name(),
            LoggingFields.RPC_METHOD, method,
            LoggingFields.RPC_ENDPOINT, rpcEndpoint,
            LoggingFields.LATENCY_MS, latencyMs
        ), () -> {
            if (exception == null) {
                log.error("jackpotchain rpc failure: {}", message);
                return;
            }
            log.error("jackpotchain rpc failure: {}", message, exception);
        });
    }

    private BusinessException invalidResponse() {
        return new BusinessException(ErrorCode.BLOCKCHAIN_RPC_FAILED);
    }

    private BusinessException mapRpcError(String message) {
        String normalizedMessage = message == null ? "" : message.toLowerCase();
        if (normalizedMessage.contains("block not found")) {
            return new BusinessException(ErrorCode.BLOCKCHAIN_BLOCK_NOT_FOUND);
        }
        if (normalizedMessage.contains("transaction not found")) {
            return new BusinessException(ErrorCode.BLOCKCHAIN_TX_NOT_FOUND);
        }
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

    private String asRequiredText(JsonNode node, String fieldName, boolean nestedResult) {
        JsonNode fieldNode = nestedResult ? node.path("result").path(fieldName) : node.path(fieldName);
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

    private long asRequiredLong(JsonNode node, String fieldName, boolean nestedResult) {
        JsonNode fieldNode = nestedResult ? node.path("result").path(fieldName) : node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.canConvertToLong()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return fieldNode.asLong();
    }

    private int asRequiredInt(JsonNode responseNode, String fieldName) {
        JsonNode resultNode = responseNode.path("result");
        JsonNode fieldNode = resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.canConvertToInt()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return fieldNode.asInt();
    }

    private int asRequiredInt(JsonNode node, String fieldName, boolean nestedResult) {
        JsonNode fieldNode = nestedResult ? node.path("result").path(fieldName) : node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.canConvertToInt()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return fieldNode.asInt();
    }

    private boolean asRequiredBoolean(JsonNode responseNode, String fieldName) {
        JsonNode resultNode = responseNode.path("result");
        JsonNode fieldNode = resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isBoolean()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return fieldNode.asBoolean();
    }

    private boolean asRequiredBoolean(JsonNode node, String fieldName, boolean nestedResult) {
        JsonNode fieldNode = nestedResult ? node.path("result").path(fieldName) : node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isBoolean()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return fieldNode.asBoolean();
    }

    private String asOptionalText(JsonNode responseNode, String fieldName) {
        JsonNode resultNode = responseNode.path("result");
        JsonNode fieldNode = resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull()) {
            return null;
        }
        if (!fieldNode.isTextual()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return fieldNode.asText();
    }

    private String asOptionalText(JsonNode node, String fieldName, boolean nestedResult) {
        JsonNode fieldNode = nestedResult ? node.path("result").path(fieldName) : node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull()) {
            return null;
        }
        if (!fieldNode.isTextual()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return fieldNode.asText();
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

    private long asCoinToSatoshi(JsonNode responseNode, String fieldName) {
        JsonNode resultNode = responseNode.path("result");
        JsonNode fieldNode = resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isNumber()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return BigDecimal.valueOf(fieldNode.asDouble())
            .multiply(BigDecimal.valueOf(100_000_000L))
            .setScale(0, RoundingMode.HALF_UP)
            .longValue();
    }

    private long asCoinDecimalToSatoshi(JsonNode node, String fieldName) {
        JsonNode fieldNode = node.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isNumber()) {
            log.error("JACKPOTCHAIN_RPC_FAILURE field={} message={}", fieldName, "response field is invalid");
            throw invalidResponse();
        }
        return BigDecimal.valueOf(fieldNode.asDouble())
            .multiply(BigDecimal.valueOf(100_000_000L))
            .setScale(0, RoundingMode.HALF_UP)
            .longValue();
    }

    private Long asOptionalCoinToSatoshi(JsonNode resultNode, String fieldName) {
        JsonNode fieldNode = resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isNumber()) {
            return null;
        }
        return BigDecimal.valueOf(fieldNode.asDouble())
            .multiply(BigDecimal.valueOf(100_000_000L))
            .setScale(0, RoundingMode.HALF_UP)
            .longValue();
    }

    private long asLongOrZero(JsonNode responseNode, String fieldName) {
        JsonNode resultNode = responseNode.path("result");
        JsonNode fieldNode = resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isNumber()) {
            return 0L;
        }
        return fieldNode.asLong();
    }

    private Long asOptionalLong(JsonNode resultNode, String fieldName) {
        JsonNode fieldNode = resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isNumber()) {
            return null;
        }
        return fieldNode.asLong();
    }

    private Integer asOptionalInteger(JsonNode resultNode, String fieldName) {
        JsonNode fieldNode = resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isNumber()) {
            return null;
        }
        return fieldNode.asInt();
    }

    private List<Integer> asOptionalIntegerList(JsonNode resultNode, String fieldName) {
        JsonNode fieldNode = resultNode.path(fieldName);
        if (fieldNode.isMissingNode() || fieldNode.isNull() || !fieldNode.isArray()) {
            return List.of();
        }
        List<Integer> values = new ArrayList<>();
        for (JsonNode elementNode : fieldNode) {
            values.add(elementNode.asInt());
        }
        return values;
    }

    private Map<String, Long> asAssetMap(JsonNode assetsNode) {
        if (assetsNode.isMissingNode() || assetsNode.isNull()) {
            return Map.of();
        }
        if (!assetsNode.isObject()) {
            throw invalidResponse();
        }

        Map<String, Long> assets = new LinkedHashMap<>();
        Iterator<Map.Entry<String, JsonNode>> fields = assetsNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            if (!field.getValue().canConvertToLong()) {
                throw invalidResponse();
            }
            assets.put(field.getKey(), field.getValue().asLong());
        }
        return Map.copyOf(assets);
    }

    private record JsonRpcRequest(
        String jsonrpc,
        String id,
        String method,
        List<Object> params
    ) {
    }
}
