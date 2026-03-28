# rabbitmq-outbox — 2026-03-28

## Overview

Step 1(Exchange/Queue/Binding)에서 만든 RabbitMQ 인프라 위에
Outbox 패턴을 구현했다.

**목적:** 블록 동기화(DB 저장)와 MQ 발행 사이 서버 크래시가 발생해도
이벤트가 유실되지 않도록 원자성을 보장한다.

**동작 흐름:**
```
BlockchainSyncScheduler (5초)
  └─> syncToTip()
        └─> syncBlock(height)
              ├─ Block DB 저장 (신규일 때)
              └─ outbox_events INSERT (같은 트랜잭션)
                       ↓
              OutboxDispatcher (1초)
                └─ PENDING 조회 (top 100)
                └─ rabbitTemplate.convertAndSend(EXCHANGE, "spring.block.synced", payload)
                └─ status = PROCESSED / FAILED
```

---

## Changed Files

| 파일 | 유형 | 이유 |
|------|------|------|
| `BE-ssatto/src/main/resources/db/migration/V6__add_outbox_events.sql` | 신규 | outbox_events 테이블 + 부분 인덱스 |
| `.../domain/outbox/entity/OutboxEventStatus.java` | 신규 | PENDING/PROCESSED/FAILED enum |
| `.../domain/outbox/entity/OutboxEvent.java` | 신규 | JPA 엔티티, `blockSynced()` 팩토리, `markProcessed()` / `markFailed()` |
| `.../domain/outbox/repository/OutboxEventRepository.java` | 신규 | `findTop100ByStatusOrderByCreatedAtAsc` |
| `.../domain/outbox/service/OutboxDispatcher.java` | 신규 | `@Scheduled(fixedDelay=1000)` PENDING → MQ 발행 |
| `.../domain/blockchain/service/BlockchainReadModelSyncService.java` | 수정 | `OutboxEventRepository` 주입, `syncBlock()` 신규 블록 시 Outbox 저장 추가 |
| `.../global/config/RabbitMQConfig.java` | 수정 | `ops.spring.queue` + `spring.#` binding 추가 |

---

## Tests Run

```bash
# 1. 빌드
docker compose -f docker-compose.local.yml build --no-cache backend
# → BUILD SUCCESSFUL in 30s

# 2. 기동
docker compose -f docker-compose.local.yml up -d backend
docker inspect jc-backend-local --format '{{.State.Health.Status}}'
# → healthy

# 3. Flyway V6 마이그레이션 확인
docker exec jc-postgres-local psql -U jackpot -d jackpotchain -c "\d outbox_events"
# → 컬럼 7개 + 부분 인덱스 확인

# 4. ops.spring.queue 생성 확인
curl -s -u guest:guest http://localhost:15672/api/queues
# → ops.spring.queue | durable: True

# 5. OutboxDispatcher 동작 검증 (더미 이벤트 삽입)
INSERT INTO outbox_events VALUES (gen_random_uuid(), 'block.synced', 'spring.block.synced', '...', 'PENDING', NOW());
sleep 3
SELECT status, processed_at FROM outbox_events WHERE event_type='block.synced';
# → PROCESSED | 2026-03-28 14:33:39

# 6. ops.spring.queue 메시지 수신 확인
curl -s -u guest:guest http://localhost:15672/api/queues/%2F/ops.spring.queue
# → messages_ready: 1 (Consumer 없어 대기 중)
```

**통과:** 전체 6개 항목

---

## Failed / Unresolved

**새 블록 Outbox 실시간 검증 불가:**
- 노드가 4764번 블록을 채굴 중이었고 DB last_synced_height=4850으로 노드보다 높은 상태
- 노드가 DB 높이를 따라잡아야 신규 `isNew[0]=true` 경로가 실행됨
- 더미 INSERT로 Dispatcher 동작을 대신 검증했으며, 동작에는 이상 없음

**Consumer 미구현 (설계 범위):**
- `ops.spring.queue`에 메시지가 1건 쌓여 있으나 Consumer가 없어 소비되지 않음
- Step 5(Node Python) 이후에 `@RabbitListener`로 소비하는 구조는 별도 작업 예정

---

## Next Steps

**Step 5 (다음 작업) — Node Python 수정:**
- `blockchain/` 디렉토리의 `node.py` 또는 별도 `publisher.py`에서 블록 채굴/수신 시점에 `pika` 라이브러리로 `jackpotchain.events` Exchange에 `node.block.created` 이벤트 publish
- Spring 쪽 `@RabbitListener(queues = RabbitMQConfig.QUEUE_BLOCK_SYNC)`로 수신 후 `syncToTip()` 트리거 추가
- 현재 폴링 스케줄러(`BlockchainSyncScheduler`)는 MQ 누락 시 폴백으로 유지

**향후 개선:**
- FAILED 상태 이벤트 재처리 정책 (현재는 재시도 없음)
- Outbox 이력 정리 배치 (PROCESSED 레코드 주기적 삭제)
