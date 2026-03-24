package ssatto.BE_ssatto.domain.learning.dto;

// [학습 프론트엔드 v2] 추가: Decision Modal 데이터

import java.util.List;

public record MissionResultResponse(
    String module,
    boolean success,
    int accuracyPercent,
    int totalAttempts,
    int correctCount,
    String wrongCategories,
    long timeSpentMs,
    long rewardJack,
    List<String> newBadges,
    String nextModule,
    String weakModule
) {}
