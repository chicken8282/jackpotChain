package ssatto.BE_ssatto.domain.wallet.entity;

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
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import ssatto.BE_ssatto.domain.blockchain.entity.Transaction;

import java.time.LocalDateTime;

/**
 * 지갑 활동 이력을 저장하는 엔티티다.
 */
@Getter
@Entity
@Table(name = "wallet_activity")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WalletActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "wallet_address", referencedColumnName = "address", nullable = false)
    private Wallet wallet;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private WalletActivityType type;

    @Column(name = "description", nullable = false, length = 200)
    private String description;

    @Column(name = "jack_amount")
    private Long jackAmount;

    @Column(name = "pot_amount")
    private Long potAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tx_id", referencedColumnName = "tx_id")
    private Transaction transaction;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private WalletActivity(
        Wallet wallet,
        WalletActivityType type,
        String description,
        Long jackAmount,
        Long potAmount,
        Transaction transaction,
        LocalDateTime createdAt
    ) {
        this.wallet = wallet;
        this.type = type;
        this.description = description;
        this.jackAmount = jackAmount;
        this.potAmount = potAmount;
        this.transaction = transaction;
        this.createdAt = createdAt == null ? LocalDateTime.now() : createdAt;
    }

    /**
     * 지갑 활동 이력을 생성한다.
     *
     * @param wallet 지갑
     * @param type 활동 유형
     * @param description 활동 설명
     * @param jackAmount JACK 변화량
     * @param potAmount POT 변화량
     * @param transaction 연관 트랜잭션
     * @param createdAt 생성 시각
     * @return 생성된 지갑 활동 엔티티
     */
    public static WalletActivity create(
        Wallet wallet,
        WalletActivityType type,
        String description,
        Long jackAmount,
        Long potAmount,
        Transaction transaction,
        LocalDateTime createdAt
    ) {
        return new WalletActivity(wallet, type, description, jackAmount, potAmount, transaction, createdAt);
    }
}
