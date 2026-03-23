package ssatto.BE_ssatto.domain.auth.model;

import java.time.LocalDateTime;

/**
 * 지갑 인증용 nonce 챌린지 모델이다.
 *
 * @param challengeId 챌린지 식별자
 * @param address 지갑 주소
 * @param nonce 서명용 난수
 * @param message canonical 로그인 메시지
 * @param expiresAt 만료 시각
 * @param used 사용 여부
 */
public record AuthChallenge(
    String challengeId,
    String address,
    String nonce,
    String message,
    LocalDateTime expiresAt,
    boolean used
) {

    /**
     * 챌린지를 사용 완료 상태로 변경한다.
     *
     * @return 사용 처리된 챌린지
     */
    public AuthChallenge markUsed() {
        return new AuthChallenge(challengeId, address, nonce, message, expiresAt, true);
    }

    /**
     * 현재 시각 기준 만료 여부를 반환한다.
     *
     * @param now 현재 시각
     * @return 만료 여부
     */
    public boolean isExpired(LocalDateTime now) {
        return expiresAt == null || expiresAt.isBefore(now);
    }
}
