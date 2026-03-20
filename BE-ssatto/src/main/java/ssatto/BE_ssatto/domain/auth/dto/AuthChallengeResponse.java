package ssatto.BE_ssatto.domain.auth.dto;

import java.time.LocalDateTime;

/**
 * 지갑 인증 챌린지 발급 응답이다.
 *
 * @param challengeId 챌린지 식별자
 * @param address 지갑 주소
 * @param nonce 서명용 난수
 * @param message canonical 로그인 메시지
 * @param expiresAt 만료 시각
 */
public record AuthChallengeResponse(
    String challengeId,
    String address,
    String nonce,
    String message,
    LocalDateTime expiresAt
) {
}
