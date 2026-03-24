package ssatto.BE_ssatto.domain.learning.entity;

// [학습 프론트엔드 v2] 추가: 종합 리포트 엔티티

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "learning_report")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LearningReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "wallet_address", nullable = false, unique = true, length = 64)
    private String walletAddress;

    @Column(name = "security_score", nullable = false)
    private Integer securityScore;

    @Column(name = "transaction_score", nullable = false)
    private Integer transactionScore;

    @Column(name = "network_score", nullable = false)
    private Integer networkScore;

    @Column(name = "consensus_score", nullable = false)
    private Integer consensusScore;

    @Column(name = "token_economy_score", nullable = false)
    private Integer tokenEconomyScore;

    @Column(name = "fairness_score", nullable = false)
    private Integer fairnessScore;

    @Column(name = "overall_grade", length = 10)
    private String overallGrade;

    @Column(name = "total_time_ms", nullable = false)
    private Long totalTimeMs;

    @Column(name = "certificate_issued_at")
    private LocalDateTime certificateIssuedAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private LearningReport(String walletAddress) {
        this.walletAddress = walletAddress;
        this.securityScore = 0;
        this.transactionScore = 0;
        this.networkScore = 0;
        this.consensusScore = 0;
        this.tokenEconomyScore = 0;
        this.fairnessScore = 0;
        this.totalTimeMs = 0L;
        this.updatedAt = LocalDateTime.now();
    }

    public static LearningReport create(String walletAddress) {
        return new LearningReport(walletAddress);
    }

    public void updateScores(int security, int transaction, int network, int consensus,
                             int tokenEconomy, int fairness, long totalTimeMs) {
        this.securityScore = security;
        this.transactionScore = transaction;
        this.networkScore = network;
        this.consensusScore = consensus;
        this.tokenEconomyScore = tokenEconomy;
        this.fairnessScore = fairness;
        this.totalTimeMs = totalTimeMs;

        int avg = (security + transaction + network + consensus + tokenEconomy + fairness) / 6;
        this.overallGrade = avg >= 90 ? "GOLD" : avg >= 70 ? "SILVER" : "BRONZE";
        this.certificateIssuedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
