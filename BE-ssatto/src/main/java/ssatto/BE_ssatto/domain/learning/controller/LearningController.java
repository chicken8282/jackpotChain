package ssatto.BE_ssatto.domain.learning.controller;

// [학습 프론트엔드 v2] 추가: 학습 API 컨트롤러

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import ssatto.BE_ssatto.domain.learning.dto.*;
import ssatto.BE_ssatto.domain.learning.service.LearningService;
import ssatto.BE_ssatto.global.response.ApiResponse;

@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/learning")
public class LearningController {

    private static final int OK = HttpStatus.OK.value();
    private final LearningService learningService;

    @GetMapping("/overview")
    public ApiResponse<LearningOverviewResponse> getOverview(@RequestParam String address) {
        return ApiResponse.success(OK, "학습 현황 조회 완료.", learningService.getOverview(address));
    }

    @GetMapping("/stages/{stage}")
    public ApiResponse<StageProgressResponse> getStageProgress(@PathVariable int stage, @RequestParam String address) {
        return ApiResponse.success(OK, "단계 진행 조회 완료.", learningService.getStageProgress(address, stage));
    }

    @PostMapping("/modules/{module}/complete")
    public ApiResponse<MissionResultResponse> completeMission(@PathVariable String module, @Valid @RequestBody MissionCompleteRequest req) {
        return ApiResponse.success(OK, "미션 완료.", learningService.completeMission(module, req));
    }

    @GetMapping("/report")
    public ApiResponse<LearningReportResponse> getReport(@RequestParam String address) {
        return ApiResponse.success(OK, "리포트 조회 완료.", learningService.getReport(address));
    }

    @PostMapping("/report/generate")
    public ApiResponse<LearningReportResponse> generateReport(@RequestParam String address) {
        return ApiResponse.success(OK, "리포트 생성 완료.", learningService.generateReport(address));
    }
}
