package ssatto.BE_ssatto.domain.auth.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ssatto.BE_ssatto.domain.auth.dto.AuthTokenResponse;
import ssatto.BE_ssatto.domain.auth.service.AuthService;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 토큰 발급 API 엔드포인트를 검증한다.
 */
@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @Test
    @DisplayName("토큰 발급 API가 성공 응답을 반환한다")
    void issueTokenReturnsSuccess() throws Exception {
        given(authService.issueToken(any()))
            .willReturn(new AuthTokenResponse("token-001", "JackpotAddress01", LocalDateTime.of(2026, 3, 21, 9, 0)));

        mockMvc.perform(post("/api/v1/auth/token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "address": "JackpotAddress01"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.token").value("token-001"));
    }
}
