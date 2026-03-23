package ssatto.BE_ssatto.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 지갑 인증 챌린지 검증 요청이다.
 *
 * @param challengeId 챌린지 식별자
 * @param address 지갑 주소
 * @param publicKey 압축 공개키 hex
 * @param signature DER 서명 hex
 */
public record AuthVerifyRequest(
    @NotBlank(message = "챌린지 ID는 필수입니다.")
    String challengeId,
    @NotBlank(message = "지갑 주소는 필수입니다.")
    String address,
    @NotBlank(message = "공개키는 필수입니다.")
    String publicKey,
    @NotBlank(message = "서명은 필수입니다.")
    String signature
) {
}
