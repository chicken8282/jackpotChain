package ssatto.BE_ssatto.domain.learning.dto;

// [학습 프론트엔드 v2] 추가: 미션 완료 요청 (v2 확장 필드)

import jakarta.validation.constraints.NotBlank;

public record MissionCompleteRequest(
    @NotBlank String walletAddress,
    int totalAttempts,
    int correctCount,
    String wrongCategories,
    long timeSpentMs
) {}
