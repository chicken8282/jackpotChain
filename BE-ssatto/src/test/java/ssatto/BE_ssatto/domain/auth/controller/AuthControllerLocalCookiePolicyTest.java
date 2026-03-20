package ssatto.BE_ssatto.domain.auth.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ssatto.BE_ssatto.domain.auth.dto.AuthVerifyResponse;
import ssatto.BE_ssatto.domain.auth.service.AuthService;
import ssatto.BE_ssatto.global.config.JwtAuthenticationEntryPoint;
import ssatto.BE_ssatto.global.config.JwtAuthenticationFilter;
import ssatto.BE_ssatto.global.config.SecurityConfig;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 로컬 프로파일 refresh cookie 정책을 검증한다.
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
    "auth.refresh-cookie.path=/api/v1/auth",
    "auth.refresh-cookie.max-age-seconds=1209600",
    "auth.refresh-cookie.secure=false",
    "auth.refresh-cookie.same-site=Lax"
})
class AuthControllerLocalCookiePolicyTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Test
    @DisplayName("로컬 프로파일은 SameSite=Lax와 Secure=false cookie를 반환한다")
    void verifyChallengeReturnsLocalCookiePolicy() throws Exception {
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
            .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                containsString("Path=/api/v1/auth"),
                containsString("HttpOnly"),
                containsString("SameSite=Lax"),
                not(containsString("Secure"))
            )));
    }
}
