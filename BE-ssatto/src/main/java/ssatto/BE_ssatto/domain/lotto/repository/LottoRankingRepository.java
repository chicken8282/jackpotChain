package ssatto.BE_ssatto.domain.lotto.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import ssatto.BE_ssatto.domain.lotto.entity.LottoRanking;

import java.util.List;
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

    /**
     * 순위 오름차순으로 전체 랭킹을 조회한다.
     *
     * @return 랭킹 목록
     */
    List<LottoRanking> findAllByOrderByRankAsc();

    /**
     * 랭킹 테이블 전체를 삭제한다 (bulk, PC 즉시 반영).
     */
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM LottoRanking")
    void deleteAllRankings();
}
