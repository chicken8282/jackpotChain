package ssatto.BE_ssatto.domain.lotto.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntry;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntryStatus;

import java.util.List;
import java.util.Optional;

/**
 * 로또 참여 기록 저장소다.
 */
public interface LottoEntryRepository extends JpaRepository<LottoEntry, Long> {

    /**
     * 커밋 해시로 로또 참여 기록을 조회한다.
     *
     * @param txId 커밋 트랜잭션 해시
     * @return 로또 참여 기록
     */
    Optional<LottoEntry> findByCommitTransactionTxId(String txId);

    /**
     * 지갑 주소 기준으로 로또 참여 기록을 최신순 조회한다.
     *
     * @param walletAddress 지갑 주소
     * @param pageable 페이지 정보
     * @return 최신순 로또 기록 페이지
     */
    Page<LottoEntry> findByWalletAddressOrderByCreatedAtDesc(String walletAddress, Pageable pageable);

    /**
     * 지갑 주소 기준으로 로또 참여 기록을 최신순 조회한다.
     *
     * @param walletAddress 지갑 주소
     * @return 최신순 로또 기록 목록
     */
    List<LottoEntry> findByWalletAddressOrderByCreatedAtDesc(String walletAddress);

    /**
     * 지갑 주소와 상태 기준으로 로또 참여 기록을 최신순 조회한다.
     *
     * @param walletAddress 지갑 주소
     * @param status 상태
     * @return 최신순 로또 기록 목록
     */
    List<LottoEntry> findByWalletAddressAndStatusOrderByCreatedAtDesc(String walletAddress, LottoEntryStatus status);

    /**
     * 특정 높이까지 청구 가능한 엔트리를 상태 기준으로 조회한다.
     *
     * @param status 엔트리 상태
     * @param claimableFromHeight 청구 시작 높이 상한
     * @param pageable 페이지 정보
     * @return 청구 가능 후보 페이지
     */
    Page<LottoEntry> findByStatusAndClaimableFromHeightLessThanEqualOrderByClaimableFromHeightAsc(
        LottoEntryStatus status,
        Long claimableFromHeight,
        Pageable pageable
    );

    /**
     * WINNING 상태이고 claim 완료된 엔트리를 보상액 내림차순으로 상위 3개 조회한다.
     * match=1 (POT 환불만, JACK 없음) 케이스는 rewardJack=null 이므로 제외.
     *
     * @param status 엔트리 상태 (WINNING)
     * @return 보상액 내림차순 상위 3개
     */
    List<LottoEntry> findTop3ByStatusAndClaimedAtIsNotNullAndRewardJackIsNotNullOrderByRewardJackDesc(
        LottoEntryStatus status
    );
}
