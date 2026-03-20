package ssatto.BE_ssatto.domain.mining.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ssatto.BE_ssatto.domain.mining.dto.MiningBlockCursorResponse;
import ssatto.BE_ssatto.domain.mining.service.MiningService;
import ssatto.BE_ssatto.global.response.ApiResponse;

/**
 * 주소별 채굴 블록 조회 API를 제공한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/mining")
public class MiningController {

    private static final int SUCCESS_CODE = HttpStatus.OK.value();
    private static final String GET_MINED_BLOCKS_SUCCESS_MESSAGE = "채굴 블록 내역 조회가 완료되었습니다.";

    private final MiningService miningService;

    /**
     * 특정 지갑 주소의 채굴 블록 내역을 조회한다.
     *
     * @param authentication 인증 주체
     * @param address 지갑 주소
     * @param lastBlockId 마지막 블록 ID 커서
     * @param size 조회 개수
     * @return 채굴 블록 응답
     */
    @GetMapping("/blocks")
    public ApiResponse<MiningBlockCursorResponse> getMinedBlocks(
        Authentication authentication,
        @RequestParam String address,
        @RequestParam(required = false) Long lastBlockId,
        @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.success(
            SUCCESS_CODE,
            GET_MINED_BLOCKS_SUCCESS_MESSAGE,
            miningService.getMinedBlocks(resolveWalletSubject(authentication), address, lastBlockId, size)
        );
    }

    private String resolveWalletSubject(Authentication authentication) {
        return authentication.getName();
    }
}
