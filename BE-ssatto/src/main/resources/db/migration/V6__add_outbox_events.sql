-- Outbox 패턴: DB 저장과 MQ 발행의 원자성 보장을 위한 이벤트 대기열 테이블
CREATE TABLE outbox_events (
    id           UUID         PRIMARY KEY,
    event_type   VARCHAR(100) NOT NULL,
    routing_key  VARCHAR(200) NOT NULL,
    payload      TEXT         NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMP    NOT NULL,
    processed_at TIMESTAMP
);

-- PENDING 상태 레코드만 인덱싱 (OutboxDispatcher 조회 최적화)
CREATE INDEX idx_outbox_events_status_created
    ON outbox_events (status, created_at)
    WHERE status = 'PENDING';
