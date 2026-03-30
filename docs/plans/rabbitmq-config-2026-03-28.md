# 수정 계획: RabbitMQ Step 1 — Exchange/Queue/Binding 정의

> 작성일: 2026-03-28

---

## 원인

RabbitMQ 인프라(컨테이너, yml 설정, AMQP 의존성)는 이미 존재하지만
Exchange/Queue/Binding 을 정의하는 `@Configuration` 클래스가 없어서
실제 메시지를 발행하거나 소비할 수 없는 상태.

---

## 영향 레이어

| 레이어 | 파일 | 변경 |
|--------|------|------|
| 설정 | `global/config/RabbitMQConfig.java` | 신규 생성 |
| 설정 | `src/main/resources/application.yml` | rabbit health check `false → true` |
| 없음 | 나머지 전체 | 무변경 |

---

## 변경 범위

### Exchange
| 이름 | 타입 | 목적 |
|------|------|------|
| `jackpotchain.events` | topic | 모든 이벤트의 진입점 |

### Queue / Binding
| Queue | Routing Key 패턴 | 목적 |
|-------|-----------------|------|
| `block.sync.queue` | `node.block.created` | Step 4 Consumer — 블록 동기화 트리거 |
| `ops.node.queue` | `node.#` | 노드 이벤트 전체 (운영 로그, 알림) |
| `block.sync.queue.dlq` | — | `block.sync.queue` 처리 실패 메시지 격리 |

### DLQ 연결 방식
- `block.sync.queue` 선언 시 `x-dead-letter-exchange: ""` (default exchange),
  `x-dead-letter-routing-key: block.sync.queue.dlq` 설정
- `block.sync.queue.dlq` 는 일반 Queue 로 선언 (별도 Exchange 불필요)

### MessageConverter
- `Jackson2JsonMessageConverter` — payload를 JSON으로 직렬화/역직렬화

---

## 실패 가능 지점

| 지점 | 원인 | 대응 |
|------|------|------|
| 앱 기동 실패 | RabbitMQ 컨테이너 미기동 | `docker compose up rabbitmq` 확인 |
| Exchange 타입 충돌 | RabbitMQ에 동일 이름 다른 타입 존재 | Management UI에서 기존 Exchange 삭제 후 재기동 |
| Health check 실패 | `rabbit.enabled: true` 인데 연결 불가 | 컨테이너 상태 확인 |
