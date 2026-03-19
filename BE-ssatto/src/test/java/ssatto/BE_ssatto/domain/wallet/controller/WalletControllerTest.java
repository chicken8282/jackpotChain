package ssatto.BE_ssatto.domain.wallet.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ssatto.BE_ssatto.domain.wallet.dto.CreateWalletResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletListResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletSummaryResponse;
import ssatto.BE_ssatto.domain.wallet.service.WalletService;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 지갑 API 엔드포인트를 검증한다.
 */
@WebMvcTest(WalletController.class)
@AutoConfigureMockMvc(addFilters = false)
class WalletControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private WalletService walletService;

    @Test
    @DisplayName("지갑 등록 API가 성공 응답을 반환한다")
    void createWalletReturnsSuccess() throws Exception {
        given(walletService.createWallet(any()))
            .willReturn(new CreateWalletResponse("JackpotAddress01", "내 지갑", "BLUE", LocalDateTime.of(2026, 3, 20, 9, 0)));

        mockMvc.perform(post("/api/v1/wallet")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "address": "JackpotAddress01",
                      "nickname": "내 지갑",
                      "walletColor": "BLUE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.address").value("JackpotAddress01"));
    }

    @Test
    @DisplayName("지갑 목록 조회 API가 성공 응답을 반환한다")
    void getWalletsReturnsSuccess() throws Exception {
        given(walletService.getWallets("JackpotAddress01"))
            .willReturn(new WalletListResponse(List.of(
                new WalletSummaryResponse("JackpotAddress01", "내 지갑", "BLUE", 12_500_000_000L, 300_000_000L, LocalDateTime.of(2026, 3, 20, 9, 0))
            )));

        mockMvc.perform(get("/api/v1/wallet").param("addresses", "JackpotAddress01"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.wallets[0].jackBalance").value(12_500_000_000L));
    }

    @Test
    @DisplayName("활동 내역 조회 API가 성공 응답을 반환한다")
    void getActivitiesReturnsSuccess() throws Exception {
        given(walletService.getActivities("JackpotAddress01", null, 20, null))
            .willReturn(new ssatto.BE_ssatto.domain.wallet.dto.WalletActivityCursorResponse(
                false,
                null,
                List.of(new ssatto.BE_ssatto.domain.wallet.dto.WalletActivityItemResponse(
                    20L,
                    "LOTTO_COMMIT",
                    "로또 참여 (1 POT)",
                    "tx-001",
                    LocalDateTime.of(2026, 3, 20, 9, 30)
                ))
            ));

        mockMvc.perform(get("/api/v1/wallet/JackpotAddress01/activities"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.activities[0].type").value("LOTTO_COMMIT"));
    }
}
