package ssatto.BE_ssatto.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * refresh 세션 로그아웃 요청이다.
 *
 * @param sessionHandle 로그아웃할 세션 핸들
 */
public record AuthLogoutRequest(
    @NotBlank(message = "세션 핸들은 필수입니다.")
    String sessionHandle
) {
}
