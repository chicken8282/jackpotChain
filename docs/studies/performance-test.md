# 성능 테스트 학습

> 작성일: 2026-03-24
> 근거: `docs/records/plan.md` Phase 6
> 목표: baseline 측정 → 병목 식별 → 개선 → Before/After 수치화

---

## 0. 성능 테스트 전 필요한 사전 지식 체크리스트

- [ ] 부하 테스트 도구 개념 (nGrinder / JMeter)
- [ ] 핵심 지표 해석 (latency, TPS, error rate)
- [ ] HikariCP 원리와 튜닝
- [ ] Redis Cache-Aside 패턴
- [ ] RabbitMQ Outbox 패턴
- [ ] N+1 쿼리 문제와 해결법

---

## 1. 핵심 지표 이해

### Latency

| 지표 | 설명 | 주목 이유 |
|------|------|----------|
| avg latency | 평균 응답 시간 | 전체 경향 파악 |
| p95 latency | 상위 5% 느린 요청의 기준선 | SLA 기준에 자주 사용 |
| p99 latency | 상위 1% — 최악 케이스 | 테일 레이턴시 |

**plan.md 목표**: p95 < 500ms (GET), p95 < 1000ms (POST /lotto/commit)

### TPS (Transactions Per Second)

서버가 초당 처리하는 요청 수. VU(가상 유저) 수를 늘릴수록 올라가다가 포화점에서 수평.

```
TPS 곡선:
     TPS
      │         ●●●●●●●● ← 포화점 (병목 도달)
      │      ●●
      │   ●●
      │●●
      └─────────────────── VU 수
```

### Error rate

부하 증가 시 에러 급증 = 병목 + 과부하 신호

---

## 2. 부하 테스트 도구

### nGrinder (권장 — plan.md 기재)

네이버 오픈소스 부하 테스트 도구. Groovy/Python 스크립트로 시나리오 작성.

```
nGrinder 구성:
    Controller (웹 UI) ← 테스트 관리/모니터링
    Agent (n개)        ← 실제 부하 생성 서버
```

**장점**: 분산 부하 생성, 실시간 그래프, TPS/latency 리포트 자동 생성

**기본 스크립트 (Groovy)**

```groovy
@Test
void test() {
    HTTPResponse response = request.GET("http://localhost:18080/api/v1/blockchain/dashboard")
    assertThat(response.statusCode, is(200))
}
```

### JMeter (대안)

GUI 기반, Thread Group으로 VU 설정. XML 기반 .jmx 파일.

```
Thread Group (100 VU, 5분)
    └── HTTP Request: GET /blockchain/dashboard
        └── Assertions: 응답 코드 200
            └── Listeners: Summary Report, Graph Results
```

### 공부할 것

- [ ] nGrinder 설치 및 Agent 연결
- [ ] VU(가상 유저) vs RPS(초당 요청) 테스트 모드 차이
- [ ] Ramp-up — 점진적 부하 증가 시간 설정
- [ ] JMeter Thread Group 설정 (Ramp-up, Loop Count, Duration)

---

## 3. 테스트 시나리오 (plan.md Phase 6)

### 사전 준비

```bash
# 테스트용 지갑 준비
# 1. 지갑 여러 개 생성 + 잔액 지급 (로컬 QA RPC 활용)
# 2. 인증 토큰 미리 발급해서 스크립트에 주입

# nGrinder Agent가 접근할 수 있는 엔드포인트 확인
# dev.ssatto777.site 또는 로컬 Docker 스택
```

### 시나리오 1: GET /blockchain/dashboard

```
VU: 100  |  Duration: 5분  |  목표 p95 < 500ms
```

**예상 병목**
- RPC 조회 (getblockchaininfo, getjackpotpool) — 동기 HTTP
- HikariCP 연결 수 부족
- Redis 미캐싱 시 매 요청마다 RPC 호출

**개선 방향** → Cache-Aside (P2)

### 시나리오 2: GET /lotto/entries?address=X

```
VU: 50  |  Duration: 5분  |  목표 p95 < 500ms
```

**예상 병목**
- 페이지네이션 쿼리 성능 (cursor 기반 vs offset)
- N+1 쿼리 (LottoEntry + 연관 데이터 조회)

**개선 방향** → 읽기 최적화 (P4)

### 시나리오 3: GET /lotto?address=X

```
VU: 50  |  Duration: 5분  |  목표 p95 < 500ms
```

**예상 병목**
- RPC 호출 + DB 조합
- 주소별 캐시 없음

### 시나리오 4: POST /lotto/commit

```
VU: 20  |  Duration: 5분  |  목표 p95 < 1000ms
```

**예상 병목**
- sendrawtransaction RPC (Node 처리 시간)
- 동시 TX 제출 → mempool 경쟁
- HikariCP 쓰기 트랜잭션 연결 점유

---

## 4. 개선 P1 — HikariCP 튜닝

### 현상

부하 증가 시 `hikaricp_pending_connections` 급증
→ connectionTimeout 초과 → 500 에러

### 원리

```
Request → Service → DB 쿼리 → HikariCP에서 연결 빌림 → 쿼리 실행 → 연결 반납
         ↑                      ↑
         만약 연결이 없으면 대기 → timeout이면 에러
```

### 설정 위치

```yaml
# application.yml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10       # 기본값
      minimum-idle: 10
      connection-timeout: 30000   # 30초
      idle-timeout: 600000        # 10분
```

### 계산 방법

```
예상 동시 DB 쿼리 수 = VU × (DB 쿼리 비율)
예: 100 VU, 요청당 평균 2 쿼리, 쿼리 시간 20ms
    → 초당 TPS 50이면 동시 연결 ≈ 50 × 0.02 = 약 2개

HikariCP 권장 공식:
    pool_size = (core_count × 2) + effective_spindle_count
    예: 4코어 서버 → 약 8~10개
```

### Before/After 측정

| 지표 | Before | After |
|------|--------|-------|
| p95 latency | ? | ? |
| pending_connections 최대 | ? | ? |
| 500 error rate | ? | ? |

---

## 5. 개선 P2 — Redis Cache-Aside

### 대상 RPC

자주 호출되지만 결과가 자주 바뀌지 않는 RPC:
- `getblockchaininfo` — 블록 높이, 난이도
- `getjackpotpool` — 잭팟 풀 잔액

### Cache-Aside 패턴

```
요청
 │
 ▼
Redis GET key
 │
 ├── Hit → 캐시 값 반환 (RPC 건너뜀)
 │
 └── Miss → RPC 호출 → Redis SET key TTL → 값 반환
```

### Spring 구현

```java
@Cacheable(value = "blockchainInfo", key = "'global'")
public JackpotChainBlockchainInfo getBlockchainInfo() {
    return rpcClient.getBlockchainInfo();
}

// 새 블록 수신 시 캐시 무효화
@CacheEvict(value = "blockchainInfo", allEntries = true)
public void onNewBlock(NewBlockEvent event) {
    // 블록 인덱싱 처리...
}
```

### TTL 전략

| API | TTL | 이유 |
|-----|-----|------|
| getblockchaininfo | 새 블록 시 evict | 블록 단위로 변경 |
| getjackpotpool | 새 블록 시 evict | 교환/클레임 시 변경 |
| getlottoinfo | 30초 | 주소별 → 키 수 많음 |

### Before/After

| 지표 | Before | After |
|------|--------|-------|
| RPC 호출 수/분 | ? | ? |
| cache hit ratio | 0% | ? |
| avg latency | ? | ? |

### 공부할 것

- [ ] Spring Cache Abstraction (`@Cacheable`, `@CacheEvict`, `@CachePut`)
- [ ] Redis TTL 설정 (`RedisCacheConfiguration.entryTtl()`)
- [ ] Cache stampede 문제 — TTL 만료 시 동시 요청 → RPC 폭주
  - 해결: probabilistic early expiration, distributed lock

---

## 6. 개선 P3 — RabbitMQ Outbox 비동기화

### 현재 상태 (Webhook 동기 처리)

```
Node → Webhook POST /internal/new-block
                    │
                    ▼ (동기 처리)
              DB 트랜잭션 (블록 파싱 + 저장)
                    │ 완료 후 응답
                    ▼
              200 OK → Node
```

문제: DB 저장이 느리거나 실패하면 Webhook 응답 지연/실패

### Outbox 패턴 (설계 완료, 배포 시 활성화)

```
Node → Webhook POST /internal/new-block
                    │
                    ▼ (빠른 Ack)
              Outbox 테이블에 이벤트 저장
              200 OK 즉시 응답 → Node
                    │ (비동기)
                    ▼
              RabbitMQ Publisher → Queue
                    │
                    ▼
              Consumer → 블록 파싱 + DB 저장
```

**장점**: Webhook 응답 속도 개선 + 메시지 유실 방지 (retry 가능)

### Before/After

| 지표 | Before | After |
|------|--------|-------|
| Webhook 응답 시간 | ? | ? |
| outbox pending count | N/A | (모니터링) |
| 실패 시 재처리 보장 | 없음 | 있음 |

### 공부할 것

- [ ] RabbitMQ 기본 — Exchange, Queue, Binding, Routing Key
- [ ] Spring AMQP — `@RabbitListener`, `RabbitTemplate`
- [ ] Transactional Outbox 패턴 — DB와 메시지 브로커 원자성
- [ ] Dead Letter Queue — 처리 실패 메시지 보관

---

## 7. 개선 P4 — 읽기 최적화

### N+1 쿼리 문제

```
# 문제: LottoEntry 목록 1건 조회 + 각 Entry의 연관 데이터 N건 조회
SELECT * FROM lotto_entries WHERE address = ?  → 1쿼리
for each entry:
    SELECT * FROM blocks WHERE height = entry.commit_height  → N쿼리
```

**해결**: `JOIN FETCH` 또는 `@EntityGraph`

```java
@Query("SELECT e FROM LottoEntry e JOIN FETCH e.commitBlock WHERE e.walletAddress = :address")
List<LottoEntry> findWithBlock(@Param("address") String address);
```

### Projection

불필요한 컬럼 제거:

```java
// 전체 엔티티 대신 DTO 인터페이스 Projection
interface LottoEntrySummary {
    String getTxHash();
    String getStatus();
    int getCommitHeight();
}
```

### Batch Insert

블록 인덱싱 시 TX, WalletActivity를 건건이 INSERT하지 않고 일괄 처리:

```java
// saveAll() + hibernate.jdbc.batch_size 설정
repository.saveAll(transactions);  // 내부적으로 batch INSERT
```

```yaml
spring.jpa.properties.hibernate.jdbc.batch_size: 50
spring.jpa.properties.hibernate.order_inserts: true
```

### 공부할 것

- [ ] JPA N+1 문제 진단 — `spring.jpa.show-sql: true` + 쿼리 카운팅
- [ ] JPQL `JOIN FETCH` vs `@EntityGraph`
- [ ] Querydsl Projection — 타입 안전 쿼리
- [ ] Hibernate batch_size 설정과 JDBC batch INSERT

---

## 8. Grafana 모니터링 연동

성능 테스트 중 실시간 관찰 지표:

```
Spring Boot 대시보드:
├── http_server_requests_seconds (p95, p99) ← 핵심
├── hikaricp_connections_pending           ← HikariCP 병목
├── hikaricp_connections_active
├── jvm_memory_used_bytes                  ← GC 압력
└── jvm_gc_pause_seconds                   ← GC 멈춤

비즈니스 메트릭 대시보드:
├── RPC latency 히스토그램               ← P2 Cache 효과 확인
├── cache_gets_hit / cache_gets_miss     ← Cache hit ratio
└── rabbitmq_queue_messages              ← Outbox pending

cAdvisor:
├── container_cpu_usage_seconds          ← CPU 포화
└── container_memory_usage_bytes         ← 메모리 누수
```

### 공부할 것

- [ ] Prometheus 쿼리 언어 (PromQL)
  - `rate(http_server_requests_seconds_count[1m])`
  - `histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))`
- [ ] Grafana 패널 생성 — 데이터소스, 쿼리, 시각화 타입
- [ ] Alert Rule — 임계값 초과 시 알림 설정

---

## 9. 성능 테스트 결과 문서 형식

결과는 `docs/result/performance-baseline-{date}.md`에 기록.

```markdown
# 성능 테스트 결과 — {date}

## 환경
- 서버: EC2 {스펙}
- Docker Compose: prod 스택
- 부하 도구: nGrinder {버전}
- 테스트 기간: {시작} ~ {종료}

## Baseline (개선 전)

| API | VU | avg | p95 | p99 | TPS | Error% |
|-----|----|-----|-----|-----|-----|--------|
| GET /blockchain/dashboard | 100 | ? | ? | ? | ? | ? |

## 개선 P1: HikariCP 튜닝

변경 내용: maximumPoolSize 10 → 20
| API | avg Before | avg After | p95 Before | p95 After |
|-----|-----------|-----------|------------|-----------|

## 개선 P2: Redis Cache-Aside

...
```

---

## 10. 학습 우선순위

**Phase 5(모니터링) 완료 전 먼저 학습할 것**

1. PromQL 기본 쿼리 — Grafana 대시보드 직접 만들어보기
2. HikariCP 메트릭 이해 — 테스트 전 현재값 baseline 파악
3. nGrinder 설치 + 기본 스크립트 작성

**Phase 6(성능 테스트) 진입 후 실전 학습**

1. Cache-Aside `@Cacheable` + Webhook evict 구현
2. N+1 쿼리 진단 (slow query log)
3. Outbox 패턴 활성화 (RabbitMQ consumer 구현)
