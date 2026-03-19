package ssatto.BE_ssatto.domain.lotto.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ssatto.BE_ssatto.domain.lotto.dto.LottoOverviewResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoPrizeTierResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoResultResponse;
import ssatto.BE_ssatto.domain.lotto.service.LottoService;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
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

    @Test
    @DisplayName("로또 개요 조회 API가 성공 응답을 반환한다")
    void getOverviewReturnsSuccess() throws Exception {
        given(lottoService.getOverview("JackpotAddress01"))
            .willReturn(new LottoOverviewResponse(
                12_500_000_000L,
                300_000_000L,
                450_000_000_000L,
                1_240L,
                3L,
                List.of(new LottoPrizeTierResponse(1, 6, 10_000_000_000_000L))
            ));

        mockMvc.perform(get("/api/v1/lotto").param("address", "JackpotAddress01"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.poolBalanceJack").value(450_000_000_000L));
    }

    @Test
    @DisplayName("로또 참여 API가 성공 응답을 반환한다")
    void commitReturnsSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/lotto/commit")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fromAddress": "JackpotAddress01",
                      "chosenNumbers": [10, 1, 15, 3, 4, 14],
                      "signedTxHex": "0300000001abcd"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("로또 결과 조회 API가 성공 응답을 반환한다")
    void getResultReturnsSuccess() throws Exception {
        given(lottoService.getResult("commit-001"))
            .willReturn(new LottoResultResponse(
                "commit-001",
                List.of(10, 1, 15, 3, 4, 14),
                List.of(10, 5, 15, 3, 9, 14),
                4,
                false,
                "WINNING",
                2_000_000_000_000L
            ));

        mockMvc.perform(get("/api/v1/lotto/entries/commit-001/result"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.status").value("WINNING"));
    }

    @Test
    @DisplayName("로또 참여 내역 조회 API가 성공 응답을 반환한다")
    void getEntriesReturnsSuccess() throws Exception {
        given(lottoService.getEntries("JackpotAddress01", "WINNING"))
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

        mockMvc.perform(get("/api/v1/lotto/entries")
                .param("address", "JackpotAddress01")
                .param("status", "WINNING"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.entries[0].commitHash").value("commit-001"));
    }
}
