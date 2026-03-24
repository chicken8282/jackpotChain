package ssatto.BE_ssatto.domain.auth.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ssatto.BE_ssatto.domain.auth.dto.AuthChallengeRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthChallengeResponse;
import ssatto.BE_ssatto.domain.auth.dto.AuthLogoutRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthRefreshRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthRefreshResponse;
import ssatto.BE_ssatto.domain.auth.dto.AuthVerifyRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthVerifyResponse;
import ssatto.BE_ssatto.domain.auth.service.AuthService;
import ssatto.BE_ssatto.global.config.AuthRefreshCookieProperties;
import ssatto.BE_ssatto.global.response.ApiResponse;

import java.time.Duration;

/**
 * 지갑 주소 기반 JWT 발급 API를 제공한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/auth")
public class AuthController {

    private static final int SUCCESS_CODE = HttpStatus.OK.value();
    private static final String CREATE_CHALLENGE_SUCCESS_MESSAGE = "인증 챌린지가 발급되었습니다.";
    private static final String VERIFY_CHALLENGE_SUCCESS_MESSAGE = "인증이 완료되었습니다.";
    private static final String REFRESH_SUCCESS_MESSAGE = "세션이 복구되었습니다.";
    private static final String LOGOUT_SUCCESS_MESSAGE = "로그아웃이 완료되었습니다.";
    private static final String REFRESH_COOKIE_PREFIX = "ssatto_refresh_";

    private final AuthService authService;
    private final AuthRefreshCookieProperties authRefreshCookieProperties;

    /**
     * 지갑 서명용 챌린지를 발급한다.
     *
     * @param request 챌린지 발급 요청
     * @return 챌린지 응답
     */
    @PostMapping("/challenge")
    public ApiResponse<AuthChallengeResponse> createChallenge(@Valid @RequestBody AuthChallengeRequest request) {
        return ApiResponse.success(
            SUCCESS_CODE,
            CREATE_CHALLENGE_SUCCESS_MESSAGE,
            authService.createChallenge(request)
        );
    }

    /**
     * 지갑 서명을 검증하고 access token을 발급한다.
     *
     * @param request 챌린지 검증 요청
     * @param response HTTP 응답
     * @return access token 응답
     */
    @PostMapping("/verify")
    public ApiResponse<AuthVerifyResponse> verifyChallenge(
        @Valid @RequestBody AuthVerifyRequest request,
        HttpServletResponse response
    ) {
        AuthVerifyResponse verifyResponse = authService.verifyChallenge(request);
        response.addHeader(
            HttpHeaders.SET_COOKIE,
            createRefreshCookie(verifyResponse.refreshSessionHandle(), verifyResponse.refreshToken(), false)
        );
        return ApiResponse.success(
            SUCCESS_CODE,
            VERIFY_CHALLENGE_SUCCESS_MESSAGE,
            verifyResponse
        );
    }

    /**
     * refresh cookie와 세션 핸들로 access token을 재발급한다.
     *
     * @param request refresh 요청
     * @param servletRequest HTTP 요청
     * @param response HTTP 응답
     * @return 재발급 응답
     */
    @PostMapping("/refresh")
    public ApiResponse<AuthRefreshResponse> refresh(
        @Valid @RequestBody AuthRefreshRequest request,
        HttpServletRequest servletRequest,
        HttpServletResponse response
    ) {
        String refreshToken = resolveRefreshCookie(servletRequest, request.sessionHandle());
        AuthRefreshResponse refreshResponse = authService.refresh(request, refreshToken);
        response.addHeader(
            HttpHeaders.SET_COOKIE,
            createRefreshCookie(refreshResponse.refreshSessionHandle(), refreshResponse.refreshToken(), false)
        );
        return ApiResponse.success(SUCCESS_CODE, REFRESH_SUCCESS_MESSAGE, refreshResponse);
    }

    /**
     * 특정 refresh 세션을 로그아웃 처리한다.
     *
     * @param request 로그아웃 요청
     * @param servletRequest HTTP 요청
     * @param response HTTP 응답
     * @return 로그아웃 성공 응답
     */
    @PostMapping("/logout")
    public ApiResponse<Void> logout(
        @Valid @RequestBody AuthLogoutRequest request,
        HttpServletRequest servletRequest,
        HttpServletResponse response
    ) {
        authService.logout(request.sessionHandle(), resolveRefreshCookie(servletRequest, request.sessionHandle()));
        response.addHeader(
            HttpHeaders.SET_COOKIE,
            createRefreshCookie(request.sessionHandle(), "", true)
        );
        return ApiResponse.success(SUCCESS_CODE, LOGOUT_SUCCESS_MESSAGE);
    }

    private String createRefreshCookie(String sessionHandle, String refreshToken, boolean expired) {
        return ResponseCookie.from(REFRESH_COOKIE_PREFIX + sessionHandle, expired ? "" : refreshToken)
            .httpOnly(true)
            .secure(authRefreshCookieProperties.isSecure())
            .path(authRefreshCookieProperties.getPath())
            .sameSite(authRefreshCookieProperties.getSameSite())
            .maxAge(expired ? Duration.ZERO : Duration.ofSeconds(authRefreshCookieProperties.getMaxAgeSeconds()))
            .build()
            .toString();
    }

    private String resolveRefreshCookie(HttpServletRequest request, String sessionHandle) {
        if (request.getCookies() == null) {
            return null;
        }

        String cookieName = REFRESH_COOKIE_PREFIX + sessionHandle;
        for (Cookie cookie : request.getCookies()) {
            if (cookieName.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
