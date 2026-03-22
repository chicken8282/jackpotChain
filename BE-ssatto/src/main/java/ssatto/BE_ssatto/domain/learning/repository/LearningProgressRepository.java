package ssatto.BE_ssatto.domain.learning.repository;

// [학습 프론트엔드 v2] 추가

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.learning.entity.LearningProgress;
import java.util.List;
import java.util.Optional;

public interface LearningProgressRepository extends JpaRepository<LearningProgress, Long> {
    List<LearningProgress> findByWalletAddress(String walletAddress);
    List<LearningProgress> findByWalletAddressAndStage(String walletAddress, Integer stage);
    Optional<LearningProgress> findByWalletAddressAndModule(String walletAddress, String module);
}
