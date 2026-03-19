package ssatto.BE_ssatto.domain.ops.entity;

/**
 * 아웃박스 이벤트 처리 상태를 정의한다.
 */
public enum OutboxEventStatus {
    PENDING,
    PROCESSED,
    FAILED
}
