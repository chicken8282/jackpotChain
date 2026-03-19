package ssatto.BE_ssatto.domain.ops.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Outbox 패턴용 이벤트를 저장하는 엔티티다.
 */
@Getter
@Entity
@Table(name = "outbox_events")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OutboxEvent {

    @Id
    private UUID id;

    @Column(name = "aggregate_type", nullable = false, length = 50)
    private String aggregateType;

    @Column(name = "aggregate_id", nullable = false, length = 100)
    private String aggregateId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Lob
    @Column(name = "payload", nullable = false)
    private String payload;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OutboxEventStatus status;

    @Column(name = "error_message", length = 500)
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    private OutboxEvent(
        UUID id,
        String aggregateType,
        String aggregateId,
        String eventType,
        String payload,
        OutboxEventStatus status,
        LocalDateTime createdAt
    ) {
        this.id = id;
        this.aggregateType = aggregateType;
        this.aggregateId = aggregateId;
        this.eventType = eventType;
        this.payload = payload;
        this.status = status;
        this.createdAt = createdAt == null ? LocalDateTime.now() : createdAt;
    }

    /**
     * 새 아웃박스 이벤트를 생성한다.
     *
     * @param aggregateType 집계 루트 유형
     * @param aggregateId 집계 루트 식별자
     * @param eventType 이벤트 유형
     * @param payload 직렬화된 이벤트 본문
     * @param status 초기 상태
     * @param createdAt 생성 시각
     * @return 생성된 아웃박스 이벤트
     */
    public static OutboxEvent create(
        String aggregateType,
        String aggregateId,
        String eventType,
        String payload,
        OutboxEventStatus status,
        LocalDateTime createdAt
    ) {
        return new OutboxEvent(UUID.randomUUID(), aggregateType, aggregateId, eventType, payload, status, createdAt);
    }

    /**
     * 이벤트를 처리 완료 상태로 전환한다.
     *
     * @param processedAt 처리 완료 시각
     * @return 상태가 갱신된 이벤트
     */
    public OutboxEvent markProcessed(LocalDateTime processedAt) {
        this.status = OutboxEventStatus.PROCESSED;
        this.processedAt = processedAt;
        this.errorMessage = null;
        return this;
    }

    /**
     * 이벤트를 실패 상태로 전환한다.
     *
     * @param errorMessage 실패 메시지
     * @return 상태가 갱신된 이벤트
     */
    public OutboxEvent markFailed(String errorMessage) {
        this.status = OutboxEventStatus.FAILED;
        this.errorMessage = errorMessage;
        return this;
    }
}
