package ssatto.BE_ssatto.global.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ssatto.BE_ssatto.domain.auth.exception.AuthForbiddenException;
import ssatto.BE_ssatto.domain.auth.controller.AuthController;
import ssatto.BE_ssatto.domain.auth.service.AuthService;
import ssatto.BE_ssatto.domain.exchange.controller.ExchangeController;
import ssatto.BE_ssatto.domain.exchange.service.ExchangeService;
import ssatto.BE_ssatto.domain.lotto.controller.LottoController;
import ssatto.BE_ssatto.domain.lotto.service.LottoService;
import ssatto.BE_ssatto.domain.mining.controller.MiningController;
import ssatto.BE_ssatto.domain.mining.service.MiningService;
import ssatto.BE_ssatto.domain.wallet.controller.WalletController;
import ssatto.BE_ssatto.domain.wallet.service.WalletService;
import ssatto.BE_ssatto.global.util.JwtUtil;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 보호 API 보안 구성을 검증한다.
 */
@WebMvcTest({AuthController.class, WalletController.class, LottoController.class, ExchangeController.class, MiningController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, JwtAuthenticationEntryPoint.class, JwtUtil.class})
@TestPropertySource(properties = {
    "jwt.secret=test-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256",
    "jwt.access-expiration=900000",
    "jwt.refresh-expiration=1209600000",
    "auth.cors.allowed-origins=http://localhost:3000"
})
class ProtectedApiSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private WalletService walletService;

    @MockitoBean
    private LottoService lottoService;

    @MockitoBean
    private ExchangeService exchangeService;

    @MockitoBean
    private MiningService miningService;

    @Test
    @DisplayName("보호 API는 토큰 없이 호출하면 401을 반환한다")
    void protectedApiReturnsUnauthorizedWhenTokenMissing() throws Exception {
        mockMvc.perform(get("/api/v1/lotto").param("address", "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    @DisplayName("채굴 블록 보호 API는 토큰 없이 호출하면 401을 반환한다")
    void miningProtectedApiReturnsUnauthorizedWhenTokenMissing() throws Exception {
        mockMvc.perform(get("/api/v1/mining/blocks").param("address", "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    @DisplayName("로또 결과 보호 API는 토큰 없이 호출하면 401을 반환한다")
    void lottoResultProtectedApiReturnsUnauthorizedWhenTokenMissing() throws Exception {
        mockMvc.perform(get("/api/v1/lotto/entries/commit-001/result"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value(401));
    }

    @Test
    @DisplayName("보호 API는 인증 주체와 요청 지갑 주소가 다르면 403을 반환한다")
    void protectedApiReturnsForbiddenWhenWalletSubjectMismatches() throws Exception {
        String authenticatedAddress = "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82";
        String requestedAddress = "XB4gMniEJw5fYk6yQ8rHbrF9QvRjN7sP4K";
        String accessToken = new JwtUtil(
            "test-secret-key-must-be-at-least-256-bits-long-for-hmac-sha256",
            900000
        ).generateAccessToken(authenticatedAddress);

        given(lottoService.getOverview(authenticatedAddress, requestedAddress))
            .willThrow(new AuthForbiddenException());

        mockMvc.perform(get("/api/v1/lotto")
                .param("address", requestedAddress)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value(403));
    }

    @Test
    @DisplayName("허용된 origin의 preflight 요청은 credentials 허용 헤더를 반환한다")
    void preflightReturnsCorsHeadersForAllowedOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/auth/refresh")
                .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
            .andExpect(status().isOk())
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:3000"))
            .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("허용되지 않은 origin의 preflight 요청은 거부된다")
    void preflightRejectsBlockedOrigin() throws Exception {
        mockMvc.perform(options("/api/v1/auth/refresh")
                .header(HttpHeaders.ORIGIN, "https://blocked.example.com")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
            .andExpect(status().isForbidden());
    }
}
