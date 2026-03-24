package ssatto.BE_ssatto.domain.learning.repository;

// [학습 프론트엔드 v2] 추가

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.learning.entity.LearningReport;
import java.util.Optional;

public interface LearningReportRepository extends JpaRepository<LearningReport, Long> {
    Optional<LearningReport> findByWalletAddress(String walletAddress);
}
