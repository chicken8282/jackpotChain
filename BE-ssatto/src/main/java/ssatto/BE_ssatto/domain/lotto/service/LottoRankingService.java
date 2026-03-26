package ssatto.BE_ssatto.domain.lotto.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ssatto.BE_ssatto.domain.lotto.dto.LottoRankingResponse;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntry;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntryStatus;
import ssatto.BE_ssatto.domain.lotto.entity.LottoRanking;
import ssatto.BE_ssatto.domain.lotto.repository.LottoEntryRepository;
import ssatto.BE_ssatto.domain.lotto.repository.LottoRankingRepository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 로또 당첨자 랭킹 read-model을 관리하는 서비스다.
 */
@Service
@RequiredArgsConstructor
public class LottoRankingService {

    private final LottoEntryRepository lottoEntryRepository;
    private final LottoRankingRepository lottoRankingRepository;

    /**
     * WINNING + claimed 엔트리를 reward_jack 내림차순으로 top 3 집계 후 lotto_ranking 테이블을 갱신한다.
     * syncToTip 트랜잭션 내부에서 호출되므로 별도 트랜잭션 경계를 만들지 않는다.
     */
    @Transactional
    public void refreshTopRankings() {
        List<LottoEntry> top3 = lottoEntryRepository
            .findTop3ByStatusAndClaimedAtIsNotNullAndRewardJackIsNotNullOrderByRewardJackDesc(LottoEntryStatus.WINNING);

        lottoRankingRepository.deleteAllRankings();

        for (int i = 0; i < top3.size(); i++) {
            LottoEntry entry = top3.get(i);
            lottoRankingRepository.save(LottoRanking.create(
                i + 1,
                entry.getWallet(),
                entry,
                entry.getMatchCount(),
                entry.getRewardJack(),
                entry.getClaimedAt(),
                LocalDateTime.now()
            ));
        }
    }

    /**
     * 현재 랭킹 top 3를 조회한다.
     *
     * @return 순위 오름차순 랭킹 목록
     */
    @Transactional(readOnly = true)
    public List<LottoRankingResponse> getTopRankings() {
        return lottoRankingRepository.findAllByOrderByRankAsc().stream()
            .map(r -> new LottoRankingResponse(
                r.getRank(),
                r.getWallet().getAddress(),
                r.getRewardJack(),
                r.getMatchCount(),
                r.getClaimedAt()
            ))
            .toList();
    }
}
