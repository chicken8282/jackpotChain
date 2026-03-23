package ssatto.BE_ssatto.domain.blockchain.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainBlockDetailResponse;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainDashboardBlockResponse;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainDashboardResponse;
import ssatto.BE_ssatto.domain.blockchain.service.BlockchainQueryService;
import ssatto.BE_ssatto.global.exception.GlobalExceptionHandler;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 블록체인 조회 컨트롤러의 요청/응답 계약을 검증한다.
 */
class BlockchainControllerTest {

    private BlockchainQueryService blockchainQueryService;
    private MockMvc mockMvc;

    /**
     * standalone MVC 환경에서 컨트롤러를 초기화한다.
     */
    @BeforeEach
    void setUp() {
        blockchainQueryService = mock(BlockchainQueryService.class);
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(new BlockchainController(blockchainQueryService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setValidator(validator)
            .build();
    }

    /**
     * 대시보드 조회는 공통 응답 래퍼와 데이터 본문을 반환해야 한다.
     */
    @Test
    void getDashboardReturnsWrappedPayload() throws Exception {
        given(blockchainQueryService.getDashboard(3))
            .willReturn(new BlockchainDashboardResponse(
                true,
                11L,
                "best-hash",
                65536L,
                null,
                2,
                4,
                List.of(new BlockchainDashboardBlockResponse(
                    11L,
                    "hash-11",
                    2,
                    LocalDateTime.of(2024, 3, 19, 1, 23, 20),
                    null,
                    5_000_000_000L,
                    8,
                    90_000_000L
                )),
                List.of(1, 2)
            ));

        mockMvc.perform(get("/api/v1/blockchain/dashboard")
                .queryParam("limit", "3")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("대시보드 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.height").value(11))
            .andExpect(jsonPath("$.data.blocks[0].hash").value("hash-11"))
            .andExpect(jsonPath("$.data.nodes[0]").value(1));
    }

    /**
     * limit이 허용 범위를 넘으면 400 응답을 반환해야 한다.
     */
    @Test
    void getDashboardRejectsInvalidLimit() throws Exception {
        mockMvc.perform(get("/api/v1/blockchain/dashboard")
                .queryParam("limit", "51")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(400));
    }

    /**
     * 블록 상세 조회는 지정 높이의 상세 응답을 반환해야 한다.
     */
    @Test
    void getBlockDetailReturnsWrappedPayload() throws Exception {
        given(blockchainQueryService.getBlockDetail(11L))
            .willReturn(new BlockchainBlockDetailResponse(
                11L,
                "hash-11",
                5_000_000_000L,
                300_000_000L,
                2,
                8,
                LocalDateTime.of(2024, 3, 19, 1, 23, 20),
                12,
                "0x00000001",
                "hash-10",
                12345L,
                "0x1E100000",
                "JACK_TEST_ADDRESS",
                true,
                "merkle",
                90_000_000L
            ));

        mockMvc.perform(get("/api/v1/blockchain/blocks/11")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.code").value(200))
            .andExpect(jsonPath("$.message").value("블록 상세 조회가 완료되었습니다."))
            .andExpect(jsonPath("$.data.hash").value("hash-11"))
            .andExpect(jsonPath("$.data.miningElapsed").value(12))
            .andExpect(jsonPath("$.data.isMainChain").value(true));
    }
}
