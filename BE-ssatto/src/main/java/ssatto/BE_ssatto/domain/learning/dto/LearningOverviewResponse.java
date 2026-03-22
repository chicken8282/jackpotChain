package ssatto.BE_ssatto.domain.learning.dto;

// [학습 프론트엔드 v2] 추가

import java.util.List;

public record LearningOverviewResponse(
    int totalModules, int completedModules, double progressPercent, long totalRewardJack,
    List<StageOverview> stages, List<BadgeItem> badges
) {
    public record StageOverview(int stage, String title, int totalModules, int completedModules, String status) {}
    public record BadgeItem(String badgeType, String earnedAt) {}
}
