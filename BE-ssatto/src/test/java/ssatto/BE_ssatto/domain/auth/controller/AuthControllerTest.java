package ssatto.BE_ssatto.domain.auth.controller;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ssatto.BE_ssatto.global.config.JwtAuthenticationEntryPoint;
import ssatto.BE_ssatto.global.config.JwtAuthenticationFilter;
import ssatto.BE_ssatto.global.config.SecurityConfig;
import ssatto.BE_ssatto.domain.auth.dto.AuthChallengeResponse;
import ssatto.BE_ssatto.domain.auth.dto.AuthRefreshResponse;
import ssatto.BE_ssatto.domain.auth.dto.AuthVerifyResponse;
import ssatto.BE_ssatto.domain.auth.service.AuthService;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 챌린지, refresh, logout 인증 API 계약을 검증한다.
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
    "auth.refresh-cookie.path=/api/v1/auth",
    "auth.refresh-cookie.max-age-seconds=1209600",
    "auth.refresh-cookie.secure=true",
    "auth.refresh-cookie.same-site=None"
})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Test
    @DisplayName("챌린지 발급 API가 성공 응답을 반환한다")
    void createChallengeReturnsSuccess() throws Exception {
        given(authService.createChallenge(any()))
            .willReturn(new AuthChallengeResponse(
                "challenge-001",
                "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
                "nonce-001",
                "SSATTO Login\naddress=XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
                LocalDateTime.of(2026, 3, 20, 10, 5)
            ));

        mockMvc.perform(post("/api/v1/auth/challenge")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "address": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("인증 챌린지가 발급되었습니다."))
            .andExpect(jsonPath("$.data.challengeId").value("challenge-001"));
    }

    @Test
    @DisplayName("챌린지 검증 API가 성공 응답과 refresh cookie를 반환한다")
    void verifyChallengeReturnsSuccess() throws Exception {
        given(authService.verifyChallenge(any()))
            .willReturn(new AuthVerifyResponse(
                "access-token-001",
                "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
                LocalDateTime.of(2026, 3, 20, 10, 15),
                "session-handle-001",
                "refresh-token-001"
            ));

        mockMvc.perform(post("/api/v1/auth/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "challengeId": "challenge-001",
                      "address": "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
                      "publicKey": "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa",
                      "signature": "304402204787ca19d3d8c713eb3ae9b6fb6c7d943fb2e0b61f8eb9c3db78911b87a2c20102205e925f9aae2caa3025714c047faa8c8a3bbf7986a37b2814a49f36d1b695e38f"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("인증이 완료되었습니다."))
            .andExpect(jsonPath("$.data.accessToken").value("access-token-001"))
            .andExpect(jsonPath("$.data.refreshSessionHandle").value("session-handle-001"))
            .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                containsString("ssatto_refresh_session-handle-001=refresh-token-001"),
                containsString("Path=/api/v1/auth"),
                containsString("HttpOnly"),
                containsString("Secure"),
                containsString("SameSite=None"),
                containsString("Max-Age=1209600")
            )));
    }

    @Test
    @DisplayName("refresh API가 성공 응답과 회전된 refresh cookie를 반환한다")
    void refreshReturnsSuccess() throws Exception {
        given(authService.refresh(any(), any()))
            .willReturn(new AuthRefreshResponse(
                "access-token-002",
                "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
                LocalDateTime.of(2026, 3, 20, 10, 30),
                "session-handle-001",
                "refresh-token-002"
            ));

        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .cookie(new Cookie("ssatto_refresh_session-handle-001", "refresh-token-001"))
                .content("""
                    {
                      "sessionHandle": "session-handle-001"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("세션이 복구되었습니다."))
            .andExpect(jsonPath("$.data.accessToken").value("access-token-002"))
            .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                containsString("ssatto_refresh_session-handle-001=refresh-token-002"),
                containsString("Path=/api/v1/auth"),
                containsString("HttpOnly"),
                containsString("Secure"),
                containsString("SameSite=None"),
                containsString("Max-Age=1209600")
            )));
    }

    @Test
    @DisplayName("logout API가 성공 응답과 refresh cookie 삭제를 반환한다")
    void logoutReturnsSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .cookie(new Cookie("ssatto_refresh_session-handle-001", "refresh-token-001"))
                .content("""
                    {
                      "sessionHandle": "session-handle-001"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("로그아웃이 완료되었습니다."))
            .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                containsString("ssatto_refresh_session-handle-001="),
                containsString("Path=/api/v1/auth"),
                containsString("HttpOnly"),
                containsString("Secure"),
                containsString("SameSite=None"),
                containsString("Max-Age=0")
            )));
    }
}
