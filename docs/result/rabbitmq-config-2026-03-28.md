# rabbitmq-config — 2026-03-28

## Overview

RabbitMQ 인프라(컨테이너, AMQP 의존성, yml 설정)는 이미 갖춰져 있었으나
Exchange/Queue/Binding을 정의하는 `@Configuration` 클래스가 없어서
실제 메시지를 발행하거나 소비할 수 없는 상태였다.

이번 작업(Step 1)에서는 Spring 쪽 RabbitMQ 설정만 완성한다.
아키텍처 문서 §7에 명시된 설계를 기준으로:
- Topic Exchange `jackpotchain.events` 1개
- Queue 3개 (block.sync.queue / block.sync.queue.dlq / ops.node.queue)
- Binding 2개 (node.block.created → block.sync, node.# → ops.node)
- `Jackson2JsonMessageConverter` + `RabbitTemplate`

Step 2-4(Outbox Consumer)와 Step 5(Node Python 발행)를 위한 인프라 기반을 마련하는 것이 목적이다.

---

## Changed Files

| 파일 | 유형 | 이유 |
|------|------|------|
| `BE-ssatto/src/main/java/.../global/config/RabbitMQConfig.java` | 신규 생성 | Exchange/Queue/Binding/MessageConverter 정의 |
| `BE-ssatto/src/main/resources/application.yml` | 수정 | `management.health.rabbit.enabled: false → true` |

---

## Tests Run

```bash
# 1. 이미지 강제 재빌드
docker compose -f docker-compose.local.yml build --no-cache backend

# 2. 백엔드 재시작
docker compose -f docker-compose.local.yml up -d backend

# 3. 헬스 체크
docker inspect jc-backend-local --format '{{.State.Health.Status}}'
# → healthy

# 4. 백엔드 로그로 RabbitMQ 연결 확인
docker logs jc-backend-local | grep -i "rabbit"
# → Created new connection: rabbitConnectionFactory ... amqp://guest@172.19.0.2:5672/

# 5. RabbitMQ Management API 검증
curl -s -u guest:guest http://localhost:15672/api/exchanges/%2F/jackpotchain.events
# → Exchange: jackpotchain.events | type: topic | durable: True

curl -s -u guest:guest http://localhost:15672/api/queues
# → block.sync.queue | durable: True
# → block.sync.queue.dlq | durable: True
# → ops.node.queue | durable: True

curl -s -u guest:guest http://localhost:15672/api/bindings/%2F/e/jackpotchain.events/q/block.sync.queue
# → routing_key: node.block.created

curl -s -u guest:guest http://localhost:15672/api/bindings/%2F/e/jackpotchain.events/q/ops.node.queue
# → routing_key: node.#
```

**결과:** 전체 통과 (Exchange 1개, Queue 3개, Binding 2개 모두 정상 생성 확인)

---

## Failed / Unresolved

없음.

> 첫 번째 빌드 시 Docker 디스크 공간 부족(`no space left on device`) 오류 발생.
> `docker image prune -f`로 해소 후 `--no-cache` 재빌드로 정상 완료.

---

## Next Steps

**Step 2-3-4 (다음 작업):**

1. `OutboxEvent` 엔티티 + `OutboxEventRepository` 생성 (Flyway 마이그레이션 포함)
2. `OutboxDispatcher` — `@Scheduled(fixedDelay=1000)` 으로 PENDING 레코드를 `RabbitTemplate`으로 발행
3. `BlockchainReadModelSyncService.syncBlock()` 내부에서 블록 동기화와 같은 트랜잭션으로 `outboxRepository.save()` 추가

**참고:**
- `RabbitMQConfig.EXCHANGE`, `ROUTING_BLOCK_CREATED`, `QUEUE_BLOCK_SYNC` 상수를 Consumer/Dispatcher에서 import해서 사용
- Dispatcher에서 발행할 때: `rabbitTemplate.convertAndSend(EXCHANGE, ROUTING_BLOCK_CREATED, payload)`
- Consumer에서 수신할 때: `@RabbitListener(queues = RabbitMQConfig.QUEUE_BLOCK_SYNC)`
