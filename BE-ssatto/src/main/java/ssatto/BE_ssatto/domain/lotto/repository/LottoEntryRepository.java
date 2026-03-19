package ssatto.BE_ssatto.domain.lotto.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntry;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntryStatus;

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
}
