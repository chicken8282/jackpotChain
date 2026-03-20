package ssatto.BE_ssatto.global.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * credentialed auth 요청용 CORS 정책을 환경별 설정으로 관리한다.
 */
@Getter
@ConfigurationProperties(prefix = "auth.cors")
public class AuthCorsProperties {

    private List<String> allowedOrigins = new ArrayList<>();
    private List<String> allowedMethods = new ArrayList<>(List.of("GET", "POST", "OPTIONS"));
    private List<String> allowedHeaders = new ArrayList<>(List.of("Authorization", "Content-Type", "Accept"));
    private long maxAgeSeconds = Duration.ofHours(1).toSeconds();

    public void setAllowedOrigins(List<String> allowedOrigins) {
        this.allowedOrigins = sanitize(allowedOrigins);
    }

    public void setAllowedMethods(List<String> allowedMethods) {
        this.allowedMethods = sanitize(allowedMethods);
    }

    public void setAllowedHeaders(List<String> allowedHeaders) {
        this.allowedHeaders = sanitize(allowedHeaders);
    }

    public void setMaxAgeSeconds(long maxAgeSeconds) {
        this.maxAgeSeconds = maxAgeSeconds;
    }

    /**
     * CORS 보안 설정이 wildcard와 credentials를 섞지 않도록 검증한다.
     */
    @PostConstruct
    public void validate() {
        if (maxAgeSeconds < 0) {
            throw new IllegalStateException("auth.cors.max-age-seconds must be zero or greater");
        }
        if (allowedOrigins.contains("*")) {
            throw new IllegalStateException("auth.cors.allowed-origins must not contain wildcard when credentials are enabled");
        }
        if (allowedMethods.isEmpty()) {
            throw new IllegalStateException("auth.cors.allowed-methods must not be empty");
        }
        if (allowedHeaders.isEmpty()) {
            throw new IllegalStateException("auth.cors.allowed-headers must not be empty");
        }
    }

    private List<String> sanitize(List<String> values) {
        if (values == null) {
            return new ArrayList<>();
        }
        return values.stream()
            .filter(value -> value != null && !value.isBlank())
            .map(String::trim)
            .distinct()
            .toList();
    }
}
