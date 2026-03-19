package ssatto.BE_ssatto.domain.lotto.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;

import java.time.LocalDateTime;

/**
 * 역대 로또 당첨 랭킹을 저장하는 엔티티다.
 */
@Getter
@Entity
@Table(name = "lotto_ranking")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LottoRanking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "rank", nullable = false, unique = true)
    private Integer rank;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_address", referencedColumnName = "address", nullable = false)
    private Wallet wallet;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commit_hash", referencedColumnName = "commit_hash", nullable = false, unique = true)
    private LottoEntry lottoEntry;

    @Column(name = "match_count", nullable = false)
    private Integer matchCount;

    @Column(name = "reward_jack", nullable = false)
    private Long rewardJack;

    @Column(name = "claimed_at", nullable = false)
    private LocalDateTime claimedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private LottoRanking(
        Integer rank,
        Wallet wallet,
        LottoEntry lottoEntry,
        Integer matchCount,
        Long rewardJack,
        LocalDateTime claimedAt,
        LocalDateTime updatedAt
    ) {
        this.rank = rank;
        this.wallet = wallet;
        this.lottoEntry = lottoEntry;
        this.matchCount = matchCount;
        this.rewardJack = rewardJack;
        this.claimedAt = claimedAt;
        this.updatedAt = updatedAt == null ? LocalDateTime.now() : updatedAt;
    }

    /**
     * 랭킹 엔트리를 생성한다.
     *
     * @param rank 랭킹 순위
     * @param wallet 당첨 지갑
     * @param lottoEntry 당첨 엔트리
     * @param matchCount 일치 개수
     * @param rewardJack 보상 금액
     * @param claimedAt 청구 시각
     * @param updatedAt 갱신 시각
     * @return 생성된 랭킹 엔티티
     */
    public static LottoRanking create(
        Integer rank,
        Wallet wallet,
        LottoEntry lottoEntry,
        Integer matchCount,
        Long rewardJack,
        LocalDateTime claimedAt,
        LocalDateTime updatedAt
    ) {
        return new LottoRanking(rank, wallet, lottoEntry, matchCount, rewardJack, claimedAt, updatedAt);
    }
}
