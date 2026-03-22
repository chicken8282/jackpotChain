package ssatto.BE_ssatto.domain.lotto.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import ssatto.BE_ssatto.domain.blockchain.entity.Transaction;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;

import java.time.LocalDateTime;

/**
 * 로또 참여 기록을 저장하는 엔티티다.
 */
@Getter
@Entity
@Table(name = "lotto_entry")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LottoEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "commit_hash", referencedColumnName = "tx_id", nullable = false, unique = true)
    private Transaction commitTransaction;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_address", referencedColumnName = "address", nullable = false)
    private Wallet wallet;

    @Column(name = "chosen_numbers", nullable = false, length = 50)
    private String chosenNumbers;

    @Column(name = "jackpot_snapshot", nullable = false)
    private Long jackpotSnapshot;

    @Column(name = "commit_block_height", nullable = false)
    private Long commitBlockHeight;

    @Column(name = "result_numbers", length = 50)
    private String resultNumbers;

    @Column(name = "match_count")
    private Integer matchCount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private LottoEntryStatus status;

    @Column(name = "reward_jack")
    private Long rewardJack;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_tx_id", referencedColumnName = "tx_id")
    private Transaction claimTransaction;

    @Column(name = "claimable_from_height", nullable = false)
    private Long claimableFromHeight;

    @Column(name = "claimable_until_height", nullable = false)
    private Long claimableUntilHeight;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

    private LottoEntry(
        Transaction commitTransaction,
        Wallet wallet,
        String chosenNumbers,
        Long jackpotSnapshot,
        Long commitBlockHeight,
        String resultNumbers,
        Integer matchCount,
        LottoEntryStatus status,
        Long rewardJack,
        Transaction claimTransaction,
        Long claimableFromHeight,
        Long claimableUntilHeight,
        LocalDateTime createdAt,
        LocalDateTime claimedAt
    ) {
        this.commitTransaction = commitTransaction;
        this.wallet = wallet;
        this.chosenNumbers = chosenNumbers;
        this.jackpotSnapshot = jackpotSnapshot;
        this.commitBlockHeight = commitBlockHeight;
        this.resultNumbers = resultNumbers;
        this.matchCount = matchCount;
        this.status = status;
        this.rewardJack = rewardJack;
        this.claimTransaction = claimTransaction;
        this.claimableFromHeight = claimableFromHeight;
        this.claimableUntilHeight = claimableUntilHeight;
        this.createdAt = createdAt == null ? LocalDateTime.now() : createdAt;
        this.claimedAt = claimedAt;
    }

    /**
     * 로또 참여 엔트리를 생성한다.
     *
     * @param commitTransaction 커밋 트랜잭션
     * @param wallet 참여 지갑
     * @param chosenNumbers 선택 번호
     * @param jackpotSnapshot 커밋 시점 잭팟 잔액
     * @param commitBlockHeight 커밋 블록 높이
     * @param resultNumbers 결과 번호
     * @param matchCount 일치 개수
     * @param status 상태
     * @param rewardJack JACK 보상
     * @param claimTransaction 청구 트랜잭션
     * @param claimableFromHeight 청구 가능 시작 높이
     * @param claimableUntilHeight 청구 만료 높이
     * @param createdAt 생성 시각
     * @param claimedAt 청구 시각
     * @return 생성된 로또 엔트리
     */
    public static LottoEntry create(
        Transaction commitTransaction,
        Wallet wallet,
        String chosenNumbers,
        Long jackpotSnapshot,
        Long commitBlockHeight,
        String resultNumbers,
        Integer matchCount,
        LottoEntryStatus status,
        Long rewardJack,
        Transaction claimTransaction,
        Long claimableFromHeight,
        Long claimableUntilHeight,
        LocalDateTime createdAt,
        LocalDateTime claimedAt
    ) {
        return new LottoEntry(
            commitTransaction,
            wallet,
            chosenNumbers,
            jackpotSnapshot,
            commitBlockHeight,
            resultNumbers,
            matchCount,
            status,
            rewardJack,
            claimTransaction,
            claimableFromHeight,
            claimableUntilHeight,
            createdAt,
            claimedAt
        );
    }

    /**
     * 커밋 해시를 반환한다.
     *
     * @return 커밋 트랜잭션 해시
     */
    public String getCommitHash() {
        return commitTransaction.getTxId();
    }

    /**
     * 체인 결과를 기준으로 엔트리 결과를 갱신한다.
     *
     * @param resultNumbers 결과 번호 문자열
     * @param matchCount 일치 개수
     * @param status 결과 상태
     * @param rewardJack JACK 보상
     */
    public void updateResult(String resultNumbers, Integer matchCount, LottoEntryStatus status, Long rewardJack) {
        this.resultNumbers = resultNumbers;
        this.matchCount = matchCount;
        this.status = status;
        this.rewardJack = rewardJack;
    }

    /**
     * 클레임 완료 상태를 반영한다.
     *
     * @param claimTransaction claim 트랜잭션
     * @param claimedAt claim 시각
     */
    public void markClaimed(Transaction claimTransaction, LocalDateTime claimedAt) {
        this.claimTransaction = claimTransaction;
        this.claimedAt = claimedAt == null ? LocalDateTime.now() : claimedAt;
    }
}
