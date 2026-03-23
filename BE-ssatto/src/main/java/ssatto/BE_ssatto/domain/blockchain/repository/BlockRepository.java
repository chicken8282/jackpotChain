package ssatto.BE_ssatto.domain.blockchain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    /**
     * 채굴자 주소 기준 최신 메인체인 블록을 페이지로 조회한다.
     *
     * @param minerAddress 채굴자 주소
     * @param pageable 페이지 정보
     * @return 블록 페이지
     */
    Page<Block> findByMinerAddressAndIsMainChainTrueOrderByIdDesc(String minerAddress, Pageable pageable);

    /**
     * 채굴자 주소와 커서 기준 최신 메인체인 블록을 페이지로 조회한다.
     *
     * @param minerAddress 채굴자 주소
     * @param cursor 마지막 블록 ID
     * @param pageable 페이지 정보
     * @return 블록 페이지
     */
    Page<Block> findByMinerAddressAndIsMainChainTrueAndIdLessThanOrderByIdDesc(
        String minerAddress,
        Long cursor,
        Pageable pageable
    );

    /**
     * 채굴자 주소 기준 누적 메인체인 보상을 합산한다.
     *
     * @param minerAddress 채굴자 주소
     * @return 누적 보상
     */
    @Query("""
        select coalesce(sum(b.rewardJack), 0)
        from Block b
        where b.minerAddress = :minerAddress
          and b.isMainChain = true
        """)
    Long sumRewardJackByMinerAddressAndIsMainChainTrue(@Param("minerAddress") String minerAddress);
}
