package ssatto.BE_ssatto.global.logging;

/**
 * 구조화 로그와 MDC에 사용하는 공통 필드명 상수다.
 */
public final class LoggingFields {

    public static final String TRACE_ID = "traceId";
    public static final String REQUEST_ID = "requestId";
    public static final String METHOD = "method";
    public static final String URI = "uri";
    public static final String STATUS = "status";
    public static final String EVENT_TYPE = "eventType";
    public static final String ERROR_CODE = "errorCode";
    public static final String EXCEPTION = "exception";
    public static final String WALLET_ADDRESS = "walletAddress";
    public static final String TX_ID = "txId";
    public static final String COMMIT_HASH = "commitHash";
    public static final String CHALLENGE_ID = "challengeId";
    public static final String SESSION_HANDLE = "sessionHandle";
    public static final String RPC_METHOD = "rpcMethod";
    public static final String RPC_ENDPOINT = "rpcEndpoint";
    public static final String LATENCY_MS = "latencyMs";

    private LoggingFields() {
    }
}
