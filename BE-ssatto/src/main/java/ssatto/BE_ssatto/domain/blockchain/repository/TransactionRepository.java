package ssatto.BE_ssatto.domain.blockchain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.blockchain.entity.Transaction;

import java.util.Optional;

/**
 * 트랜잭션 인덱싱 저장소다.
 */
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    /**
     * 트랜잭션 해시로 트랜잭션을 조회한다.
     *
     * @param txId 트랜잭션 해시
     * @return 트랜잭션 엔티티
     */
    Optional<Transaction> findByTxId(String txId);
}
