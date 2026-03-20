package ssatto.BE_ssatto.domain.mining.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ssatto.BE_ssatto.domain.mining.dto.MiningBlockCursorResponse;
import ssatto.BE_ssatto.domain.mining.dto.MiningBlockItemResponse;
import ssatto.BE_ssatto.domain.mining.service.MiningService;
import ssatto.BE_ssatto.global.config.JwtAuthenticationEntryPoint;
import ssatto.BE_ssatto.global.config.JwtAuthenticationFilter;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 채굴 API 엔드포인트를 검증한다.
 */
@WebMvcTest(MiningController.class)
@AutoConfigureMockMvc(addFilters = false)
class MiningControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MiningService miningService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Test
    @DisplayName("채굴 블록 내역 조회 API는 인증 지갑 주소를 서비스에 전달한다")
    void getMinedBlocksReturnsSuccess() throws Exception {
        given(miningService.getMinedBlocks("JackpotAddress01", "JackpotAddress01", null, 10))
            .willReturn(new MiningBlockCursorResponse(
                false,
                null,
                20_000_000_000L,
                List.of(new MiningBlockItemResponse(
                    1042L,
                    1042L,
                    "0000a3f",
                    10_000_000_000L,
                    3,
                    LocalDateTime.of(2026, 3, 20, 10, 30)
                ))
            ));

        mockMvc.perform(get("/api/v1/mining/blocks")
                .param("address", "JackpotAddress01")
                .principal(new UsernamePasswordAuthenticationToken("JackpotAddress01", null)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("채굴 블록 내역 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.totalRewardJack").value(20_000_000_000L))
            .andExpect(jsonPath("$.data.blocks[0].height").value(1042L));

        verify(miningService).getMinedBlocks("JackpotAddress01", "JackpotAddress01", null, 10);
    }
}
