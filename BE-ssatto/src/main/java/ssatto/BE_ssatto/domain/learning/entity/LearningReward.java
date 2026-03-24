package ssatto.BE_ssatto.domain.learning.entity;

// [학습 프론트엔드 v2] 추가: 보상 기록 엔티티

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "learning_reward")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningReward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wallet_address", nullable = false, length = 64)
    private String walletAddress;

    @Column(name = "reward_type", nullable = false, length = 30)
    private String rewardType;

    @Column(name = "jack_amount", nullable = false)
    private Long jackAmount;

    @Column(name = "module", length = 50)
    private String module;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private LearningReward(String walletAddress, String rewardType, Long jackAmount, String module) {
        this.walletAddress = walletAddress;
        this.rewardType = rewardType;
        this.jackAmount = jackAmount;
        this.module = module;
        this.createdAt = LocalDateTime.now();
    }

    public static LearningReward create(String walletAddress, String rewardType, Long jackAmount, String module) {
        return new LearningReward(walletAddress, rewardType, jackAmount, module);
    }
}
