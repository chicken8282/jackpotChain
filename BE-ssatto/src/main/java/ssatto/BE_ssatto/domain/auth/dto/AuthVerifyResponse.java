package ssatto.BE_ssatto.domain.auth.dto;

import java.time.LocalDateTime;

/**
 * 지갑 인증 검증 완료 응답이다.
 *
 * @param accessToken access token
 * @param walletAddress 인증된 지갑 주소
 * @param accessTokenExpiresAt access token 만료 시각
 * @param refreshSessionHandle refresh 세션 핸들
 * @param refreshToken 발급된 refresh token
 */
public record AuthVerifyResponse(
    String accessToken,
    String walletAddress,
    LocalDateTime accessTokenExpiresAt,
    String refreshSessionHandle,
    String refreshToken
) {
}
