package ssatto.BE_ssatto.domain.blockchain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 블록 인덱싱 결과를 저장하는 엔티티다.
 */
@Getter
@Entity
@Table(name = "block")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Block {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "height", nullable = false, unique = true)
    private Long height;

    @Column(name = "hash", nullable = false, unique = true, length = 64)
    private String hash;

    @Column(name = "prev_hash", nullable = false, length = 64)
    private String prevHash;

    @Column(name = "version", nullable = false, length = 16)
    private String version;

    @Column(name = "mined_at", nullable = false)
    private LocalDateTime minedAt;

    @Column(name = "mining_elapsed")
    private Integer miningElapsed;

    @Column(name = "difficulty", nullable = false, length = 20)
    private String difficulty;

    @Column(name = "nonce", nullable = false)
    private Long nonce;

    @Column(name = "miner_address", length = 64)
    private String minerAddress;

    @Column(name = "reward_jack", nullable = false)
    private Long rewardJack;

    @Column(name = "fee_reward_jack", nullable = false)
    private Long feeRewardJack;

    @Column(name = "tx_count", nullable = false)
    private Integer txCount;

    @Column(name = "is_main_chain", nullable = false)
    private boolean isMainChain;

    private Block(
        Long height,
        String hash,
        String prevHash,
        String version,
        LocalDateTime minedAt,
        Integer miningElapsed,
        String difficulty,
        Long nonce,
        String minerAddress,
        Long rewardJack,
        Long feeRewardJack,
        Integer txCount,
        boolean isMainChain
    ) {
        this.height = height;
        this.hash = hash;
        this.prevHash = prevHash;
        this.version = version;
        this.minedAt = minedAt;
        this.miningElapsed = miningElapsed;
        this.difficulty = difficulty;
        this.nonce = nonce;
        this.minerAddress = minerAddress;
        this.rewardJack = rewardJack;
        this.feeRewardJack = feeRewardJack;
        this.txCount = txCount;
        this.isMainChain = isMainChain;
    }

    /**
     * 블록 인덱싱 엔티티를 생성한다.
     *
     * @param height 블록 높이
     * @param hash 블록 해시
     * @param prevHash 이전 블록 해시
     * @param version 블록 버전
     * @param minedAt 채굴 시각
     * @param miningElapsed 채굴 소요 시간
     * @param difficulty 난이도 문자열
     * @param nonce 논스
     * @param minerAddress 채굴자 주소
     * @param rewardJack 블록 보상
     * @param feeRewardJack 수수료 보상
     * @param txCount 트랜잭션 수
     * @param isMainChain 메인 체인 여부
     * @return 생성된 블록 엔티티
     */
    public static Block create(
        Long height,
        String hash,
        String prevHash,
        String version,
        LocalDateTime minedAt,
        Integer miningElapsed,
        String difficulty,
        Long nonce,
        String minerAddress,
        Long rewardJack,
        Long feeRewardJack,
        Integer txCount,
        boolean isMainChain
    ) {
        return new Block(
            height,
            hash,
            prevHash,
            version,
            minedAt,
            miningElapsed,
            difficulty,
            nonce,
            minerAddress,
            rewardJack,
            feeRewardJack,
            txCount,
            isMainChain
        );
    }
}
