package ssatto.BE_ssatto.domain.learning.dto;

// [학습 프론트엔드 v2] 추가: 종합 리포트 + 수료증

public record LearningReportResponse(
    int securityScore, int transactionScore, int networkScore,
    int consensusScore, int tokenEconomyScore, int fairnessScore,
    String overallGrade, long totalTimeMs, long welcomeJack,
    String certificateIssuedAt
) {}
