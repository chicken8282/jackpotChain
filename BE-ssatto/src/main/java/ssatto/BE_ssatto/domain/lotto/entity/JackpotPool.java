package ssatto.BE_ssatto.domain.lotto.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 잭팟 풀 집계 캐시를 저장하는 단일 레코드 엔티티다.
 */
@Getter
@Entity
@Table(name = "jackpot_pool")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JackpotPool {

    @Id
    private Long id;

    @Column(name = "balance_jack", nullable = false)
    private Long balanceJack;

    @Column(name = "total_entries", nullable = false)
    private Long totalEntries;

    @Column(name = "total_winners", nullable = false)
    private Long totalWinners;

    @Column(name = "last_synced_height", nullable = false)
    private Long lastSyncedHeight;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    private JackpotPool(
        Long id,
        Long balanceJack,
        Long totalEntries,
        Long totalWinners,
        Long lastSyncedHeight,
        LocalDateTime updatedAt
    ) {
        this.id = id;
        this.balanceJack = balanceJack;
        this.totalEntries = totalEntries;
        this.totalWinners = totalWinners;
        this.lastSyncedHeight = lastSyncedHeight;
        this.updatedAt = updatedAt == null ? LocalDateTime.now() : updatedAt;
    }

    /**
     * 잭팟 풀 캐시 엔티티를 생성한다.
     *
     * @param id 단일 레코드 식별자
     * @param balanceJack 잭팟 잔액
     * @param totalEntries 누적 참여 수
     * @param totalWinners 누적 당첨 수
     * @param lastSyncedHeight 마지막 동기화 블록 높이
     * @param updatedAt 갱신 시각
     * @return 생성된 잭팟 풀 엔티티
     */
    public static JackpotPool create(
        Long id,
        Long balanceJack,
        Long totalEntries,
        Long totalWinners,
        Long lastSyncedHeight,
        LocalDateTime updatedAt
    ) {
        return new JackpotPool(id, balanceJack, totalEntries, totalWinners, lastSyncedHeight, updatedAt);
    }
}
