package ssatto.BE_ssatto.domain.wallet.controller;

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
import ssatto.BE_ssatto.domain.wallet.dto.CreateWalletResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletUtxoItemResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletUtxoListResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletListResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletSummaryResponse;
import ssatto.BE_ssatto.domain.wallet.service.WalletService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
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

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Test
    @DisplayName("지갑 등록 API가 성공 응답을 반환한다")
    void createWalletReturnsSuccess() throws Exception {
        given(walletService.createWallet(any()))
            .willReturn(new CreateWalletResponse(
                "JackpotAddress01",
                "내 지갑",
                "BLUE",
                LocalDateTime.of(2026, 3, 20, 9, 0),
                true,
                "reward-tx-001",
                100_000_000L
            ));

        mockMvc.perform(post("/v1/wallet")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "address": "JackpotAddress01",
                      "nickname": "내 지갑",
                      "walletColor": "BLUE"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("지갑이 등록되었습니다."))
            .andExpect(jsonPath("$.data.address").value("JackpotAddress01"))
            .andExpect(jsonPath("$.data.onboardingRewardGranted").value(true))
            .andExpect(jsonPath("$.data.onboardingRewardTxId").value("reward-tx-001"))
            .andExpect(jsonPath("$.data.onboardingRewardPotAmount").value(100_000_000L));
    }

    @Test
    @DisplayName("지갑 목록 조회 API가 성공 응답을 반환한다")
    void getWalletsReturnsSuccess() throws Exception {
        given(walletService.getWallets("JackpotAddress01"))
            .willReturn(new WalletListResponse(List.of(
                new WalletSummaryResponse("JackpotAddress01", "내 지갑", "BLUE", 12_500_000_000L, 300_000_000L, LocalDateTime.of(2026, 3, 20, 9, 0))
            )));

        mockMvc.perform(get("/v1/wallet").param("addresses", "JackpotAddress01"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("지갑 목록 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.wallets[0].jackBalance").value(12_500_000_000L));
    }

    @Test
    @DisplayName("활동 내역 조회 API는 인증 지갑 주소를 서비스에 전달한다")
    void getActivitiesReturnsSuccess() throws Exception {
        given(walletService.getActivities("JackpotAddress01", "JackpotAddress01", 15L, 20, null))
            .willReturn(new ssatto.BE_ssatto.domain.wallet.dto.WalletActivityCursorResponse(
                false,
                null,
                List.of(new ssatto.BE_ssatto.domain.wallet.dto.WalletActivityItemResponse(
                    20L,
                    "LOTTO_COMMIT",
                    "로또 참여 (1 POT)",
                    "tx-001",
                    null,
                    -100_000_000L,
                    LocalDateTime.of(2026, 3, 20, 9, 30)
                ))
            ));

        mockMvc.perform(get("/v1/wallet/JackpotAddress01/activities")
                .param("lastActivityId", "15")
                .param("size", "20")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("활동 내역 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.activities[0].type").value("LOTTO_COMMIT"))
            .andExpect(jsonPath("$.data.activities[0].potAmount").value(-100_000_000L));

        verify(walletService).getActivities("JackpotAddress01", "JackpotAddress01", 15L, 20, null);
    }

    @Test
    @DisplayName("UTXO 조회 API는 인증 지갑 주소를 서비스에 전달한다")
    void getUtxosReturnsSuccess() throws Exception {
        given(walletService.getUtxos("JackpotAddress01", "JackpotAddress01"))
            .willReturn(new WalletUtxoListResponse(List.of(
                new WalletUtxoItemResponse(
                    "tx-001",
                    0,
                    "JackpotAddress01",
                    100_000_000L,
                    Map.of("POT", 200_000_000L),
                    12,
                    false
                )
            )));

        mockMvc.perform(get("/v1/wallet/JackpotAddress01/utxos")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("UTXO 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.utxos[0].txId").value("tx-001"))
            .andExpect(jsonPath("$.data.utxos[0].assets.POT").value(200_000_000L));

        verify(walletService).getUtxos("JackpotAddress01", "JackpotAddress01");
    }
}
