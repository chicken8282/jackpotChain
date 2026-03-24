package ssatto.BE_ssatto.domain.auth.dto;

import java.time.LocalDateTime;

/**
 * refresh 세션으로 access token을 재발급한 응답이다.
 *
 * @param accessToken 재발급된 access token
 * @param walletAddress 인증된 지갑 주소
 * @param accessTokenExpiresAt access token 만료 시각
 * @param refreshSessionHandle refresh 세션 핸들
 * @param refreshToken 회전된 refresh token
 */
public record AuthRefreshResponse(
    String accessToken,
    String walletAddress,
    LocalDateTime accessTokenExpiresAt,
    String refreshSessionHandle,
    String refreshToken
) {
}
