package ssatto.BE_ssatto.domain.learning.entity;

// [학습 프론트엔드 v2] 추가: 학습 진행 엔티티 (v2 확장 필드 포함)

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "learning_progress")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wallet_address", nullable = false, length = 64)
    private String walletAddress;

    @Column(name = "stage", nullable = false)
    private Integer stage;

    @Column(name = "module", nullable = false, length = 50)
    private String module;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private LearningStatus status;

    @Column(name = "total_attempts", nullable = false)
    private Integer totalAttempts;

    @Column(name = "correct_count", nullable = false)
    private Integer correctCount;

    @Column(name = "wrong_categories")
    private String wrongCategories;

    @Column(name = "time_spent_ms", nullable = false)
    private Long timeSpentMs;

    @Column(name = "score", nullable = false)
    private Integer score;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private LearningProgress(String walletAddress, Integer stage, String module) {
        this.walletAddress = walletAddress;
        this.stage = stage;
        this.module = module;
        this.status = LearningStatus.NOT_STARTED;
        this.totalAttempts = 0;
        this.correctCount = 0;
        this.timeSpentMs = 0L;
        this.score = 0;
        this.createdAt = LocalDateTime.now();
    }

    public static LearningProgress create(String walletAddress, Integer stage, String module) {
        return new LearningProgress(walletAddress, stage, module);
    }

    public void markCompleted(int totalAttempts, int correctCount, String wrongCategories, long timeSpentMs) {
        this.status = LearningStatus.COMPLETED;
        this.totalAttempts = totalAttempts;
        this.correctCount = correctCount;
        this.wrongCategories = wrongCategories;
        this.timeSpentMs = timeSpentMs;
        this.score = totalAttempts > 0 ? (int) ((double) correctCount / totalAttempts * 100) : 0;
        this.completedAt = LocalDateTime.now();
    }
}
