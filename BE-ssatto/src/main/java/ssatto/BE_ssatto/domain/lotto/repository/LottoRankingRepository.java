package ssatto.BE_ssatto.domain.lotto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.lotto.entity.LottoRanking;

import java.util.Optional;

/**
 * 로또 랭킹 저장소다.
 */
public interface LottoRankingRepository extends JpaRepository<LottoRanking, Long> {

    /**
     * 순위로 랭킹 엔트리를 조회한다.
     *
     * @param rank 순위
     * @return 랭킹 엔트리
     */
    Optional<LottoRanking> findByRank(Integer rank);
}
