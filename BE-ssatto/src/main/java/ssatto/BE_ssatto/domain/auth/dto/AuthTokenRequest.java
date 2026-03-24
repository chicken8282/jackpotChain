package ssatto.BE_ssatto.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 지갑 주소 기반 토큰 발급 요청이다.
 *
 * @param address 지갑 주소
 */
public record AuthTokenRequest(
    @NotBlank(message = "지갑 주소는 필수입니다.")
    String address
) {
}
