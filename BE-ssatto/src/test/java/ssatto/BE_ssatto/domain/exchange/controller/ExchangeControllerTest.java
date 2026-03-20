package ssatto.BE_ssatto.domain.exchange.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ssatto.BE_ssatto.global.config.JwtAuthenticationEntryPoint;
import ssatto.BE_ssatto.global.config.JwtAuthenticationFilter;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeInfoResponse;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeResponse;
import ssatto.BE_ssatto.domain.exchange.service.ExchangeService;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 교환 API 엔드포인트를 검증한다.
 */
@WebMvcTest(ExchangeController.class)
@AutoConfigureMockMvc(addFilters = false)
class ExchangeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ExchangeService exchangeService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Test
    @DisplayName("교환 정보 조회 API는 인증 지갑 주소를 서비스에 전달한다")
    void getExchangeInfoReturnsSuccess() throws Exception {
        given(exchangeService.getExchangeInfo("JackpotAddress01", "JackpotAddress01"))
            .willReturn(new ExchangeInfoResponse(12_500_000_000L, 300_000_000L));

        mockMvc.perform(get("/api/v1/exchange/info")
                .param("address", "JackpotAddress01")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("교환 정보 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.potBalance").value(300_000_000L));

        verify(exchangeService).getExchangeInfo("JackpotAddress01", "JackpotAddress01");
    }

    @Test
    @DisplayName("교환 제출 API는 인증 지갑 주소를 서비스에 전달한다")
    void exchangeReturnsSuccess() throws Exception {
        given(exchangeService.exchangeJackToPot(eq("JackpotAddress01"), any()))
            .willReturn(new ExchangeResponse("tx-001", 10_000_000_000L, 100_000_000L, 100));

        mockMvc.perform(post("/api/v1/exchange/jack-to-pot")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fromAddress": "JackpotAddress01",
                      "jackAmount": 10000000000,
                      "signedTxHex": "0200000001abcd"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("교환이 완료되었습니다."))
            .andExpect(jsonPath("$.data.exchangeRate").value(100));

        verify(exchangeService).exchangeJackToPot(eq("JackpotAddress01"), any());
    }
}
