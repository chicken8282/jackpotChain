package ssatto.BE_ssatto.domain.learning.repository;

// [학습 프론트엔드 v2] 추가

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ssatto.BE_ssatto.domain.learning.entity.LearningReward;
import java.util.List;

public interface LearningRewardRepository extends JpaRepository<LearningReward, Long> {
    List<LearningReward> findByWalletAddressOrderByCreatedAtDesc(String walletAddress);

    @Query("SELECT COALESCE(SUM(r.jackAmount), 0) FROM LearningReward r WHERE r.walletAddress = :walletAddress")
    Long sumJackAmountByWalletAddress(String walletAddress);
}
