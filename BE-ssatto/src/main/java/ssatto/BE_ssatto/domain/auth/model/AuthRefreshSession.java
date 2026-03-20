package ssatto.BE_ssatto.domain.auth.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 지갑별 refresh token 세션을 저장하는 모델이다.
 */
@Getter
@Entity
@Table(name = "auth_refresh_session")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthRefreshSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_handle", nullable = false, unique = true, length = 80)
    private String sessionHandle;

    @Column(name = "wallet_address", nullable = false, length = 64)
    private String walletAddress;

    @Column(name = "refresh_token_hash", nullable = false, length = 128)
    private String refreshTokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    private AuthRefreshSession(
        String sessionHandle,
        String walletAddress,
        String refreshTokenHash,
        LocalDateTime expiresAt,
        LocalDateTime createdAt,
        LocalDateTime revokedAt
    ) {
        this.sessionHandle = sessionHandle;
        this.walletAddress = walletAddress;
        this.refreshTokenHash = refreshTokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
        this.revokedAt = revokedAt;
    }

    /**
     * 새로운 refresh 세션을 생성한다.
     *
     * @param sessionHandle 세션 핸들
     * @param walletAddress 지갑 주소
     * @param refreshTokenHash refresh token 해시
     * @param expiresAt 만료 시각
     * @param createdAt 생성 시각
     * @param revokedAt 폐기 시각
     * @return refresh 세션
     */
    public static AuthRefreshSession create(
        String sessionHandle,
        String walletAddress,
        String refreshTokenHash,
        LocalDateTime expiresAt,
        LocalDateTime createdAt,
        LocalDateTime revokedAt
    ) {
        return new AuthRefreshSession(
            sessionHandle,
            walletAddress,
            refreshTokenHash,
            expiresAt,
            createdAt,
            revokedAt
        );
    }

    /**
     * refresh token 회전 결과를 현재 세션에 반영한다.
     *
     * @param nextRefreshTokenHash 새 refresh token 해시
     * @param nextExpiresAt 새 만료 시각
     */
    public void rotate(String nextRefreshTokenHash, LocalDateTime nextExpiresAt) {
        this.refreshTokenHash = nextRefreshTokenHash;
        this.expiresAt = nextExpiresAt;
        this.revokedAt = null;
    }

    /**
     * 세션을 폐기한다.
     *
     * @param revokedAt 폐기 시각
     */
    public void revoke(LocalDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }

    /**
     * 세션 사용 가능 여부를 반환한다.
     *
     * @param currentTime 기준 시각
     * @return 사용 가능 여부
     */
    public boolean isActive(LocalDateTime currentTime) {
        return revokedAt == null && expiresAt.isAfter(currentTime);
    }
}
