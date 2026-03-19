package ssatto.BE_ssatto.domain.wallet.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivity;

/**
 * 지갑 활동 이력 저장소다.
 */
public interface WalletActivityRepository extends JpaRepository<WalletActivity, Long> {

    /**
     * 지갑 주소 기준으로 활동 이력을 최신순 조회한다.
     *
     * @param walletAddress 지갑 주소
     * @param pageable 페이지 정보
     * @return 최신순 지갑 활동 페이지
     */
    Page<WalletActivity> findByWalletAddressOrderByCreatedAtDesc(String walletAddress, Pageable pageable);
}
