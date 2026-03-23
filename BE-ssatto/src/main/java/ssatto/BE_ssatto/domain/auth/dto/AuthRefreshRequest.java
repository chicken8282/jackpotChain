package ssatto.BE_ssatto.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * refresh session 기반 access token 재발급 요청이다.
 *
 * @param sessionHandle 지갑별 refresh 세션 핸들
 */
public record AuthRefreshRequest(
    @NotBlank(message = "세션 핸들은 필수입니다.")
    String sessionHandle
) {
}
