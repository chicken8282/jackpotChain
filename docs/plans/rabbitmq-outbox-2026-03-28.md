# 수정 계획: RabbitMQ Step 2-3-4 — Outbox 패턴 구현

> 작성일: 2026-03-28

---

## 원인

Step 1에서 Exchange/Queue/Binding은 완성됐으나, Spring 내부에서 이벤트를
발행하거나 소비하는 코드가 없다. Outbox 패턴으로 DB 저장과 MQ 발행의
원자성을 보장해야 한다.

---

## 영향 레이어

| 레이어 | 파일 | 변경 |
|--------|------|------|
| DB | `V6__add_outbox_events.sql` | 신규 |
| 엔티티 | `domain/outbox/entity/OutboxEvent.java` | 신규 |
| 엔티티 | `domain/outbox/entity/OutboxEventStatus.java` | 신규 (enum) |
| Repository | `domain/outbox/repository/OutboxEventRepository.java` | 신규 |
| 서비스 | `domain/outbox/service/OutboxDispatcher.java` | 신규 |
| 서비스 | `BlockchainReadModelSyncService.java` | outboxEventRepository 주입 + syncBlock() 수정 |
| 설정 | `RabbitMQConfig.java` | ops.spring.queue + spring.# binding 추가 |

---

## 변경 범위 상세

### V6 마이그레이션
```sql
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    routing_key VARCHAR(200) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP
);
CREATE INDEX idx_outbox_events_status_created
    ON outbox_events(status, created_at)
    WHERE status = 'PENDING';
```

### OutboxEvent 팩토리 메서드
```java
OutboxEvent.blockSynced(height, hash)
  → event_type = "block.synced"
  → routing_key = "spring.block.synced"
  → payload = {"height": N, "hash": "..."}
```

### OutboxDispatcher 동작
```
@Scheduled(fixedDelay = 1000)
1. findTop100ByStatusOrderByCreatedAtAsc(PENDING) 조회
2. 각 이벤트 → rabbitTemplate.convertAndSend(EXCHANGE, routingKey, payload)
3. 성공: status = PROCESSED, processedAt = now()
4. 실패: status = FAILED, 로그 ERROR
```

### syncBlock() 수정 포인트
```java
// 신규 블록인 경우에만 Outbox 이벤트 저장
boolean[] isNew = {false};
Block block = blockRepository.findByHeight(height)
    .orElseGet(() -> {
        isNew[0] = true;
        return blockRepository.save(Block.create(...));
    });

if (isNew[0]) {
    outboxEventRepository.save(OutboxEvent.blockSynced(block.getHeight(), block.getHash()));
}
```

---

## 실패 가능 지점

| 지점 | 원인 | 대응 |
|------|------|------|
| Flyway 마이그레이션 실패 | V6 스크립트 오류 또는 기존 테이블 충돌 | 컨테이너 로그에서 Flyway 오류 확인 |
| Dispatcher 발행 실패 | RabbitMQ 연결 끊김 | FAILED 마킹 후 다음 주기 재시도 없음 (이번 단계) |
| N+1 쿼리 | OutboxDispatcher가 1초마다 PENDING 전체 조회 | Top 100 제한으로 방지 |
| syncBlock 중복 Outbox | 이미 저장된 블록에 대해 Outbox 저장 | isNew 플래그로 방지 |
| RabbitMQConfig Bean 충돌 | spring.queue 추가 시 이름 중복 | 기존 Bean 이름과 다르게 유지 |
