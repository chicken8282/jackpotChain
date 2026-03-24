package ssatto.BE_ssatto.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 지갑 인증 챌린지 발급 요청이다.
 *
 * @param address 지갑 주소
 */
public record AuthChallengeRequest(
    @NotBlank(message = "지갑 주소는 필수입니다.")
    String address
) {
}
