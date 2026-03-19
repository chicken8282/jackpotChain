package ssatto.BE_ssatto.domain.lotto.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
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

    private final LottoService lottoService;

    /**
     * 로또 페이지 통합 정보를 조회한다.
     *
     * @param address 지갑 주소
     * @return 로또 개요 응답
     */
    @GetMapping
    public ApiResponse<LottoOverviewResponse> getOverview(@RequestParam String address) {
        return ApiResponse.success(lottoService.getOverview(address));
    }

    /**
     * 서명된 로또 참여 트랜잭션을 제출한다.
     *
     * @param request 참여 요청
     * @return 성공 응답
     */
    @PostMapping("/commit")
    public ApiResponse<Void> commit(@Valid @RequestBody LottoCommitRequest request) {
        lottoService.commit(request);
        return ApiResponse.success();
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
        @RequestParam String address,
        @RequestParam(required = false) String status
    ) {
        return ApiResponse.success(lottoService.getEntries(address, status));
    }

    /**
     * 특정 커밋 해시의 로또 결과를 조회한다.
     *
     * @param commitHash 커밋 해시
     * @return 로또 결과 응답
     */
    @GetMapping("/entries/{commitHash}/result")
    public ApiResponse<LottoResultResponse> getResult(@PathVariable String commitHash) {
        return ApiResponse.success(lottoService.getResult(commitHash));
    }
}
