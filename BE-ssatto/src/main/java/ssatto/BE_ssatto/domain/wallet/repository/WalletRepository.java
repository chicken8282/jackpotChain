package ssatto.BE_ssatto.domain.wallet.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;

import java.util.Optional;

/**
 * 지갑 메타데이터 저장소다.
 */
public interface WalletRepository extends JpaRepository<Wallet, Long> {

    /**
     * 주소로 지갑을 조회한다.
     *
     * @param address 지갑 주소
     * @return 지갑 메타데이터
     */
    Optional<Wallet> findByAddress(String address);
}
