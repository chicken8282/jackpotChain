package ssatto.BE_ssatto.domain.blockchain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ssatto.BE_ssatto.domain.blockchain.entity.Block;

import java.util.Optional;

/**
 * 블록 인덱싱 저장소다.
 */
public interface BlockRepository extends JpaRepository<Block, Long> {

    /**
     * 블록 높이로 블록을 조회한다.
     *
     * @param height 블록 높이
     * @return 블록 엔티티
     */
    Optional<Block> findByHeight(Long height);
}
