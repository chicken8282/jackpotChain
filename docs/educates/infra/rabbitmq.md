# RabbitMQ — 메시지 큐로 Node와 Backend를 분리하는 이유

> 작성일: 2026-03-26
> 기준: `docker-compose.local.yml`, `docker-compose.prod.yml`, `application-local.yml`, `docs/studies/rabbitmq.md`

---

## 1. 문제: 블록체인 이벤트를 동기로 처리하면 무슨 일이 생기는가

JackpotChain Node는 새 블록이 생성될 때마다 Backend에게 알려야 한다. 가장 단순한 방법은 Node가 Backend의 웹훅 엔드포인트를 직접 HTTP로 호출하는 것이다.

```
JackpotChain Node → POST /internal/webhook/block → Spring Backend
                              (동기 HTTP)
```

이 구조에는 세 가지 문제가 있다.

**첫째, Backend가 느리거나 다운되면 Node가 막힌다.** Node가 HTTP 요청을 보낸 뒤 응답을 기다리는 동안 다음 블록 처리가 지연된다. Backend 재시작 중이라면 Node의 웹훅이 실패해 해당 블록 이벤트가 유실된다.

**둘째, 결합도가 높다.** Node는 Backend의 URL, 포트, 엔드포인트 경로를 알아야 한다. Backend 주소가 바뀌면 Node도 바꿔야 한다.

**셋째, 처리량 조절이 불가능하다.** 블록이 연속으로 빠르게 생성되면 Node가 Backend에 웹훅을 연속으로 쏜다. Backend의 처리 속도보다 이벤트 발생 속도가 빠르면 Backend가 과부하된다.

메시지 큐는 이 세 문제를 한 번에 해결한다.

```
Node → [RabbitMQ] ← Spring Backend (소비)
         (비동기)
```

Node는 이벤트를 큐에 던지고 끝이다. Backend가 언제 어떻게 처리하는지 알 필요 없다. Backend가 느려도 이벤트는 큐에 쌓여 기다린다. Backend가 재시작되면 큐에서 이어서 소비한다.

---

## 2. RabbitMQ 핵심 구조

> **AMQP(Advanced Message Queuing Protocol):** 메시지 큐 시스템을 위한 표준 프로토콜. RabbitMQ가 구현하는 프로토콜로, Producer-Exchange-Queue-Consumer 모델을 정의한다. 기본 포트는 5672(AMQP 통신), 15672(Management UI).

```
Producer ──publish──▶  Exchange ──routing──▶  Queue ──deliver──▶  Consumer
                           │
                       Binding Key
                       (라우팅 규칙)
```

**Exchange**는 메시지를 받아 어느 Queue로 보낼지 결정하는 라우터다. 우체국 분류소에 해당한다.

**Queue**는 메시지가 실제로 쌓이는 버퍼다. Consumer가 소비하기 전까지 보관한다.

**Binding**은 Exchange와 Queue를 연결하는 규칙이다. Routing Key를 기준으로 어떤 메시지가 어느 Queue로 가는지 정의한다.

### Exchange 타입

이 프로젝트는 Topic Exchange를 사용한다.

> **Topic Exchange:** Routing Key를 패턴 매칭으로 라우팅하는 Exchange 타입. `*`는 단어 하나, `#`은 0개 이상의 단어를 대체한다. `node.block.created` 메시지를 `node.#` 패턴과 `node.block.*` 패턴이 동시에 매칭할 수 있어, 하나의 이벤트를 여러 Queue에 복사 전달하는 Pub/Sub이 가능하다.

```
routing_key: "node.block.created"
    ├─ "node.#"      매칭 → ops.node.queue (운영 로그 적재)
    └─ "node.block.*" 매칭 → monitoring.queue (모니터링)
```

같은 이벤트를 여러 Consumer가 각자의 목적으로 처리할 수 있다.

---

## 3. Webhook without Queue — 웹훅만 쓰면 놓치는 블록이 생긴다

RabbitMQ 없이 Node → Backend 직접 HTTP 웹훅만 쓸 때 구체적으로 무슨 일이 생기는지 보자.

```
시나리오: 새 블록 생성 → Node가 Backend에 웹훅 호출

정상: Node POST → Backend 처리 완료 → 200 OK → Node 계속 진행
장애: Node POST → Backend 배포 중(502) → 재시도 없음 → 블록 이벤트 유실
```

Blue/Green 배포 전환 순간, 구 컨테이너가 내려가고 신 컨테이너가 헬스체크를 통과하기 전 약 30초의 공백이 있다. 이 30초 동안 생성된 블록의 이벤트는 아무도 받지 못한다.

RabbitMQ를 사이에 두면 이 공백 동안 이벤트가 Queue에 쌓인다. Backend가 재기동되면 Queue에서 순서대로 소비해 하나도 빠뜨리지 않는다.

---

## 4. Transactional Outbox 패턴

> **Transactional Outbox 패턴:** 메시지를 큐에 직접 발행하는 대신, 동일한 DB 트랜잭션 안에서 `outbox` 테이블에 저장한 뒤, 별도 프로세스가 이 테이블을 읽어 큐에 발행하는 패턴. 비즈니스 로직과 메시지 발행의 원자성을 보장한다.

**문제**: Lotto Commit 처리 중 DB 저장은 성공했는데 RabbitMQ 발행 직전에 서버가 크래시하면?

```
// 위험한 방법
@Transactional
public void commit(request) {
    lottoRepository.save(entry);    // DB 저장 성공
    rabbitTemplate.send(event);     // 크래시 → 메시지 미발행
}
```

DB에는 데이터가 있는데 큐에는 이벤트가 없는 불일치가 생긴다.

Outbox 패턴은 이를 해결한다.

```
// Outbox 패턴
@Transactional
public void commit(request) {
    lottoRepository.save(entry);          // 비즈니스 로직
    outboxRepository.save(OutboxEvent     // 같은 트랜잭션에서 저장
        .of("lotto.commit", payload));
}
// 트랜잭션 커밋: 둘 다 저장 or 둘 다 롤백 (원자성 보장)

// 별도 스케줄러/폴러
@Scheduled(fixedDelay = 1000)
public void publishPendingEvents() {
    outboxRepository.findUnpublished().forEach(event -> {
        rabbitTemplate.send(event.toMessage());
        event.markPublished();
    });
}
```

**핵심**: DB 저장과 이벤트 저장이 같은 트랜잭션이다. 크래시가 나면 둘 다 롤백된다. 이벤트가 Outbox에 있으면 반드시 큐에 발행된다.

> **At-Least-Once Delivery(최소 1회 전달):** 메시지가 반드시 한 번 이상 전달됨을 보장하는 전달 보증 수준. 네트워크 장애나 ack 유실 시 재전송이 발생해 중복 처리가 생길 수 있다. Consumer가 멱등성(같은 메시지를 여러 번 처리해도 결과가 동일)을 갖춰야 완전한 안전이 보장된다.

---

## 5. Exchange → Queue → Consumer 흐름 (이 프로젝트)

`docs/studies/rabbitmq.md`에 설계된 구조다.

```
JackpotChain Node
    │  routing_key: "node.block.created"
    │               "node.peer.drop"
    │               "node.mempool.spike"
    ▼
Exchange: jackpotchain.events (topic)
    │
    ├─ "node.#"     binding ──▶  ops.node.queue
    │                               └──▶ Spring Consumer
    │                                      ├─ DB 로그 적재
    │                                      └─ 모니터링 알림
    │
    └─ "spring.#"   binding ──▶  ops.spring.queue
                                    └──▶ Spring Consumer
                                           └─ RPC 실패 적재

DLQ: dlq.ops.events (처리 실패 메시지 격리)
```

**`durable: true`** Queue는 RabbitMQ 재시작 후에도 존재한다.
**`persistent` 메시지**는 RabbitMQ 재시작 후에도 Queue에 남아 있다.
둘 다 설정해야 메시지 영속성이 보장된다.

```yaml
# application-local.yml
spring:
  rabbitmq:
    host: ${SPRING_RABBITMQ_HOST:localhost}
    port: ${SPRING_RABBITMQ_PORT:5672}
    username: ${SPRING_RABBITMQ_USERNAME:guest}
    password: ${SPRING_RABBITMQ_PASSWORD:guest}
    listener:
      simple:
        prefetch: 1  # Consumer 1개당 동시에 1개만 처리
```

---

## 6. 메시지 확인(Ack)과 Manual Ack

> **Acknowledgment(Ack):** Consumer가 메시지를 정상적으로 처리했음을 RabbitMQ에 알리는 신호. Ack를 받기 전까지 RabbitMQ는 해당 메시지를 "미완료" 상태로 유지한다. Consumer가 Ack 없이 죽으면 RabbitMQ는 해당 메시지를 다른 Consumer에게 재전달한다.

| Ack 모드 | 동작 | 위험 |
|---------|------|------|
| `AUTO` (기본) | 메시지 수신 즉시 자동 Ack | Consumer가 처리 도중 죽으면 메시지 유실 |
| `MANUAL` | 코드에서 직접 `basicAck`/`basicNack` 호출 | 처리 완료 후에만 Ack → 재처리 보장 |
| `NONE` | Ack 없음 (fire-and-forget) | 최고 성능, 유실 허용 시에만 |

이 프로젝트의 운영 이벤트 큐는 **MANUAL Ack**를 사용한다. DB 로그 적재가 완료된 후에만 Ack를 보낸다. 처리 중 서버가 재시작되면 Ack 없는 메시지가 Queue로 돌아와 재처리된다.

```java
@RabbitListener(queues = "ops.events.queue")
public void handleOpsEvent(Message message, Channel channel) throws IOException {
    try {
        processEvent(message);
        // DB 적재 완료 후 Ack
        channel.basicAck(message.getMessageProperties().getDeliveryTag(), false);
    } catch (Exception e) {
        // 처리 실패 → requeue=false → DLQ로 이동
        channel.basicNack(message.getMessageProperties().getDeliveryTag(), false, false);
    }
}
```

**`prefetch: 1`의 이유**: Consumer가 이전 메시지를 처리하는 동안 다음 메시지를 미리 받아두면 느린 Consumer에게 메시지가 몰린다. prefetch: 1이면 Ack 후에만 다음 메시지를 받아 공정한 분배가 이루어진다.

---

## 7. Dead Letter Queue — 실패 메시지 격리

> **Dead Letter Queue(DLQ):** 정상 처리에 실패한 메시지를 보내는 격리 큐. nack + requeue=false, TTL 초과, 큐 길이 초과 세 가지 조건 중 하나가 트리거된다. DLQ에 들어간 메시지는 소비되지 않고 대기하므로 운영자가 확인 후 수동으로 재처리하거나 폐기할 수 있다.

단순히 `nack + requeue=true`를 주면 처리 불가 메시지가 Queue 앞으로 돌아와 무한 순환한다.

```
Queue: [실패메시지] → Consumer → nack+requeue → [실패메시지] → Consumer → ...
```

정상 메시지가 차단되고 Consumer가 폭주한다. DLQ 설정이 이를 방지한다.

```java
@Bean
Queue opsEventsQueue() {
    return QueueBuilder.durable("ops.events.queue")
        .withArgument("x-dead-letter-exchange", "dlx")        // DLX 지정
        .withArgument("x-dead-letter-routing-key", "dlq.ops") // DLQ 라우팅 키
        .withArgument("x-message-ttl", 60000)                  // 60초 내 미처리 시 DLQ
        .build();
}

@Bean
Queue deadLetterQueue() {
    return QueueBuilder.durable("dlq.ops").build();
}
```

**재시도 전략 (지수 백오프)**:

```
메시지 수신 → 처리 실패
    → 1초 후 재시도 (1회)
    → 2초 후 재시도 (2회)
    → 4초 후 재시도 (3회)
    → 모두 실패 → nack + requeue=false → DLQ 이동
```

DLQ에 쌓인 메시지는 Management UI(15672 포트)에서 확인하고 수동으로 재투입하거나 폐기한다.

---

## 8. RabbitMQ vs Kafka — 이 프로젝트에서 Kafka를 선택하지 않은 이유

| 항목 | RabbitMQ | Kafka |
|------|----------|-------|
| 메시지 라우팅 | Exchange 타입으로 복잡한 라우팅 | 토픽/파티션만, 라우팅 직접 구현 |
| 전달 보장 | ack 기반 | offset 기반 |
| 재시도/DLQ | 기본 지원 | 직접 구현 필요 |
| 운영 복잡도 | 낮음 (단일 컨테이너) | 높음 (ZooKeeper 또는 KRaft 클러스터) |
| 처리량 | 중간 (~50k msg/s) | 매우 높음 (수백만 msg/s) |
| Management UI | 기본 내장 | 별도 도구 필요 |
| 메시지 보관 | 소비 후 삭제 | 설정 기간 보관, 리플레이 가능 |

**Kafka가 필요한 상황**: 초당 수십만 건 이상의 이벤트, 장기간 이벤트 보관 및 리플레이(감사 로그, 이벤트 소싱), 여러 Consumer Group이 독립적으로 오프셋을 관리해야 할 때.

이 프로젝트의 이벤트 규모는 블록 생성 이벤트다. 블록은 수십 초에 한 번 생성된다. 초당 수십 건 수준의 이벤트다. Kafka를 위해 ZooKeeper/KRaft 클러스터를 운영하는 것은 과도한 인프라 투자다.

RabbitMQ는 단일 컨테이너로 Management UI까지 내장해 운영이 단순하고, Exchange를 통한 라우팅이 이 프로젝트의 이벤트 분기 요구사항을 충분히 충족한다.

`docker-compose.local.yml`과 `docker-compose.prod.yml`의 RabbitMQ 설정이다.

```yaml
# docker-compose.prod.yml
rabbitmq:
  image: rabbitmq:3-management-alpine
  container_name: jc-rabbitmq-prod
  restart: unless-stopped
  networks:
    - prod-net
  environment:
    RABBITMQ_DEFAULT_USER: ${RABBITMQ_USERNAME}
    RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
  volumes:
    - rabbitmq-prod-data:/var/lib/rabbitmq
  healthcheck:
    test: ["CMD", "rabbitmq-diagnostics", "ping"]
    interval: 15s
    timeout: 5s
    retries: 5
```

`rabbitmq-prod-data` 볼륨이 Queue 정의와 미처리 메시지를 디스크에 보존한다. RabbitMQ가 재시작돼도 durable Queue와 persistent 메시지는 유지된다.

---

## 9. Redis Pub/Sub을 선택하지 않은 이유

Redis가 이미 프로젝트에 있으므로 추가 인프라 없이 Redis Pub/Sub을 쓸 수도 있다. 그러나 치명적 제약이 있다.

**메시지 영속성이 없다.** Consumer(Backend)가 오프라인 상태일 때 발행된 메시지는 아무도 받지 않고 사라진다. RPC 실패 로그, 블록 이벤트 같은 운영 데이터는 유실되면 안 된다.

**ack/nack 개념이 없다.** 처리 실패를 감지할 수 없어 DLQ 구현이 불가능하다.

Redis Pub/Sub이 적합한 상황: 실시간 알림, 유실을 허용하는 브로드캐스트 이벤트(예: 채팅 메시지, 실시간 점수판).

---

## 면접 Q&A

**Q1. At-Least-Once Delivery와 Exactly-Once Delivery의 차이는? RabbitMQ는 어느 수준을 보장하는가?**

At-Least-Once는 메시지가 최소 한 번 전달됨을 보장한다. 네트워크 장애나 Consumer가 Ack를 보내기 전에 죽으면 RabbitMQ가 메시지를 재전달하므로 중복이 생길 수 있다.

Exactly-Once는 정확히 한 번만 전달됨을 보장한다. 이론적으로 Producer에서의 중복 발행 방지 + RabbitMQ 내부 중복 제거 + Consumer에서의 중복 처리 방지가 모두 보장돼야 한다. 구현이 매우 복잡하고 성능 비용이 크다.

RabbitMQ는 `durable Queue + persistent 메시지 + MANUAL Ack` 조합으로 At-Least-Once를 보장한다. Exactly-Once를 보장하지 않는다. 따라서 Consumer는 멱등성을 구현해야 한다. 같은 블록 이벤트가 두 번 도착해도 DB에 중복 레코드가 생기지 않도록 `ON CONFLICT DO NOTHING` 또는 `txId`로 중복 체크를 한다.

---

**Q2. Transactional Outbox 패턴이 왜 필요한가? 없으면 어떤 상황이 생기는가?**

DB 저장과 큐 발행은 별개의 원자적 작업이다. 다음 두 가지 장애 케이스를 생각해보자.

케이스 1: DB 저장 성공 → 큐 발행 직전 크래시 → DB에는 데이터 있음, 큐에는 이벤트 없음. Consumer는 이 이벤트를 영원히 처리하지 않는다.

케이스 2: 큐 발행 성공 → DB 저장 실패 → 롤백 → DB에는 데이터 없음, 큐에는 이벤트 있음. Consumer가 존재하지 않는 데이터를 처리하려다 오류가 난다.

Outbox 패턴은 "이벤트 저장을 비즈니스 DB 트랜잭션에 포함"시켜 이를 해결한다. DB 트랜잭션이 커밋되면 반드시 Outbox에 이벤트가 있고, 별도 폴러가 이를 큐에 발행한다. DB가 커밋되면 최소 1회 발행이 보장된다.

---

**Q3. DLQ의 목적은 무엇인가? DLQ 없이 nack + requeue=true를 쓰면 어떻게 되는가?**

DLQ는 처리 불가 메시지를 격리하는 안전장치다. 포맷이 잘못됐거나 처리 로직 버그로 인해 영원히 실패하는 메시지가 있을 때, 이 메시지를 무한 재시도하면 정상 메시지 처리를 막는다.

`nack + requeue=true`는 실패한 메시지를 즉시 Queue 앞으로 되돌린다. 처리 불가 메시지가 하나 있으면 Consumer는 이 메시지만 계속 꺼내 실패하고 되돌리기를 반복한다. 정상 메시지는 뒤에서 대기한다. Consumer가 CPU를 낭비하며 폭주한다.

DLQ를 연결하면 `nack + requeue=false` 후 RabbitMQ가 해당 메시지를 DLX(Dead Letter Exchange)로 라우팅해 DLQ에 보낸다. 정상 Queue는 막히지 않고, 운영자는 나중에 DLQ를 확인해 원인을 파악하고 수동으로 재처리하거나 폐기한다.

---

**Q4. AMQP와 Kafka의 근본적인 차이는? 어떤 상황에 어느 것을 선택하는가?**

AMQP(RabbitMQ)는 "메시지 소비 후 삭제" 모델이다. Consumer가 메시지를 Ack하면 Queue에서 제거된다. 메시지의 라이프사이클이 짧고, Exchange를 통한 복잡한 라우팅이 가능하다. 작업 큐(Task Queue), 요청-응답 패턴, 복잡한 이벤트 분기에 적합하다.

Kafka는 "로그 스트리밍" 모델이다. 메시지(레코드)가 Consumer에게 전달돼도 설정 기간 동안 디스크에 보관된다. Consumer Group이 오프셋을 관리해 독립적으로 처음부터 다시 읽을 수 있다(리플레이). 대용량 이벤트 스트림, 장기 보관, 이벤트 소싱에 적합하다.

이 프로젝트 기준: 블록 이벤트는 처리 후 보관이 불필요하고, Exchange로 충분한 라우팅이 되며, 운영 복잡도가 낮아야 한다 → RabbitMQ.

---

**Q5. Consumer 멱등성이 왜 중요한가? 이 프로젝트에서 어떻게 구현하는가?**

RabbitMQ의 At-Least-Once 보장으로 인해 동일한 메시지가 두 번 이상 Consumer에게 전달될 수 있다.

시나리오: Consumer가 DB 로그를 적재하고 Ack를 보내는 순간 네트워크가 끊어졌다. DB 적재는 성공했지만 RabbitMQ는 Ack를 못 받았다. Consumer가 재연결되면 RabbitMQ가 같은 메시지를 재전달한다. Consumer가 다시 DB 적재를 시도하면 중복 레코드가 생긴다.

멱등성 구현 방법: 메시지에 포함된 고유 식별자(블록 해시, txId 등)를 기준으로 DB `INSERT ... ON CONFLICT DO NOTHING` 또는 `INSERT ... WHERE NOT EXISTS`를 사용한다. 이미 처리된 이벤트를 기록하는 별도 테이블을 두는 방법도 있다. 어느 방법이든 "같은 메시지를 여러 번 처리해도 결과가 동일"하게 만드는 것이 핵심이다.

---

**Q6. Consumer가 처리 도중 크래시되면 어떻게 되는가?**

MANUAL Ack 모드에서 Consumer가 크래시되면 Ack가 전송되지 않은 메시지는 RabbitMQ에서 "Unacknowledged" 상태로 남는다. RabbitMQ는 해당 Consumer의 TCP 연결이 끊어진 것을 감지하고, Unacknowledged 메시지를 즉시 Queue로 되돌려 다른 Consumer(또는 재시작된 동일 Consumer)에게 재전달한다.

이것이 MANUAL Ack를 쓰는 이유다. AUTO Ack였다면 메시지를 받는 즉시 RabbitMQ에서 제거되므로 처리 도중 크래시 시 메시지가 유실된다.

`docker-compose.prod.yml`의 `restart: unless-stopped` 설정으로 Spring Backend 컨테이너가 크래시 후 자동 재시작된다. 재시작된 Consumer가 Queue에 연결되면 미처리 메시지를 이어서 처리한다.

---

**Q7. 블록체인 웹훅을 RabbitMQ로 처리할 때 순서 보장이 필요한가?**

블록 이벤트는 블록 높이 순서로 처리해야 한다. 높이 100 블록을 처리하기 전에 높이 101 블록을 처리하면 상태가 꼬인다.

RabbitMQ Queue는 기본적으로 FIFO다. 단일 Consumer라면 발행 순서대로 소비된다. 그러나 Consumer가 여러 개라면(스케일 아웃) 순서가 보장되지 않는다.

이 프로젝트에서 블록 이벤트 Consumer는 단일 인스턴스로 충분하다. 블록 생성 속도가 초당 수 건을 넘지 않으므로 스케일 아웃이 불필요하다. `prefetch: 1` + 단일 Consumer 조합으로 순서를 보장한다. 만약 스케일 아웃이 필요해진다면 블록 높이를 기준으로 멱등성 처리를 강화하거나 Consumer 레벨에서 순서 조정 로직을 추가해야 한다.
