package ssatto.BE_ssatto.domain.blockchain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 블록체인 트랜잭션 인덱싱 결과를 저장하는 엔티티다.
 */
@Getter
@Entity
@Table(name = "\"transaction\"")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tx_id", nullable = false, unique = true, length = 64)
    private String txId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "block_id", nullable = false)
    private Block block;

    @Column(name = "tx_version", nullable = false)
    private Integer txVersion;

    @Column(name = "from_address", length = 64)
    private String fromAddress;

    @Column(name = "to_address", length = 64)
    private String toAddress;

    @Column(name = "jack_amount", nullable = false)
    private Long jackAmount;

    @Column(name = "pot_amount", nullable = false)
    private Long potAmount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private Transaction(
        String txId,
        Block block,
        Integer txVersion,
        String fromAddress,
        String toAddress,
        Long jackAmount,
        Long potAmount,
        LocalDateTime createdAt
    ) {
        this.txId = txId;
        this.block = block;
        this.txVersion = txVersion;
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.jackAmount = jackAmount;
        this.potAmount = potAmount;
        this.createdAt = createdAt;
    }

    /**
     * 트랜잭션 엔티티를 생성한다.
     *
     * @param txId 트랜잭션 해시
     * @param block 소속 블록
     * @param txVersion 트랜잭션 버전
     * @param fromAddress 발신 주소
     * @param toAddress 수신 주소
     * @param jackAmount JACK 금액
     * @param potAmount POT 금액
     * @param createdAt 생성 시각
     * @return 생성된 트랜잭션 엔티티
     */
    public static Transaction create(
        String txId,
        Block block,
        Integer txVersion,
        String fromAddress,
        String toAddress,
        Long jackAmount,
        Long potAmount,
        LocalDateTime createdAt
    ) {
        return new Transaction(txId, block, txVersion, fromAddress, toAddress, jackAmount, potAmount, createdAt);
    }
}
