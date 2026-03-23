package ssatto.BE_ssatto.domain.lotto.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimRequest;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoClaimContextResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoCommitRequest;
import ssatto.BE_ssatto.domain.lotto.dto.LottoEntriesResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoOverviewResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoResultResponse;
import ssatto.BE_ssatto.domain.lotto.service.LottoService;
import ssatto.BE_ssatto.global.response.ApiResponse;

/**
 * 로또 direct-pull 조회와 참여 API를 제공한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/lotto")
public class LottoController {

    private static final int SUCCESS_CODE = HttpStatus.OK.value();
    private static final String GET_OVERVIEW_SUCCESS_MESSAGE = "로또 정보 조회가 완료되었습니다.";
    private static final String COMMIT_SUCCESS_MESSAGE = "로또 참여가 완료되었습니다.";
    private static final String CLAIM_SUCCESS_MESSAGE = "보상 수령이 완료되었습니다.";
    private static final String GET_CLAIM_CONTEXT_SUCCESS_MESSAGE = "로또 클레임 컨텍스트 조회가 완료되었습니다.";
    private static final String GET_ENTRIES_SUCCESS_MESSAGE = "로또 참여 내역 조회가 완료되었습니다.";
    private static final String GET_RESULT_SUCCESS_MESSAGE = "로또 결과 조회가 완료되었습니다.";

    private final LottoService lottoService;

    /**
     * 로또 페이지 통합 정보를 조회한다.
     *
     * @param address 지갑 주소
     * @return 로또 개요 응답
     */
    @GetMapping
    public ApiResponse<LottoOverviewResponse> getOverview(Authentication authentication, @RequestParam String address) {
        return ApiResponse.success(
            SUCCESS_CODE,
            GET_OVERVIEW_SUCCESS_MESSAGE,
            lottoService.getOverview(resolveWalletSubject(authentication), address)
        );
    }

    /**
     * 서명된 로또 참여 트랜잭션을 제출한다.
     *
     * @param request 참여 요청
     * @return 성공 응답
     */
    @PostMapping("/commit")
    public ApiResponse<Void> commit(Authentication authentication, @Valid @RequestBody LottoCommitRequest request) {
        lottoService.commit(resolveWalletSubject(authentication), request);
        return ApiResponse.success(SUCCESS_CODE, COMMIT_SUCCESS_MESSAGE);
    }

    /**
     * 서명된 로또 보상 수령 트랜잭션을 제출한다.
     *
     * @param request 클레임 요청
     * @return 클레임 응답
     */
    @PostMapping("/claim")
    public ApiResponse<LottoClaimResponse> claim(Authentication authentication, @Valid @RequestBody LottoClaimRequest request) {
        return ApiResponse.success(
            SUCCESS_CODE,
            CLAIM_SUCCESS_MESSAGE,
            lottoService.claim(resolveWalletSubject(authentication), request)
        );
    }

    /**
     * 특정 지갑의 로또 참여 내역을 조회한다.
     *
     * @param address 지갑 주소
     * @param status 상태 필터
     * @return 로또 참여 내역 응답
     */
    @GetMapping("/entries")
    public ApiResponse<LottoEntriesResponse> getEntries(
        Authentication authentication,
        @RequestParam String address,
        @RequestParam(required = false) String status
    ) {
        return ApiResponse.success(
            SUCCESS_CODE,
            GET_ENTRIES_SUCCESS_MESSAGE,
            lottoService.getEntries(resolveWalletSubject(authentication), address, status)
        );
    }

    /**
     * 특정 커밋 해시의 로또 결과를 조회한다.
     *
     * @param commitHash 커밋 해시
     * @return 로또 결과 응답
     */
    @GetMapping("/entries/{commitHash}/result")
    public ApiResponse<LottoResultResponse> getResult(Authentication authentication, @PathVariable String commitHash) {
        return ApiResponse.success(
            SUCCESS_CODE,
            GET_RESULT_SUCCESS_MESSAGE,
            lottoService.getResult(resolveWalletSubject(authentication), commitHash)
        );
    }

    /**
     * 특정 커밋 해시의 클레임 서명 컨텍스트를 조회한다.
     *
     * @param commitHash 커밋 해시
     * @return 클레임 컨텍스트 응답
     */
    @GetMapping("/entries/{commitHash}/claim-context")
    public ApiResponse<LottoClaimContextResponse> getClaimContext(Authentication authentication, @PathVariable String commitHash) {
        return ApiResponse.success(
            SUCCESS_CODE,
            GET_CLAIM_CONTEXT_SUCCESS_MESSAGE,
            lottoService.getClaimContext(resolveWalletSubject(authentication), commitHash)
        );
    }

    private String resolveWalletSubject(Authentication authentication) {
        return authentication.getName();
    }
}
