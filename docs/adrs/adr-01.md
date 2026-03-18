# ADR-01: Server Node 블록 수신 → Backend 연동 방식

| 항목 | 내용 |
|------|------|
| 상태 | ✅ 채택 |
| 날짜 | 2026-03-17 |
| 결정자 | 백엔드 팀 |

---

## 결정 주제

블록체인 네트워크에서 Server Node(Observer)가 새 블록을 수신했을 때,
이 사실을 Backend에 전달하고 DB에 인덱싱하는 **연동 방식**을 무엇으로 선택할 것인가.

---

## 상황 / 문제

JackpotChain은 EC2 내에 **Server Node(Python)**와 **Backend(Java/Spring)** 가 별도 프로세스로 운영된다.
Server Node는 P2P 네트워크에서 블록·TX를 수신하는 관찰자(Observer) 역할을 하며,
Frontend가 필요로 하는 활동 내역, 채굴 내역, 로또 참여 상태, 잭팟 풀 잔액 등의 데이터는
블록이 수신된 시점에 파싱·저장되어야 조회 API에서 즉시 응답이 가능하다.

문제는 **"Server Node가 블록을 수신했다는 사실을 Backend가 어떻게 알 것인가"** 이다.
현재 jackpotchain의 `node.py`에는 블록 수신 시 콜백(`_on_block`)을 실행하는 메커니즘이
이미 구현되어 있어, 이를 활용할 수 있는 구조가 갖춰져 있다.

---

## 선택지

### A. Backend Polling
Backend가 Spring `@Scheduled`로 일정 주기마다 RPC를 호출해 새 블록을 확인한다.

```
Backend (5초마다)
  → RPC: getblockcount()
  → DB의 최신 높이와 비교
  → 새 블록이 있으면 RPC: getblock() 호출
  → 파싱 후 DB 저장
```

### B. Server Node → Backend Webhook (채택)
Server Node가 블록 수신 즉시 Backend의 내부 HTTP 엔드포인트로 POST 요청을 보낸다.

```
Server Node (_on_block 콜백)
  → HTTP POST /internal/new-block (블록 직렬화 데이터)
  → Backend 수신 후 파싱 · DB 저장
```

### C. Server Node 직접 DB 쓰기
Server Node(Python)가 블록 수신 시 직접 DB에 INSERT한다.
Backend는 DB READ만 담당한다.

```
Server Node (_on_block 콜백)
  → SQLAlchemy 등으로 DB 직접 INSERT
Backend
  → DB SELECT만 수행
```

---

## 비교 기준

### 성능

| 선택지 | 평가 |
|--------|------|
| A. Polling | 블록 생성 주기(30초)보다 짧은 주기(5초)로 폴링 → 대부분의 호출이 낭비. 블록이 많아지면 getblock 반복 호출 부하 증가 |
| **B. Webhook** | **블록 수신 즉시 1회 POST → 불필요한 호출 없음. 처리 지연 최소화** |
| C. 직접 쓰기 | 실시간 저장, 성능은 B와 동등. 단, DB 커넥션을 두 프로세스가 공유해 커넥션 풀 경쟁 발생 |

### 단순성

| 선택지 | 평가 |
|--------|------|
| A. Polling | Spring Scheduler 설정만으로 구현 가능. 구조가 단순하고 직관적 |
| **B. Webhook** | **Server Node에 HTTP 클라이언트(aiohttp) 추가, Backend에 내부 엔드포인트 추가 필요. 약간 복잡하나 역할이 명확** |
| C. 직접 쓰기 | Python에서 DB 스키마를 직접 다뤄야 함. 두 언어(Python/Java)가 동일 스키마에 의존 → 가장 복잡 |

### 유지보수성

| 선택지 | 평가 |
|--------|------|
| A. Polling | RPC 의존도가 높아 RPC 변경 시 Scheduler 로직도 함께 수정 필요 |
| **B. Webhook** | **Server Node ↔ Backend 인터페이스(HTTP)가 명확히 분리. 각자 독립적으로 변경 가능** |
| C. 직접 쓰기 | DB 스키마 변경 시 Python 코드(Server Node)와 Java 코드(Backend) 모두 수정 필요. 결합도 최고 |

### 운영성

| 선택지 | 평가 |
|--------|------|
| A. Polling | Server Node 장애 시에도 Backend가 RPC를 직접 호출해 자가 복구 가능. 가장 안정적 |
| **B. Webhook** | **Backend 재시작 시 Webhook 유실 가능 → 재시작 후 누락 블록 보정 로직(높이 비교 후 catchup) 필요** |
| C. 직접 쓰기 | Server Node 장애 = DB 미저장. 장애 격리가 어렵고 원인 추적 복잡 |

### 팀 숙련도

| 선택지 | 평가 |
|--------|------|
| A. Polling | Spring Scheduler, REST Template 사용. 팀 모두 익숙 |
| **B. Webhook** | **HTTP POST는 팀 전원 이해 가능. Python aiohttp는 간단한 예제 수준으로 충분** |
| C. 직접 쓰기 | Python에서 DB ORM 사용 경험 필요. 팀 숙련도 낮음 |

---

## 최종 선택

**B. Server Node → Backend Webhook**

---

## 선택 이유

1. **실시간성**: 블록 생성 주기(30초)에 비해 Polling 지연(5~10초)은 UX에 영향을 주지 않지만, 향후 블록 생성 속도 변화에도 즉시 대응 가능한 구조가 필요하다. Webhook은 블록 수신 즉시 처리하므로 지연이 없다.

2. **불필요한 RPC 호출 제거**: Polling 방식은 새 블록이 없어도 주기마다 RPC를 호출한다. Webhook은 실제 이벤트가 발생할 때만 요청이 발생하므로 Server Node 부하가 낮다.

3. **역할 분리 명확**: Server Node는 P2P 통신만, Backend는 비즈니스 로직·DB 관리만 담당한다. HTTP 인터페이스로 경계를 명확히 하면 두 컴포넌트를 독립적으로 변경·배포할 수 있다.

4. **인프라 추가 없음**: Message Queue(Kafka, RabbitMQ)를 도입하면 더 강건한 구조가 되지만, MVP 단계에서 운영 복잡도가 과도하게 높아진다. Webhook은 별도 인프라 없이 HTTP만으로 동일한 이벤트 드리븐 효과를 낸다.

5. **jackpotchain 구조와의 정합**: `node.py`에 `_on_block` 콜백이 이미 구현되어 있어 최소한의 코드 추가(aiohttp HTTP POST)로 연동이 완성된다.

---

## 감수한 단점 (트레이드오프)

### 1. 블록 유실 가능성
Backend가 재시작되거나 일시적으로 다운된 동안 Webhook POST가 실패하면 해당 블록이 DB에 저장되지 않는다.

**보완책**: Backend 재시작 시 DB의 최신 블록 높이와 Server Node의 현재 높이를 비교해 누락된 블록을 RPC로 보정하는 **catchup 로직**을 구현한다.

```
Backend 시작 시:
  DB 최신 높이(dbHeight) vs RPC getblockcount()(rpcHeight)
  dbHeight < rpcHeight → 누락 구간(dbHeight+1 ~ rpcHeight) RPC로 보정
```

### 2. Server Node에 HTTP 클라이언트 의존성 추가
Python Server Node에 `aiohttp` 라이브러리와 Backend 호출 로직이 추가된다.
Server Node가 순수 블록체인 노드 역할에서 약간 벗어나게 된다.

### 3. 내부 네트워크 의존
Webhook은 EC2 내부 네트워크(localhost or private IP)를 통해 Backend를 호출한다.
두 프로세스가 동일 EC2 또는 같은 내부 네트워크에 있어야 한다.

---

## 재검토 조건

아래 상황 중 하나라도 발생하면 Message Queue(Kafka, RabbitMQ) 방식으로 전환을 검토한다.

| 조건 | 설명 |
|------|------|
| 블록 처리량 급증 | Webhook POST 처리 시간이 블록 생성 주기(30초)를 초과할 경우 |
| 블록 유실 반복 발생 | catchup 로직으로도 처리되지 않는 유실 케이스가 발생할 경우 |
| Backend 수평 확장 | Backend 인스턴스가 여러 대로 늘어나 단일 Webhook 대상 지정이 어려워질 경우 |
| Server Node 분리 | Server Node가 EC2 외부로 이전되어 내부 네트워크 직접 호출이 불가해질 경우 |

---

## 면접용 3줄 요약

1. **Server Node가 P2P 네트워크에서 블록을 수신하면 즉시 Backend의 내부 HTTP 엔드포인트로 Webhook을 보내고, Backend가 블록을 파싱해 DB에 인덱싱하는 이벤트 드리븐 구조를 채택했습니다.**

2. **Polling 대비 불필요한 RPC 호출이 없고 실시간성이 보장되며, 직접 DB 쓰기 대비 Server Node와 Backend의 역할이 HTTP 인터페이스로 명확히 분리되어 독립적인 변경·배포가 가능합니다.**

3. **단, Backend 재시작 시 Webhook 유실 가능성이 있어 시작 시점에 DB 높이와 RPC 높이를 비교해 누락 블록을 보정하는 catchup 로직을 함께 구현해 트레이드오프를 감수했습니다.**
