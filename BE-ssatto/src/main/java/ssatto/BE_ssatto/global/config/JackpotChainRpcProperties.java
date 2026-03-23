package ssatto.BE_ssatto.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * JackpotChain JSON-RPC 엔드포인트와 타임아웃 설정을 보관한다.
 */
@ConfigurationProperties(prefix = "jackpotchain.rpc")
public class JackpotChainRpcProperties {

    private String url = "http://localhost:8332";
    private int connectTimeoutMs = 2_000;
    private int readTimeoutMs = 5_000;

    /**
     * JackpotChain RPC 기본 URL을 반환한다.
     *
     * @return RPC URL
     */
    public String getUrl() {
        return url;
    }

    /**
     * JackpotChain RPC 기본 URL을 설정한다.
     *
     * @param url RPC URL
     */
    public void setUrl(String url) {
        this.url = url;
    }

    /**
     * RPC 연결 타임아웃 밀리초를 반환한다.
     *
     * @return 연결 타임아웃
     */
    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    /**
     * RPC 연결 타임아웃 밀리초를 설정한다.
     *
     * @param connectTimeoutMs 연결 타임아웃
     */
    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    /**
     * RPC 응답 대기 타임아웃 밀리초를 반환한다.
     *
     * @return 응답 타임아웃
     */
    public int getReadTimeoutMs() {
        return readTimeoutMs;
    }

    /**
     * RPC 응답 대기 타임아웃 밀리초를 설정한다.
     *
     * @param readTimeoutMs 응답 타임아웃
     */
    public void setReadTimeoutMs(int readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }
}
