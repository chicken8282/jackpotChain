package ssatto.BE_ssatto.domain.learning.dto;

// [학습 프론트엔드 v2] 추가

import java.util.List;

public record StageProgressResponse(int stage, String title, List<ModuleProgress> modules) {
    public record ModuleProgress(String module, String title, String status, int score,
                                  int totalAttempts, int correctCount, String completedAt) {}
}
