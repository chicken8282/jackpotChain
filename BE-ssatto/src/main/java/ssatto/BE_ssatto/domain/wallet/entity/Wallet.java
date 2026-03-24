package ssatto.BE_ssatto.domain.wallet.entity;

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
 * 지갑 메타데이터를 저장하는 엔티티다.
 */
@Getter
@Entity
@Table(name = "wallet")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "address", nullable = false, unique = true, length = 64)
    private String address;

    @Column(name = "nickname", length = 50)
    private String nickname;

    @Column(name = "wallet_color", nullable = false, length = 20)
    private String walletColor;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "onboarding_reward_granted", nullable = false)
    private boolean onboardingRewardGranted;

    @Column(name = "onboarding_reward_tx_id", length = 64)
    private String onboardingRewardTxId;

    @Column(name = "onboarding_reward_granted_at")
    private LocalDateTime onboardingRewardGrantedAt;

    private Wallet(
        String address,
        String nickname,
        String walletColor,
        LocalDateTime createdAt,
        boolean onboardingRewardGranted,
        String onboardingRewardTxId,
        LocalDateTime onboardingRewardGrantedAt
    ) {
        this.address = address;
        this.nickname = nickname;
        this.walletColor = walletColor == null ? "DEFAULT" : walletColor;
        this.createdAt = createdAt == null ? LocalDateTime.now() : createdAt;
        this.onboardingRewardGranted = onboardingRewardGranted;
        this.onboardingRewardTxId = onboardingRewardTxId;
        this.onboardingRewardGrantedAt = onboardingRewardGrantedAt;
    }

    /**
     * 지갑 메타데이터를 생성한다.
     *
     * @param address 지갑 주소
     * @param nickname 지갑 별칭
     * @param walletColor 지갑 색상 식별자
     * @param createdAt 생성 시각
     * @return 생성된 지갑 엔티티
     */
    public static Wallet create(String address, String nickname, String walletColor, LocalDateTime createdAt) {
        return new Wallet(address, nickname, walletColor, createdAt, false, null, null);
    }

    /**
     * onboarding POT 지급 완료 상태를 반영한다.
     *
     * @param txId 지급 트랜잭션 ID
     * @param grantedAt 지급 완료 시각
     */
    public void markOnboardingRewardGranted(String txId, LocalDateTime grantedAt) {
        this.onboardingRewardGranted = true;
        this.onboardingRewardTxId = txId;
        this.onboardingRewardGrantedAt = grantedAt == null ? LocalDateTime.now() : grantedAt;
    }
}
