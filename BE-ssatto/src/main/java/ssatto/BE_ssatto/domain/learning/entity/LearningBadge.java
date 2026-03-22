package ssatto.BE_ssatto.domain.learning.entity;

// [학습 프론트엔드 v2] 추가: 뱃지 엔티티

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "learning_badge")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wallet_address", nullable = false, length = 64)
    private String walletAddress;

    @Column(name = "badge_type", nullable = false, length = 50)
    private String badgeType;

    @Column(name = "earned_at", nullable = false)
    private LocalDateTime earnedAt;

    private LearningBadge(String walletAddress, String badgeType) {
        this.walletAddress = walletAddress;
        this.badgeType = badgeType;
        this.earnedAt = LocalDateTime.now();
    }

    public static LearningBadge create(String walletAddress, String badgeType) {
        return new LearningBadge(walletAddress, badgeType);
    }
}
