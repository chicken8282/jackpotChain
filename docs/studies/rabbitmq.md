# RabbitMQ 학습 — AMQP · Exchange · Queue · 소비 전략

> 작성일: 2026-03-25
> 기준: docker-compose.local.yml, application-local.yml, 프로젝트 설계 목표

---

## 1. 왜 메시지 큐가 필요한가

현재 JackpotChain 아키텍처는 모든 통신이 **JSON-RPC 동기 호출** 하나로 처리된다.

```
Frontend → Backend (REST)
Backend  → JackpotChain Node (JSON-RPC)
```

이 구조는 "사용자 요청 → 즉시 응답"이 필요한 흐름에는 적합하다.
그러나 다음 상황에서는 동기 처리가 오히려 문제가 된다.

| 상황 | 동기 처리의 문제 |
|------|----------------|
| RPC 실패 로그를 DB에 기록 | DB 쓰기 지연이 사용자 응답에 직접 영향 |
| 관리자 알림 메일/디스코드 전송 | 외부 API 응답 지연이 요청 처리 속도 저하 |
| 새 블록 생성 이벤트 처리 | Node가 BE에 직접 HTTP를 쳐야 해 결합도 상승 |
| 통계성 로그 적재 | 부가 작업이 실패해도 핵심 기능까지 롤백 |

**핵심 문제**: Node와 Backend가 서로 직접 알고 있어야 하고, 부가 작업의 실패가 핵심 기능에 영향을 준다.

메시지 큐는 이 결합을 끊는다.

```
Node → [MQ] ← Backend 소비
                 └→ 로그 적재
                 └→ 알림 발송
                 └→ 통계 집계
```

Node는 이벤트를 큐에 던지면 끝이다. Backend가 언제 어떻게 처리하는지 알 필요 없다.

---

## 2. RabbitMQ란 무엇인가

**브로커(Broker)** 역할을 하는 메시지 미들웨어다.
발신자(Producer)와 수신자(Consumer) 사이에서 메시지를 중계하고 저장한다.

```
Producer ──publish──▶  Exchange ──routing──▶  Queue ──deliver──▶  Consumer
                          │
                      (라우팅 규칙)
                      Binding Key
```

**핵심 용어 4가지**

| 용어 | 역할 | 비유 |
|------|------|------|
| **Exchange** | 메시지를 받아 어느 큐로 보낼지 결정하는 라우터 | 우체국 분류소 |
| **Queue** | 메시지가 실제로 쌓이는 버퍼 | 우편함 |
| **Binding** | Exchange → Queue 연결 규칙 | 배달 구역 지정 |
| **Routing Key** | Producer가 메시지에 붙이는 분류 태그 | 수신인 주소 |

**프로토콜**: AMQP 0-9-1 (Advanced Message Queuing Protocol)
**기본 포트**: 5672 (AMQP), 15672 (Management UI)

---

## 3. Exchange 타입 — 어떻게 라우팅할 것인가

Exchange 타입이 "어떤 Consumer에게 메시지를 보낼지"를 결정한다.

### 3-1. Direct Exchange

Routing Key가 **정확히 일치하는** Queue로만 전달한다.

```
Producer → Exchange (direct)
              ├─ "ops.rpc-failure"  ──▶  ops-queue
              └─ "alert.discord"    ──▶  alert-queue
```

```
메시지의 routing_key = "ops.rpc-failure"
→ binding_key가 "ops.rpc-failure"인 Queue만 수신
```

**사용 시점**: 특정 이벤트를 정해진 하나의 처리기에 정확히 보낼 때

---

### 3-2. Topic Exchange

Routing Key를 **패턴 매칭**으로 라우팅한다.
`*` = 단어 1개 대체, `#` = 0개 이상의 단어 대체

```
Producer → Exchange (topic)
              ├─ "node.block.*"  ──▶  node-monitor-queue
              ├─ "node.#"        ──▶  node-all-events-queue
              └─ "alert.#"       ──▶  alert-queue

메시지 routing_key = "node.block.created"
→ "node.block.*" 매칭 → node-monitor-queue 전달
→ "node.#" 매칭 → node-all-events-queue 전달
→ 동시에 2개 Queue에 복사 전달
```

**사용 시점**: 이벤트 종류가 다양하고, 하나의 이벤트를 여러 처리기가 받아야 할 때

---

### 3-3. Fanout Exchange

Routing Key를 **무시하고** 연결된 모든 Queue에 브로드캐스트한다.

```
Producer → Exchange (fanout)
              ├──▶  log-queue
              ├──▶  alert-queue
              └──▶  stats-queue
```

**사용 시점**: 하나의 이벤트를 모든 구독자에게 동일하게 전달할 때

---

### 3-4. 이 프로젝트에서 쓸 Exchange 타입

| 단계 | Exchange 타입 | 이유 |
|------|-------------|------|
| 1차 (ops 이벤트) | **Topic** | `node.#`, `spring.#` 패턴으로 확장 용이 |
| 2차 (알림 분리) | **Direct** | 알림 채널(Discord/메일)별 정확한 라우팅 필요 |

---

## 4. Pub/Sub vs Work Queue — 소비 패턴 선택

메시지 큐의 소비 방식은 두 가지로 나뉜다.

### 4-1. Work Queue (경쟁 소비)

```
Producer ──▶ Queue ──▶ Consumer A  (처리)
                  └──▶ Consumer B  (대기)

같은 메시지가 A 또는 B 중 하나에만 전달됨
```

- 동일 Queue를 여러 Consumer가 구독
- 메시지가 **하나의 Consumer에만** 전달
- 처리량 확장(Scale Out)이 목적
- "이 작업을 누군가 한 명이 처리하면 된다"

**이 프로젝트 적용**: RPC 실패 로그 DB 적재, 통계 집계
→ 같은 로그가 두 번 DB에 쌓이면 안 됨 → Work Queue

---

### 4-2. Pub/Sub (발행-구독)

```
Producer ──▶ Exchange (fanout/topic)
                  ├──▶ Queue A ──▶ Consumer A (로그 적재)
                  └──▶ Queue B ──▶ Consumer B (알림 발송)

같은 메시지가 A와 B 모두에 복사 전달됨
```

- Exchange가 여러 Queue에 메시지를 복사
- 각 Queue는 독립적인 Consumer가 처리
- "이 이벤트를 여러 시스템이 각자 처리해야 한다"

**이 프로젝트 적용**: Node 블록 생성 이벤트
→ 로그 적재도 해야 하고 모니터링 알림도 보내야 함 → Pub/Sub

---

### 4-3. Push vs Pull — 메시지를 어떻게 받는가

| 방식 | 동작 | RabbitMQ에서 |
|------|------|-------------|
| **Push** | Broker가 Consumer에게 능동적으로 전달 | `@RabbitListener` (기본값) |
| **Pull** | Consumer가 필요할 때 직접 가져감 | `rabbitTemplate.receive()` |

RabbitMQ의 기본 소비 방식은 **Push**다.
Consumer가 연결되면 RabbitMQ가 메시지를 자동으로 밀어 넣는다.
이때 `prefetch` 설정으로 한 번에 받는 메시지 개수를 제한할 수 있다.

```yaml
# application.yml
spring:
  rabbitmq:
    listener:
      simple:
        prefetch: 1   # Consumer 1개당 동시에 1개만 처리 (처리 완료 전 다음 메시지 안 받음)
```

**prefetch: 1을 쓰는 이유**
Consumer가 이전 메시지를 처리하는 동안 새 메시지를 미리 받아두면,
느린 Consumer에게 메시지가 몰리는 불균형이 생긴다.
prefetch: 1이면 ack를 보낸 후에만 다음 메시지를 받아 공정한 분배가 된다.

---

## 5. Ack/Nack — 메시지 처리 확인

메시지를 받았다고 처리 성공이 아니다.
RabbitMQ는 Consumer가 **명시적으로 확인(ack)**을 보낼 때까지 메시지를 "미전달 완료" 상태로 관리한다.

```
Consumer ──처리 성공──▶ ack  → RabbitMQ가 메시지 삭제
Consumer ──처리 실패──▶ nack → RabbitMQ가 재큐잉(requeue) 또는 DLQ로 이동
```

### Acknowledge 모드

| 모드 | 동작 | 리스크 |
|------|------|--------|
| `AUTO` (기본) | 메시지를 받는 즉시 자동 ack | Consumer가 처리 도중 죽으면 메시지 유실 |
| `MANUAL` | Consumer가 코드에서 직접 ack/nack 호출 | 처리 보장되지만 코드가 복잡해짐 |
| `NONE` | ack 없음 (fire-and-forget) | 최고 성능, 메시지 유실 허용 가능 시에만 |

**이 프로젝트의 선택**: 운영 이벤트 큐는 `MANUAL` ack
→ DB 적재 완료 또는 알림 발송 완료 후에만 ack
→ 처리 중 서버 재시작해도 메시지 재처리 보장

```java
// Spring AMQP에서 MANUAL ack 예시
@RabbitListener(queues = "ops.events.queue")
public void handleOpsEvent(Message message, Channel channel) throws IOException {
    try {
        processEvent(message);
        channel.basicAck(message.getMessageProperties().getDeliveryTag(), false);
    } catch (Exception e) {
        // requeue=false → DLQ로 이동
        channel.basicNack(message.getMessageProperties().getDeliveryTag(), false, false);
    }
}
```

---

## 6. Retry · DLQ — 실패 처리 전략

### 6-1. 단순 requeue의 문제

nack에 `requeue=true`를 주면 메시지가 즉시 원래 Queue 앞으로 돌아온다.
처리 불가 메시지가 있으면 Queue를 무한 순환하면서 Consumer를 점유한다.

```
Queue: [실패메시지] → Consumer → nack+requeue → [실패메시지] → Consumer → nack+requeue → ...
```

→ 정상 메시지 처리 차단, Consumer 폭주

### 6-2. Dead Letter Queue (DLQ)

"처리 불가 메시지를 보내는 격리 큐"다.

```
정상 Queue        ←──────────────────────────────────────────┐
    │ nack (requeue=false)                                    │ (수동 재처리)
    │ TTL 초과                                                 │
    │ maxLength 초과                                           │
    ▼                                                          │
DLQ (dead-letter-queue)  ──관리자 확인/알림──▶  수동 판단 후 재투입
```

**Queue 선언 시 DLQ 연결 설정**

```java
@Bean
Queue opsEventsQueue() {
    return QueueBuilder.durable("ops.events.queue")
        .withArgument("x-dead-letter-exchange", "dlx")        // DLX(Dead Letter Exchange) 지정
        .withArgument("x-dead-letter-routing-key", "dlq.ops") // DLQ 라우팅 키
        .withArgument("x-message-ttl", 60000)                  // 60초 내 미처리 시 DLQ 이동
        .build();
}

@Bean
Queue deadLetterQueue() {
    return QueueBuilder.durable("dlq.ops").build();
}
```

### 6-3. Retry — 일시적 실패 재시도

DLQ로 보내기 전에 정해진 횟수만큼 재시도한다.
Spring AMQP의 `RetryInterceptor`로 구현한다.

```java
@Bean
SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
    ConnectionFactory connectionFactory) {

    SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
    factory.setConnectionFactory(connectionFactory);
    factory.setPrefetchCount(1);
    factory.setAcknowledgeMode(AcknowledgeMode.MANUAL);

    // 재시도 설정: 최대 3회, 초기 1초, 배수 2.0 (1s → 2s → 4s)
    RetryInterceptorBuilder.StatefulRetryInterceptorBuilder retryBuilder =
        RetryInterceptorBuilder.stateful()
            .maxAttempts(3)
            .backOffOptions(1000, 2.0, 4000)
            .recoverer(new RejectAndDontRequeueRecoverer()); // 재시도 소진 시 DLQ로

    factory.setAdviceChain(retryBuilder.build());
    return factory;
}
```

**흐름**
```
메시지 수신 → 처리 실패
    → 1초 후 재시도 (1회)
    → 2초 후 재시도 (2회)
    → 4초 후 재시도 (3회) → 전부 실패
    → nack + requeue=false → DLQ 이동
```

### 6-4. 이 프로젝트의 재시도 정책

| 큐 | 재시도 | DLQ | 이유 |
|----|--------|-----|------|
| ops.events.queue (로그 적재) | 3회, 지수 백오프 | 있음 | DB 일시 장애 가능, 데이터 유실 불가 |
| alert.queue (알림 발송) | 2회, 고정 간격 | 있음 | 외부 API(Discord) 일시 장애 가능 |
| stats.queue (통계 적재) | 1회 | 있음 | 통계는 유실보다 처리 지연이 허용됨 |

---

## 7. 다른 선택지와 비교 — 왜 RabbitMQ인가

### 7-1. 선택지 비교표

| 항목 | RabbitMQ | Kafka | Redis Pub/Sub | 직접 HTTP |
|------|----------|-------|---------------|-----------|
| 메시지 영속성 | 기본 지원 | 기본 지원 | **없음** (메모리) | 없음 |
| 전달 보장 | ack 기반 보장 | offset 기반 보장 | 없음 (fire-and-forget) | 없음 |
| 라우팅 | Exchange 타입 다양 | 토픽/파티션만 | 채널 이름만 | 없음 |
| 재시도/DLQ | 기본 지원 | 직접 구현 필요 | 없음 | 없음 |
| 운영 복잡도 | **낮음** | 높음 (ZooKeeper/KRaft) | 낮음 | 없음 |
| 처리량 | 중간 (~50k msg/s) | 매우 높음 (수백만 msg/s) | 높음 | — |
| Spring 통합 | spring-amqp (공식) | spring-kafka (공식) | spring-data-redis | RestTemplate |
| Management UI | 기본 내장 | 별도 설치 필요 | 없음 | — |

### 7-2. Kafka를 선택하지 않은 이유

Kafka는 **대용량 스트림 처리**를 위해 설계됐다.

- ZooKeeper(또는 KRaft) 클러스터 필요 → 운영 오버헤드 큼
- Consumer Group과 Offset 관리가 복잡함
- 이 프로젝트의 이벤트 규모(초당 수십 건)에는 과한 인프라
- 메시지 라우팅을 직접 구현해야 함 (Exchange 개념 없음)

Kafka가 맞는 상황: 로그 스트리밍, 수백만 이벤트/초, 장기간 이벤트 보관 및 리플레이

### 7-3. Redis Pub/Sub을 선택하지 않은 이유

Redis Pub/Sub은 이미 프로젝트에 Redis가 있어 추가 인프라 없이 쓸 수 있지만,
**메시지 영속성이 없다**는 치명적 제약이 있다.

- Consumer가 오프라인 상태면 메시지 유실
- ack/nack 개념 없음 → 처리 실패 감지 불가
- DLQ 구현 불가
- RPC 실패 로그 같은 **운영 데이터를 유실하면 안 되는** 상황에 부적합

Redis Pub/Sub이 맞는 상황: 실시간 알림, 유실 허용 가능한 브로드캐스트 이벤트

### 7-4. RabbitMQ를 선택한 이유

| 요구사항 | RabbitMQ가 충족하는 방법 |
|---------|------------------------|
| 운영 로그 유실 불가 | durable Queue + ack 기반 전달 보장 |
| Node-Backend 결합도 제거 | Node가 Exchange에 publish만, Backend가 Queue에서 소비 |
| 이벤트별 다른 처리기 | Topic Exchange로 routing key 기반 분기 |
| 장애 시 재처리 | DLQ + 수동 재투입 |
| 낮은 운영 복잡도 | 단일 컨테이너, Management UI 기본 제공 |
| Spring Boot 통합 | spring-boot-starter-amqp, @RabbitListener 자동 설정 |

---

## 8. 이 프로젝트의 구체적 적용 설계

### 8-1. 전체 구조 (1차 목표)

```
JackpotChain Node (Python)
    │  AMQP publish
    │  routing_key: "node.block.created"
    │                "node.peer.drop"
    │                "node.mempool.spike"
    │                "node.claim.failed"
    ▼
topic-exchange ("jackpotchain.events")
    │
    ├─ "node.#"     ──binding──▶  ops.node.queue
    │                               └──▶ Spring Consumer: 로그 적재 + 모니터링
    │
    └─ "spring.#"   ──binding──▶  ops.spring.queue
                                    └──▶ Spring Consumer: RPC실패 적재 + 알림 생성

Spring Backend (Java)
    │  self-publish (RPC 실패 감지 시)
    │  routing_key: "spring.rpc.failure"
    │               "spring.alert.discord"
    ▼
topic-exchange ("jackpotchain.events")
```

### 8-2. Queue 목록 (단계별)

**1차: 운영 로그/이벤트 단일 큐**

```
Exchange: jackpotchain.events (topic)
Queue: ops.events.queue
  - routing pattern: "node.#", "spring.#"
  - durable: true
  - x-dead-letter-exchange: dlx
  - x-message-ttl: 60000 (60초)
  prefetch: 1, ack: MANUAL, retry: 3회 지수 백오프

DLQ: dlq.ops.events
  - durable: true
  - 관리자가 Management UI로 확인 후 수동 재투입
```

**2차: 알림 큐 분리**

```
Exchange: jackpotchain.alerts (direct)
Queue: alert.discord.queue   routing_key: "alert.discord"
Queue: alert.admin.queue     routing_key: "alert.admin"
  - 각 큐마다 독립 Consumer (Discord API, 이메일 발송)
  - DLQ 연결 필수 (외부 API 장애 시 유실 방지)
```

**3차: 통계 큐 분리**

```
Exchange: jackpotchain.events (topic)
Queue: stats.lotto.queue   routing_key: "spring.lotto.#"
Queue: stats.exchange.queue routing_key: "spring.exchange.#"
  - 통계 집계는 일시 장애 허용 → retry 1회, DLQ 보관
```

### 8-3. Spring Boot 설정 코드 구조

```java
// RabbitMQConfig.java
@Configuration
public class RabbitMQConfig {

    // --- Exchange 선언 ---
    @Bean
    TopicExchange eventsExchange() {
        return ExchangeBuilder.topicExchange("jackpotchain.events")
            .durable(true)
            .build();
    }

    @Bean
    DirectExchange deadLetterExchange() {
        return ExchangeBuilder.directExchange("dlx")
            .durable(true)
            .build();
    }

    // --- Queue 선언 ---
    @Bean
    Queue opsEventsQueue() {
        return QueueBuilder.durable("ops.events.queue")
            .withArgument("x-dead-letter-exchange", "dlx")
            .withArgument("x-dead-letter-routing-key", "dlq.ops.events")
            .withArgument("x-message-ttl", 60_000L)
            .build();
    }

    @Bean
    Queue deadLetterQueue() {
        return QueueBuilder.durable("dlq.ops.events").build();
    }

    // --- Binding ---
    @Bean
    Binding nodeEventsBinding(Queue opsEventsQueue, TopicExchange eventsExchange) {
        return BindingBuilder.bind(opsEventsQueue)
            .to(eventsExchange)
            .with("node.#");    // node.block.created, node.peer.drop 등 전부 수신
    }

    @Bean
    Binding springEventsBinding(Queue opsEventsQueue, TopicExchange eventsExchange) {
        return BindingBuilder.bind(opsEventsQueue)
            .to(eventsExchange)
            .with("spring.#");  // spring.rpc.failure 등 수신
    }

    @Bean
    Binding dlqBinding(Queue deadLetterQueue, DirectExchange deadLetterExchange) {
        return BindingBuilder.bind(deadLetterQueue)
            .to(deadLetterExchange)
            .with("dlq.ops.events");
    }
}
```

### 8-4. Node 이벤트 발행 (Python)

```python
# JackpotChain Node에서 이벤트 발행 예시
import pika, json

def publish_event(routing_key: str, payload: dict):
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host="rabbitmq", port=5672)
    )
    channel = connection.channel()
    channel.basic_publish(
        exchange="jackpotchain.events",
        routing_key=routing_key,
        body=json.dumps(payload),
        properties=pika.BasicProperties(
            delivery_mode=2,   # 메시지 영속성 (Broker 재시작 후에도 유지)
            content_type="application/json"
        )
    )
    connection.close()

# 새 블록 생성 시
publish_event("node.block.created", {
    "blockHeight": 12345,
    "blockHash": "0x...",
    "txCount": 3,
    "timestamp": "2026-03-25T14:30:01Z"
})

# 피어 수 급감 시
publish_event("node.peer.drop", {
    "currentPeers": 1,
    "threshold": 3,
    "timestamp": "2026-03-25T14:30:01Z"
})
```

### 8-5. Spring Consumer (MANUAL ack + 재시도)

```java
// OpsEventConsumer.java
@Component
public class OpsEventConsumer {

    @RabbitListener(queues = "ops.events.queue")
    public void handleOpsEvent(
        @Payload OpsEventDto event,
        @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag,
        Channel channel
    ) throws IOException {
        try {
            opsEventService.persist(event);   // DB 적재
            channel.basicAck(deliveryTag, false);
        } catch (Exception e) {
            log.error("ops event processing failed: {}", event, e);
            // requeue=false → 재시도 횟수 소진 후 DLQ로
            channel.basicNack(deliveryTag, false, false);
        }
    }
}
```

### 8-6. Spring Publisher (RPC 실패 이벤트 발행)

```java
// JackpotChainHttpRpcClient.java (기존 RPC 클라이언트에 추가)
@Component
public class JackpotChainHttpRpcClient {

    private final RabbitTemplate rabbitTemplate;

    public Object invoke(String method, Object... params) {
        try {
            // 기존 RPC 호출 로직
            return doInvoke(method, params);
        } catch (Exception e) {
            // RPC 실패 → MQ에 이벤트 발행 (동기 처리 차단 안 함)
            rabbitTemplate.convertAndSend(
                "jackpotchain.events",
                "spring.rpc.failure",
                RpcFailureEvent.of(method, e.getMessage())
            );
            throw e;  // 원래 예외는 그대로 전파 (사용자 응답에 영향)
        }
    }
}
```

**핵심**: RPC 실패 로그 적재는 MQ를 통해 비동기로 처리하므로
사용자 응답 흐름에 DB 쓰기 지연이 영향을 주지 않는다.

---

## 9. 전체 데이터 흐름

```
[JackpotChain Node] 블록 생성 / 피어 감소 / mempool 급증 / Claim 실패
    │  AMQP publish  routing_key: "node.*.*"
    │
    ▼
[jackpotchain.events Exchange] (topic)
    │
    │  Binding: "node.#"
    │  Binding: "spring.#"
    │
    ▼
[ops.events.queue]  (durable, TTL 60s, DLX 연결)
    │
    │  Spring AMQP push (prefetch=1)
    │
    ▼
[OpsEventConsumer]  (MANUAL ack)
    ├─ 성공 → channel.basicAck → 메시지 삭제
    └─ 실패 → RetryInterceptor (3회, 지수 백오프)
                  └─ 소진 → channel.basicNack → DLX
                                                  │
                                                  ▼
                                        [dlq.ops.events]
                                        관리자 Management UI 확인
                                        수동 재투입 또는 폐기

[Spring Backend] RPC 실패 감지 시
    │  rabbitTemplate.convertAndSend  routing_key: "spring.rpc.failure"
    ▼
[jackpotchain.events Exchange] → 동일 흐름
```

---

## 10. 이 프로젝트에서 얻을 수 있는 결과

### 10-1. Node-Backend 결합도 제거

**Before**: Backend가 죽으면 Node가 이벤트를 보낼 곳이 없어진다.
**After**: Node는 Exchange에 publish만 한다. Backend가 재시작하면 Queue에 쌓인 이벤트를 순서대로 처리한다.

### 10-2. 핵심 기능과 부가 기능 분리

Commit/Claim/조회 같은 사용자 요청 처리 응답 시간에 로그 적재, 알림 발송, 통계 집계가 영향을 주지 않는다.

```
Before: Commit → RPC 호출 → DB 저장 → 로그 DB 적재 → Discord 알림 → 응답
         (전체 체인이 동기. Discord 장애 시 Commit 응답 지연)

After:  Commit → RPC 호출 → DB 저장 → 응답
                                └→ MQ 발행 (비동기)
                                      └→ Consumer: 로그 적재
                                      └→ Consumer: Discord 알림
```

### 10-3. 장애 이력 확보

DLQ에 쌓인 메시지는 장애가 발생한 시점, 이벤트 종류, 데이터를 모두 담고 있다.
RabbitMQ Management UI에서 DLQ 메시지를 직접 조회해 장애 원인을 분석할 수 있다.

### 10-4. 단계별 확장 가능성

1차에서 단일 큐로 시작해 2차에 알림 큐를 분리하고, 3차에 통계 큐를 추가하는 구조다.
Exchange와 Binding 추가만으로 새 이벤트 처리기를 붙일 수 있다. 기존 코드를 수정하지 않는다.

---

## 11. 단계별 적용 계획

| 단계 | 내용 | 완료 기준 |
|------|------|----------|
| **1차** | ops.events.queue 1개, Node → MQ 발행, Spring Consumer 로그 DB 적재 | DLQ까지 동작 확인, Management UI에서 메시지 흐름 모니터링 |
| **2차** | alert.queue 분리, Discord 알림 Consumer 추가 | RPC 실패 → Discord 알림 E2E 동작 |
| **3차** | stats.queue 분리, DLQ 재처리 정책 운영 반영 | DLQ 수동 재투입 절차 문서화 |

---

## 12. 자주 헷갈리는 것들

**Q. Exchange와 Queue의 차이가 헷갈린다.**
Exchange는 "분류소"로 메시지를 저장하지 않는다.
Queue가 실제 메시지를 버퍼링하는 곳이다.
Exchange는 Binding 규칙에 따라 메시지를 Queue로 **복사/전달**만 한다.

**Q. durable Queue와 persistent 메시지의 차이는?**
`durable=true`는 RabbitMQ 재시작 후 Queue 자체가 사라지지 않음을 의미한다.
메시지 영속성은 `delivery_mode=2`(Python) 또는 `MessageDeliveryMode.PERSISTENT`(Java)로 별도 설정해야 한다.
둘 다 설정해야 재시작 후에도 메시지가 남는다.

**Q. prefetch를 왜 1로 설정하는가?**
Consumer A가 느리고 B가 빠를 때, prefetch가 크면 A가 이미 받아놓은 메시지가 처리 대기 상태로 묶인다.
prefetch=1이면 ack를 보낸 후에만 다음 메시지를 받아 빠른 Consumer에게 더 많은 메시지가 간다.

**Q. requeue=true vs requeue=false 언제 쓰는가?**
처리 중 일시적 오류(DB 연결 끊김 등)라면 `requeue=true`로 바로 재큐잉한다.
단, 재시도 횟수 없이 무한 루프가 될 수 있으므로 RetryInterceptor와 조합해서 횟수를 제한해야 한다.
최종적으로 재시도를 소진했거나 메시지 자체가 잘못된 경우 `requeue=false`로 DLQ로 보낸다.

**Q. Work Queue와 Pub/Sub을 동시에 쓸 수 있는가?**
동시에 쓸 수 있다. Topic Exchange로 하나의 메시지를 여러 Queue에 복사(Pub/Sub)하고,
각 Queue를 여러 Consumer가 경쟁 소비(Work Queue)하는 구조가 가능하다.

---

## 13. 포트 및 인프라 정리

| 서비스 | 포트 | 용도 |
|--------|------|------|
| RabbitMQ AMQP | 5672 | Spring Boot ↔ RabbitMQ, Python Node ↔ RabbitMQ |
| RabbitMQ Management UI | 15672 | `http://localhost:15672` (guest/guest) Queue 상태, DLQ 메시지 조회, 수동 재투입 |

**Management UI에서 확인할 것들**
- Queues 탭: 각 Queue의 메시지 수, Consumer 수, 처리 속도
- DLQ 탭: 처리 실패 메시지 내용과 원인 헤더
- Exchanges 탭: 라우팅 설정 확인

---

## 14. 이 문서와 연결된 파일들

| 파일 | 역할 |
|------|------|
| `docker-compose.local.yml` | RabbitMQ 컨테이너 설정 (포트 5672/15672) |
| `docker-compose.dev.yml` | Dev 환경 RabbitMQ 설정 |
| `docker-compose.prod.yml` | Prod 환경 RabbitMQ 설정 |
| `BE-ssatto/src/main/resources/application-local.yml` | Spring AMQP 연결 설정 (host, port, credentials) |
| `BE-ssatto/src/main/resources/application-prod.yml` | 운영 환경 AMQP 연결 설정 |
| `BE-ssatto/build.gradle` | `spring-boot-starter-amqp` 의존성 |
