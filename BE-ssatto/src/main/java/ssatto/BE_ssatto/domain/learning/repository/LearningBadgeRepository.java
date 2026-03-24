package ssatto.BE_ssatto.domain.learning.repository;

// [학습 프론트엔드 v2] 추가

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.learning.entity.LearningBadge;
import java.util.List;

public interface LearningBadgeRepository extends JpaRepository<LearningBadge, Long> {
    List<LearningBadge> findByWalletAddress(String walletAddress);
    boolean existsByWalletAddressAndBadgeType(String walletAddress, String badgeType);
}
