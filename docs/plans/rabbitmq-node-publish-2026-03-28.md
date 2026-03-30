# rabbitmq-node-publish — 2026-03-28

## 목적

블록체인 노드(Python)가 새 블록을 채굴하거나 피어로부터 수신할 때
`jackpotchain.events` Exchange에 `node.block.created` 이벤트를 publish하여
Spring 백엔드가 폴링 없이 실시간으로 `syncToTip()`을 트리거할 수 있도록 한다.

기존 `BlockchainSyncScheduler`(5초 폴링)는 MQ 누락 시 폴백으로 그대로 유지한다.

---

## 변경 범위

### blockchain/ (Python) — LOW RISK (cli/main.py, requirements.txt, entrypoint.sh)

| 파일 | 유형 | 내용 |
|------|------|------|
| `requirements.txt` | 수정 | `pika>=1.3.0` 추가 |
| `cli/main.py` | 수정 | `--rabbitmq-*` CLI 인수 4개 추가, `publish_block_event()` 헬퍼 추가, `mining_task`·`on_block_received` 두 곳에서 호출 |
| `entrypoint.sh` | 수정 | 환경변수 `RABBITMQ_*`를 CLI 인수로 전달 |

### BE-ssatto/ (Spring) — 신규 파일

| 파일 | 유형 | 내용 |
|------|------|------|
| `domain/blockchain/service/BlockSyncListener.java` | 신규 | `@RabbitListener(queues = QUEUE_BLOCK_SYNC)` → `syncService.syncToTip()` |

---

## 상세 설계

### 1. `publish_block_event()` (Python)

```
pika.BlockingConnection (sync) 사용
  - connection_attempts=1, socket_timeout=2 (빠른 실패)
  - exchange='jackpotchain.events'
  - routing_key='node.block.created'
  - body=JSON {"height": N, "hash": "..."}
  - delivery_mode=2 (persistent)
  - 실패 시 print 후 예외 무시 (노드 동작에 영향 없음)
```

`on_block_received`(sync) → 직접 호출
`mining_task`(async) → `asyncio.get_event_loop().run_in_executor(None, ...)` 로 논블로킹 호출

### 2. CLI 인수

```
--rabbitmq-host      default: localhost
--rabbitmq-port      default: 5672
--rabbitmq-user      default: guest
--rabbitmq-password  default: guest
```

### 3. `entrypoint.sh` 환경변수

```sh
RABBITMQ_HOST="${RABBITMQ_HOST:-localhost}"
RABBITMQ_PORT="${RABBITMQ_PORT:-5672}"
RABBITMQ_USER="${RABBITMQ_USER:-guest}"
RABBITMQ_PASSWORD="${RABBITMQ_PASSWORD:-guest}"
```
→ `--rabbitmq-host`, `--rabbitmq-port`, `--rabbitmq-user`, `--rabbitmq-password` 로 전달

### 4. `BlockSyncListener.java`

- `@Component` + `@RabbitListener(queues = RabbitMQConfig.QUEUE_BLOCK_SYNC)`
- 수신 즉시 `syncService.syncToTip()` 호출
- 예외 발생 시 Spring AMQP가 자동으로 DLQ(`block.sync.queue.dlq`)로 라우팅

---

## 위험 평가

- `consensus/`, `network/node.py` 등 HIGH RISK 파일 **미수정**
- `cli/main.py` 변경은 CLI 인수 추가만 — 기존 기본값 전부 유지
- `publish_block_event()` 실패는 전파하지 않으므로 노드 안정성에 영향 없음
- Spring Listener는 이미 존재하는 `block.sync.queue`를 소비하므로 인프라 변경 없음

---

## 검증 계획

1. `docker compose build --no-cache jackpotchain-node` → BUILD SUCCESSFUL
2. `docker compose up -d` → 모든 서비스 healthy
3. 노드가 새 블록 채굴/수신 시 로그에 `[RabbitMQ] 발행 완료` 출력
4. Spring 로그에 `[BlockSyncListener] syncToTip 트리거` 출력
5. `block.sync.queue` 메시지 수 증가 후 즉시 감소 (Consumer가 소비)
