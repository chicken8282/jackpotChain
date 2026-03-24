package ssatto.BE_ssatto.domain.lotto.controller;

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
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimContextResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoOverviewResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimPoolUtxoResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoPrizeTierResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoResultResponse;
import ssatto.BE_ssatto.domain.lotto.service.LottoService;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 로또 API 엔드포인트를 검증한다.
 */
@WebMvcTest(LottoController.class)
@AutoConfigureMockMvc(addFilters = false)
class LottoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private LottoService lottoService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Test
    @DisplayName("로또 개요 조회 API는 인증 지갑 주소를 서비스에 전달한다")
    void getOverviewReturnsSuccess() throws Exception {
        given(lottoService.getOverview("JackpotAddress01", "JackpotAddress01"))
            .willReturn(new LottoOverviewResponse(
                12_500_000_000L,
                300_000_000L,
                450_000_000_000L,
                1_240L,
                3L,
                List.of(new LottoPrizeTierResponse(1, 6, 10_000_000_000_000L))
            ));

        mockMvc.perform(get("/v1/lotto")
                .param("address", "JackpotAddress01")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("로또 정보 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.poolBalanceJack").value(450_000_000_000L));

        verify(lottoService).getOverview("JackpotAddress01", "JackpotAddress01");
    }

    @Test
    @DisplayName("로또 참여 API는 인증 지갑 주소를 서비스에 전달한다")
    void commitReturnsSuccess() throws Exception {
        mockMvc.perform(post("/v1/lotto/commit")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fromAddress": "JackpotAddress01",
                      "chosenNumbers": [10, 1, 15, 3, 4, 14],
                      "signedTxHex": "0300000001abcd"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("로또 참여가 완료되었습니다."))
            .andExpect(jsonPath("$.data").isEmpty());

        verify(lottoService).commit(eq("JackpotAddress01"), any());
    }

    @Test
    @DisplayName("로또 결과 조회 API가 성공 응답을 반환한다")
    void getResultReturnsSuccess() throws Exception {
        given(lottoService.getResult("JackpotAddress01", "commit-001"))
            .willReturn(new LottoResultResponse(
                "commit-001",
                List.of(10, 1, 15, 3, 4, 14),
                List.of(10, 5, 15, 3, 9, 14),
                4,
                false,
                "WINNING",
                2_000_000_000_000L
            ));

        mockMvc.perform(get("/v1/lotto/entries/commit-001/result")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("로또 결과 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.status").value("WINNING"));

        verify(lottoService).getResult("JackpotAddress01", "commit-001");
    }

    @Test
    @DisplayName("로또 참여 내역 조회 API는 인증 지갑 주소를 서비스에 전달한다")
    void getEntriesReturnsSuccess() throws Exception {
        given(lottoService.getEntries("JackpotAddress01", "JackpotAddress01", "WINNING"))
            .willReturn(new ssatto.BE_ssatto.domain.lotto.dto.LottoEntriesResponse(
                List.of(new ssatto.BE_ssatto.domain.lotto.dto.LottoEntrySummaryResponse(
                    42L,
                    "commit-001",
                    List.of(10, 1, 15, 3, 4, 14),
                    "WINNING",
                    4,
                    2_000_000_000_000L,
                    false,
                    true,
                    java.time.LocalDateTime.of(2026, 3, 20, 10, 0)
                ))
            ));

        mockMvc.perform(get("/v1/lotto/entries")
                .param("address", "JackpotAddress01")
                .param("status", "WINNING")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("로또 참여 내역 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.entries[0].commitHash").value("commit-001"));

        verify(lottoService).getEntries("JackpotAddress01", "JackpotAddress01", "WINNING");
    }

    @Test
    @DisplayName("로또 클레임 API는 인증 지갑 주소를 서비스에 전달한다")
    void claimReturnsSuccess() throws Exception {
        given(lottoService.claim(eq("JackpotAddress01"), any()))
            .willReturn(new LottoClaimResponse(
                "claim-tx-001",
                4,
                2_000_000_000_000L,
                java.time.LocalDateTime.of(2026, 3, 21, 1, 0)
            ));

        mockMvc.perform(post("/v1/lotto/claim")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fromAddress": "JackpotAddress01",
                      "commitHash": "commit-001",
                      "signedTxHex": "0500000001abcd"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("보상 수령이 완료되었습니다."))
            .andExpect(jsonPath("$.data.claimTxId").value("claim-tx-001"));

        verify(lottoService).claim(eq("JackpotAddress01"), any());
    }

    @Test
    @DisplayName("클레임 컨텍스트 조회 API는 인증 지갑 주소를 서비스에 전달한다")
    void getClaimContextReturnsSuccess() throws Exception {
        given(lottoService.getClaimContext("JackpotAddress01", "commit-001"))
            .willReturn(new LottoClaimContextResponse(
                "commit-001",
                4,
                2_000_000_000_000L,
                null,
                true,
                List.of(new LottoClaimPoolUtxoResponse("pool-utxo-001", 0, 2_500_000_000_000L, 18))
            ));

        mockMvc.perform(get("/v1/lotto/entries/commit-001/claim-context")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("로또 클레임 컨텍스트 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.claimable").value(true))
            .andExpect(jsonPath("$.data.poolUtxos[0].txId").value("pool-utxo-001"));

        verify(lottoService).getClaimContext("JackpotAddress01", "commit-001");
    }
}
