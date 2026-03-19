package ssatto.BE_ssatto.domain.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ssatto.BE_ssatto.domain.auth.dto.AuthTokenRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthTokenResponse;
import ssatto.BE_ssatto.domain.auth.service.AuthService;
import ssatto.BE_ssatto.global.response.ApiResponse;

/**
 * 지갑 주소 기반 JWT 발급 API를 제공한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    /**
     * 지갑 주소 기반 JWT를 발급한다.
     *
     * @param request 토큰 발급 요청
     * @return 토큰 발급 응답
     */
    @PostMapping("/token")
    public ApiResponse<AuthTokenResponse> issueToken(@Valid @RequestBody AuthTokenRequest request) {
        return ApiResponse.success(authService.issueToken(request));
    }
}
