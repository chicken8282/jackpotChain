package ssatto.BE_ssatto.global.config;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

import java.util.Set;

/**
 * refresh cookie 발급 정책을 환경별 설정으로 관리한다.
 */
@Getter
@ConfigurationProperties(prefix = "auth.refresh-cookie")
public class AuthRefreshCookieProperties {

    private static final Set<String> ALLOWED_SAME_SITE_VALUES = Set.of("Lax", "Strict", "None");

    private String path = "/api/v1/auth";
    private long maxAgeSeconds = 14L * 24 * 60 * 60;
    private boolean secure = false;
    private String sameSite = "Lax";

    public void setPath(String path) {
        this.path = path;
    }

    public void setMaxAgeSeconds(long maxAgeSeconds) {
        this.maxAgeSeconds = maxAgeSeconds;
    }

    public void setSecure(boolean secure) {
        this.secure = secure;
    }

    public void setSameSite(String sameSite) {
        if (!StringUtils.hasText(sameSite)) {
            this.sameSite = "Lax";
            return;
        }
        String normalized = sameSite.trim();
        this.sameSite = normalized.substring(0, 1).toUpperCase() + normalized.substring(1).toLowerCase();
    }

    /**
     * 브라우저 호환성과 운영 안전성을 위한 cookie 정책을 검증한다.
     */
    @PostConstruct
    public void validate() {
        if (!StringUtils.hasText(path)) {
            throw new IllegalStateException("auth.refresh-cookie.path must not be blank");
        }
        if (maxAgeSeconds <= 0) {
            throw new IllegalStateException("auth.refresh-cookie.max-age-seconds must be greater than zero");
        }
        if (!ALLOWED_SAME_SITE_VALUES.contains(sameSite)) {
            throw new IllegalStateException("auth.refresh-cookie.same-site must be one of Lax, Strict, None");
        }
        if ("None".equals(sameSite) && !secure) {
            throw new IllegalStateException("auth.refresh-cookie.secure must be true when same-site is None");
        }
    }
}
