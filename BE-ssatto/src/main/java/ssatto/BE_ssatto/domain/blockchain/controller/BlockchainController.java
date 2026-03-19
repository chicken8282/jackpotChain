package ssatto.BE_ssatto.domain.blockchain.controller;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainBlockDetailResponse;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainDashboardResponse;
import ssatto.BE_ssatto.domain.blockchain.service.BlockchainQueryService;
import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;
import ssatto.BE_ssatto.global.response.ApiResponse;

/**
 * 블록체인 대시보드와 블록 상세 조회 API를 제공한다.
 */
@Validated
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/blockchain")
public class BlockchainController {

    private final BlockchainQueryService blockchainQueryService;

    /**
     * 블록체인 대시보드 정보를 조회한다.
     *
     * @param limit 최근 블록 조회 개수
     * @return 대시보드 응답
     */
    @GetMapping("/dashboard")
    public ApiResponse<BlockchainDashboardResponse> getDashboard(
        @RequestParam(defaultValue = "10")
        @Min(value = 1, message = "최근 블록 조회 개수는 1 이상이어야 합니다.")
        @Max(value = 50, message = "최근 블록 조회 개수는 50 이하여야 합니다.")
        int limit
    ) {
        if (limit < 1 || limit > 50) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }

        return ApiResponse.success(blockchainQueryService.getDashboard(limit));
    }

    /**
     * 지정한 높이의 블록 상세 정보를 조회한다.
     *
     * @param height 조회할 블록 높이
     * @return 블록 상세 응답
     */
    @GetMapping("/blocks/{height}")
    public ApiResponse<BlockchainBlockDetailResponse> getBlockDetail(@PathVariable long height) {
        return ApiResponse.success(blockchainQueryService.getBlockDetail(height));
    }
}
