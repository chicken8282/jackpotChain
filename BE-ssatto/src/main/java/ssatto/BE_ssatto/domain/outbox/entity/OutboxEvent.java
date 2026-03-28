package ssatto.BE_ssatto.domain.outbox.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Outbox 패턴 이벤트 엔티티.
 *
 * <p>비즈니스 로직과 동일한 트랜잭션에서 저장되어,
 * DB 커밋과 MQ 발행 사이 서버 다운 시에도 이벤트 유실을 방지한다.
 *
 * <p>OutboxDispatcher가 PENDING 레코드를 주기적으로 조회해 RabbitMQ에 발행한 후
 * PROCESSED로 마킹한다.
 */
@Entity
@Table(name = "outbox_events")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OutboxEvent {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    /** RabbitMQ 라우팅 키 (예: "spring.block.synced") */
    @Column(name = "routing_key", nullable = false, length = 200)
    private String routingKey;

    /** JSON 직렬화된 이벤트 페이로드 */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OutboxEventStatus status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    private OutboxEvent(String eventType, String routingKey, String payload) {
        this.id = UUID.randomUUID();
        this.eventType = eventType;
        this.routingKey = routingKey;
        this.payload = payload;
        this.status = OutboxEventStatus.PENDING;
        this.createdAt = LocalDateTime.now();
    }

    /**
     * 블록 동기화 완료 이벤트를 생성한다.
     *
     * @param height 동기화된 블록 높이
     * @param hash   동기화된 블록 해시
     */
    public static OutboxEvent blockSynced(long height, String hash) {
        String payload = String.format("{\"height\":%d,\"hash\":\"%s\"}", height, hash);
        return new OutboxEvent("block.synced", "spring.block.synced", payload);
    }

    /** Dispatcher가 MQ 발행 성공 후 호출한다. */
    public void markProcessed() {
        this.status = OutboxEventStatus.PROCESSED;
        this.processedAt = LocalDateTime.now();
    }

    /** Dispatcher가 MQ 발행 실패 후 호출한다. */
    public void markFailed() {
        this.status = OutboxEventStatus.FAILED;
    }
}
