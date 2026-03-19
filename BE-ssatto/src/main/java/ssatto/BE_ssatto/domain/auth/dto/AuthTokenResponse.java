package ssatto.BE_ssatto.domain.auth.dto;

import java.time.LocalDateTime;

/**
 * 지갑 주소 기반 토큰 발급 응답이다.
 *
 * @param token JWT 토큰
 * @param address 발급 대상 지갑 주소
 * @param expiresAt 만료 시각
 */
public record AuthTokenResponse(
    String token,
    String address,
    LocalDateTime expiresAt
) {
}
