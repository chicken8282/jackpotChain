# 장애 처리 학습 — 재시도 · 타임아웃 · 서킷 브레이커 · 멱등성

> 작성일: 2026-03-25
> 기준: Spring → JackpotChain Node JSON-RPC 호출, JackpotChainHttpRpcClient

---

## 1. 왜 장애 처리가 필요한가

Node RPC는 **외부 서비스 호출과 동일하게** 다뤄야 한다. 네트워크 지연, 노드 과부하, 블록 처리 중 응답 불가 등의 상황은 언제든 발생한다.

| 상황 | 아무 처리 없을 때 | 장애 처리가 있을 때 |
|------|------------------|-------------------|
| Node가 3초 이상 응답 없음 | Spring 스레드가 무한 대기, 커넥션 고갈 | 타임아웃 후 빠른 실패, 스레드 반환 |
| Node가 연속으로 실패 | 매 요청마다 타임아웃까지 기다린 후 실패 | circuit open → 즉시 실패, 노드 회복 시간 확보 |
| 사용자가 commit을 2번 클릭 | 블록체인에 동일 TX 2번 제출 시도 | 멱등키로 중복 제출 방지 |
| 일시적 네트워크 순단 | 사용자에게 에러 반환 | 자동 재시도 후 성공 처리 |

**이 프로젝트의 핵심 원칙**:
Node 장애가 Spring 전체를 멈춰서는 안 된다. 장애는 격리되어야 한다.

---

## 2. 전체 구성 한 줄 요약

```
프론트엔드 요청
      │
      ▼
Spring Boot  ─────────────────────────────────────▶  JackpotChain Node
  │                                                        │
  │  [Timeout]   응답 없으면 N초 후 강제 중단               │
  │  [Retry]     일시적 실패 시 자동 재시도                  │
  │  [Circuit]   연속 실패 시 우회, Node 회복 대기           │
  │  [Idempotency] 쓰기 요청 중복 제출 방지                 │
  │                                                        │
  └── [Fallback]  실패 시 캐시(Redis) 또는 기본값 반환 ──────┘
```

---

## 3. 기술 개념 & 역할

### 3-1. Timeout — 기다림에 끝을 두기

**무엇인가**
외부 호출이 응답 없이 영원히 기다리지 않도록 최대 대기 시간을 강제로 설정하는 것.

**왜 필요한가**

```
시나리오:
1. 사용자 10명이 동시에 대시보드 접속
2. Node가 블록 처리 중이라 응답이 느림
3. 각 요청이 Spring 스레드를 점유한 채 30초씩 대기
4. Spring 스레드 풀(기본 200개)이 고갈
5. 새 요청은 "커넥션 거부" → 서비스 전체 다운
```

타임아웃이 없으면 **한 개의 외부 서비스 장애가 나를 죽인다.**

**Java에서 어떻게 설정하는가**

```java
// RestTemplate 기반 (현재 프로젝트 방식)
HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory();
factory.setConnectTimeout(2000);     // TCP 연결 수립까지 최대 2초
factory.setReadTimeout(5000);        // 응답 데이터 수신까지 최대 5초
RestTemplate restTemplate = new RestTemplate(factory);
```

```yaml
# application.yml (Resilience4j TimeLimiter)
resilience4j.timelimiter:
  instances:
    rpcClient:
      timeout-duration: 5s
      cancel-running-future: true   # 타임아웃 시 실행 중인 Future도 취소
```

**이 프로젝트에서의 기준값 설계**

| RPC 메서드 | 특성 | 권장 타임아웃 | 근거 |
|-----------|------|------------|------|
| `getblockcount` | 조회, 즉각 응답 | 2~3초 | 노드 응답이 느리면 직전 캐시 사용 |
| `getlottoinfo` | 조회, 블록 탐색 | 3~5초 | 블록 데이터 검색 시간 고려 |
| `getjackpotpool` | 조회, 상태 조회 | 2~3초 | 빠른 상태 조회, 느리면 캐시 fallback |
| `lottocommit` | 쓰기, TX 제출 | 10~15초 | TX 서명/브로드캐스트 시간 필요 |
| `lottoclaim` | 쓰기, TX 제출 | 10~15초 | TX 처리 시간 충분히 확보 |
| `lottocheckresult` | 조회, 결과 확인 | 5초 | 블록 탐색 필요 |

**핵심**: **타임아웃 값은 "경험치"가 아니라 "측정값"에서 출발해야 한다.**
Grafana에서 `jackpotchain_rpc_duration_seconds` p95를 측정하고, 그 값의 2~3배로 설정한다.

---

### 3-2. Retry — 자동 재시도

**무엇인가**
일시적인 실패(네트워크 순단, 일시적 과부하)에서 자동으로 다시 시도하는 메커니즘.

**왜 모든 실패에 무조건 재시도를 하면 안 되는가**

```
잘못된 예:
lottocommit 실패 → 자동 재시도 3회
→ 노드에 동일한 TX가 3번 제출 시도
→ 중복 트랜잭션 발생 위험
```

```
올바른 예:
getblockcount 실패 → 재시도 2회 (조회라 부작용 없음)
lottocommit 실패 → 재시도 금지 (쓰기라 중복 위험)
               → 대신 사용자에게 "처리 중" 상태로 안내
```

**재시도 가능 여부 판단 기준**

| 분류 | 재시도 | 이유 |
|------|--------|------|
| 조회성 RPC (getblockcount, getlottoinfo 등) | O | 여러 번 호출해도 상태 변화 없음 |
| 쓰기성 RPC (lottocommit, lottoclaim) | X | 중복 트랜잭션 제출 위험 |
| 네트워크 타임아웃으로 인한 실패 | 조건부 | 쓰기의 경우 TX가 이미 제출됐을 수도 있음 |
| HTTP 4xx 클라이언트 에러 | X | 요청 자체가 잘못됨, 재시도해도 같은 결과 |
| HTTP 5xx 서버 에러 | O (조회만) | 서버 일시 문제일 수 있음 |

**Exponential Backoff — 재시도 간격을 점점 늘리기**

```
1회 실패 → 즉시 또는 100ms 후 재시도
2회 실패 → 200ms 후 재시도
3회 실패 → 400ms 후 재시도
→ 포기
```

왜 간격을 늘리는가? 서버가 과부하 상태일 때 빠른 재시도는 오히려 서버를 더 힘들게 만든다.
**jitter(무작위 시간 추가)** 를 붙이면 여러 클라이언트가 동시에 재시도하는 "thundering herd" 문제도 방지한다.

```java
// Resilience4j Retry 설정 예시
RetryConfig retryConfig = RetryConfig.custom()
    .maxAttempts(3)                              // 최대 3회 시도 (최초 1회 + 재시도 2회)
    .waitDuration(Duration.ofMillis(200))        // 재시도 전 200ms 대기
    .enableExponentialBackoff(2, Duration.ofSeconds(2))  // 2배씩 증가, 최대 2초
    .enableRandomizedWait(0.5)                   // ±50% jitter
    .retryOnException(e -> e instanceof RpcTimeoutException)  // 이 예외만 재시도
    .build();
```

```yaml
# application.yml
resilience4j.retry:
  instances:
    rpcRead:
      max-attempts: 3
      wait-duration: 200ms
      exponential-backoff-multiplier: 2
      retry-exceptions:
        - io.github.resilience4j.core.InterruptedException
        - java.net.SocketTimeoutException
      ignore-exceptions:
        - com.ssatto.exception.RpcClientException  # 4xx류 - 재시도 의미없음
```

---

### 3-3. Circuit Breaker — 자동 차단기

**무엇인가**
전기 차단기와 같다. 과전류(연속 실패)가 감지되면 차단기를 열어 전류(요청)가 흐르지 못하게 막는다.

**3가지 상태**

```
[CLOSED] ────────────────────────────────────────────────────────
  정상 상태. 모든 요청이 Node로 전달됨.
  실패율을 집계 중.

  실패율 >= 임계치(예: 50%)가 되면 → [OPEN]으로 전환
─────────────────────────────────────────────────────────────────

[OPEN] ──────────────────────────────────────────────────────────
  차단 상태. Node로 요청을 보내지 않고 즉시 실패 처리.
  → 스레드 낭비 없음, 노드 부하 없음, 빠른 실패로 사용자 응답 개선

  waitDuration(예: 30초) 이후 → [HALF_OPEN]으로 전환
─────────────────────────────────────────────────────────────────

[HALF_OPEN] ─────────────────────────────────────────────────────
  탐색 상태. 제한된 수의 요청만 통과시켜 노드 회복 여부 확인.

  성공률 >= 임계치 → [CLOSED] 복귀 (정상화)
  성공률 < 임계치 → [OPEN] 재전환 (아직 회복 안 됨)
─────────────────────────────────────────────────────────────────
```

**이 상태 전환을 시각화하면**

```
       연속 실패 50% 이상                  30초 대기 후
CLOSED ─────────────────▶ OPEN ─────────────────▶ HALF_OPEN
  ▲                                                    │
  │  회복 확인됨 (성공률 높음)                           │
  └────────────────────────────────────────────────────┘
                                              실패율 높음 시 OPEN으로 재전환
```

**왜 "즉시 실패"가 오히려 좋은가**

OPEN 상태에서 즉시 실패를 반환하면:
1. 스레드가 타임아웃까지 기다리지 않아도 됨 → 스레드 풀 여유 생김
2. Node에 추가 부하를 주지 않아 Node가 빠르게 회복할 수 있음
3. 사용자는 "타임아웃 10초 대기" 대신 즉시 fallback 응답을 받음

```java
// Resilience4j CircuitBreaker 설정
CircuitBreakerConfig cbConfig = CircuitBreakerConfig.custom()
    .slidingWindowType(COUNT_BASED)        // 최근 N건 기준 실패율 계산
    .slidingWindowSize(20)                 // 최근 20건
    .failureRateThreshold(50)             // 50% 이상 실패 시 OPEN
    .waitDurationInOpenState(Duration.ofSeconds(30))  // 30초 후 HALF_OPEN
    .permittedNumberOfCallsInHalfOpenState(5)          // HALF_OPEN에서 5건만 허용
    .build();
```

```yaml
# application.yml
resilience4j.circuitbreaker:
  instances:
    rpcClient:
      sliding-window-type: COUNT_BASED
      sliding-window-size: 20
      failure-rate-threshold: 50
      wait-duration-in-open-state: 30s
      permitted-number-of-calls-in-half-open-state: 5
      record-exceptions:
        - java.net.SocketTimeoutException
        - com.ssatto.exception.RpcServerException
```

**Fallback — 차단기 열렸을 때 대신 줄 응답**

```java
@CircuitBreaker(name = "rpcClient", fallbackMethod = "getBlockCountFallback")
public Long getBlockCount() {
    return rpcClient.invoke("getblockcount", ...);
}

// circuit open 또는 실패 시 이 메서드 호출
private Long getBlockCountFallback(CallNotPermittedException e) {
    return redisTemplate.opsForValue().get("cache:blockcount");  // 마지막 성공값 반환
}
```

**차단기 vs 단순 재시도 차이**

| | 단순 재시도 | 서킷 브레이커 |
|--|-----------|------------|
| 장애 감지 범위 | 개별 요청 | 최근 N건 집계 |
| 실패 시 동작 | 재시도 후 실패 | 일정 기간 차단 |
| 스레드 낭비 | 있음 (타임아웃만큼) | 없음 (즉시 실패) |
| 노드 회복 배려 | 없음 | 있음 (OPEN 중 요청 차단) |
| 사용 시점 | 일시적 장애 | 지속적 장애 |

---

### 3-4. 멱등성 — 같은 요청을 여러 번 해도 결과가 같아야 한다

**무엇인가**
`f(f(x)) = f(x)` 수학적으로는 이렇게 표현한다. 실제로는 **같은 작업을 여러 번 실행해도 결과가 한 번 실행한 것과 동일한 성질**이다.

**왜 블록체인 TX에서 중요한가**

```
시나리오:
1. 사용자가 commit 버튼 클릭
2. Spring이 lottocommit RPC 호출
3. Node가 TX를 mempool에 넣음
4. 그런데 Node의 응답이 느려서 Spring에서 타임아웃 발생
5. Spring은 "실패"로 판단

→ 실제로는 TX가 이미 제출된 상태
→ 재시도하면 동일한 TX가 두 번 제출됨
→ 블록체인에 중복 처리 또는 TX 실패 발생
```

**HTTP 메서드별 멱등성 기본 특성**

| HTTP 메서드 | 멱등성 | 이유 |
|-----------|--------|------|
| GET | O | 조회는 상태를 바꾸지 않음 |
| PUT | O | 같은 내용으로 덮어쓰기 반복 = 동일 결과 |
| DELETE | O | 이미 삭제된 것을 다시 삭제해도 결과 동일 |
| POST | X (기본) | 호출할 때마다 새 리소스 생성 |

**멱등키 — POST를 멱등하게 만드는 방법**

요청마다 고유한 키를 부여하고, 서버가 동일한 키의 요청을 두 번 처리하지 않도록 한다.

```
클라이언트                           서버 (Redis)
────────                           ────────────
요청 생성 시 UUID 생성
idempotencyKey = "abc-123"

POST /lotto/commit
  Header: X-Idempotency-Key: abc-123
                              ────────────────────────────────▶
                                    Redis에서 "abc-123" 조회
                                    없으면 → TX 처리 + Redis에 저장 (TTL 24h)
                                    있으면 → 이전 결과 그대로 반환
                              ◀────────────────────────────────
응답 수신 (성공)

[타임아웃으로 응답 못 받은 경우]
POST /lotto/commit (재시도)
  Header: X-Idempotency-Key: abc-123  (동일한 키 재사용)
                              ────────────────────────────────▶
                                    Redis에서 "abc-123" 조회
                                    있음 → 이전 결과 그대로 반환 (중복 처리 없음)
                              ◀────────────────────────────────
```

**Spring에서 멱등키 처리 예시**

```java
@PostMapping("/lotto/commit")
public ResponseEntity<CommitResponse> commit(
    @RequestHeader(value = "X-Idempotency-Key", required = false) String idempotencyKey,
    @RequestBody CommitRequest request
) {
    if (idempotencyKey != null) {
        // Redis에서 이전 처리 결과 조회
        CommitResponse cached = redisTemplate.opsForValue()
            .get("idempotency:" + idempotencyKey);
        if (cached != null) {
            return ResponseEntity.ok(cached);  // 중복 요청 → 이전 결과 반환
        }
    }

    CommitResponse response = lottoService.commit(request);

    if (idempotencyKey != null) {
        // 처리 결과를 24시간 보관 (TTL)
        redisTemplate.opsForValue().set(
            "idempotency:" + idempotencyKey, response,
            Duration.ofHours(24)
        );
    }
    return ResponseEntity.ok(response);
}
```

**이 프로젝트에서의 멱등키 설계 포인트**

```
멱등키 생성 주체: 프론트엔드 (사용자 행동 단위로 UUID 생성)
멱등키 범위: 사용자 지갑 주소 + 요청 시각 조합으로 충돌 방지
보관 위치: Redis (TTL 24시간)
보관 형식: "idempotency:{key}" → JSON 직렬화된 응답
```

---

## 4. 이 프로젝트에서 어디에 적용하는가

### 4-1. RPC 메서드별 전략 매핑

```
조회성 RPC                쓰기성 RPC
getblockcount             lottocommit
getlottoinfo              lottoclaim
getjackpotpool
lottocheckresult

    │                          │
    ▼                          ▼
[짧은 타임아웃]           [긴 타임아웃]
2~5초                    10~15초
    │                          │
    ▼                          ▼
[재시도 허용]             [재시도 금지]
최대 2회                  중복 TX 위험
exponential backoff
    │                          │
    ▼                          ▼
[circuit breaker]         [circuit breaker]
실패 시 캐시 fallback     실패 시 "처리 중" 상태
    │                          │
    ▼                          ▼
Redis 마지막 성공값       멱등키로 중복 방지
반환                      사용자에게 "확인 필요" 안내
```

### 4-2. 메인 대시보드 조회 흐름

```
[블록 높이 조회 요청]
         │
         ▼
  Circuit Breaker: CLOSED?
  ├── YES → RPC 호출
  │          │
  │          ├── 성공 → Redis 캐시 갱신 후 반환
  │          └── 실패 → Retry (최대 2회)
  │                    │
  │                    ├── 성공 → Redis 캐시 갱신 후 반환
  │                    └── 실패 → Redis 마지막 캐시 반환 + "일시 지연" 표시
  │
  └── NO (OPEN) → 즉시 Redis 캐시 반환 + "일시 지연" 표시
```

### 4-3. Commit/Claim 쓰기 흐름

```
[lottocommit 요청]
         │
         ▼
  멱등키 Redis 조회
  ├── 존재 → 이전 결과 즉시 반환 (중복 방지)
  └── 없음 → RPC 호출
              │
              ├── 성공 → 멱등키 + 결과 Redis 저장 → 성공 응답
              └── 실패
                   ├── 타임아웃: "처리 중" 상태 반환 (TX 실제 제출됐을 수 있음)
                   └── 명확한 오류: 실패 응답
```

---

## 5. Resilience4j vs 다른 선택지 비교

### 5-1. 왜 Resilience4j인가

| | Resilience4j | Netflix Hystrix | 직접 구현 |
|--|-------------|----------------|---------|
| 현재 유지보수 | O (활발) | X (개발 중단 2018년) | O |
| Spring Boot 통합 | spring-cloud-starter-circuitbreaker | hystrix-spring-cloud | 없음 |
| 함수형 API | O | X | - |
| 의존성 무게 | 가벼움 (모듈별 추가) | 무거움 | 최소 |
| 학습 난이도 | 중간 | 중간 | 높음 |
| 기능 | CB + Retry + RateLimit + Bulkhead | CB + Timeout | 원하는 것만 |

**결론**: Hystrix는 이미 개발 중단, 직접 구현은 엣지 케이스가 많다.
이 프로젝트 규모에서 Resilience4j가 가장 현실적이다.

### 5-2. Retry 전략 비교

| 방식 | 설명 | 적합한 상황 |
|------|------|-----------|
| Fixed delay | 항상 같은 간격으로 재시도 | 단순하지만 thundering herd 위험 |
| Exponential backoff | 지수적으로 간격 증가 | 서버 과부하 배려 |
| Exponential + jitter | 지수 + 무작위 추가 | 다수 클라이언트 동시 재시도 방지 (권장) |

### 5-3. Circuit Breaker 카운팅 방식 비교

| 방식 | 설명 | 적합한 상황 |
|------|------|-----------|
| COUNT_BASED | 최근 N건 기준 실패율 | 요청 수가 고르게 분포할 때 |
| TIME_BASED | 최근 N초 기준 실패율 | 요청 수 변동이 클 때 (새벽/낮 트래픽 차이) |

**이 프로젝트**: 트래픽 변동이 있으나 대시보드 polling으로 고른 편 → COUNT_BASED 적합

---

## 6. 전체 데이터 흐름

### 6-1. 조회 RPC 흐름 (Circuit Breaker + Retry + Fallback)

```
HTTP 요청
    │
    ▼
RpcService.getBlockCount()
    │
    ├─[Circuit: OPEN]──────────────────────────▶ Fallback: Redis 캐시 반환
    │
    └─[Circuit: CLOSED/HALF_OPEN]
          │
          ▼
     Retry Decorator (최대 2회 재시도)
          │
          ├─[1차 시도]──▶ HTTP RPC 호출 (타임아웃 3초)
          │               ├── 성공 → Redis 캐시 갱신 + 반환
          │               └── 실패
          │
          ├─[2차 시도, 200ms 후]──▶ HTTP RPC 호출
          │               ├── 성공 → Redis 캐시 갱신 + 반환
          │               └── 실패
          │
          └─[모두 실패]
                │
                ▼
          Circuit에 실패 기록
          (실패율 50% 초과 시 Circuit OPEN)
                │
                ▼
          Fallback: Redis 캐시 반환
          + 로그: BusinessEventLogger.error(JACKPOTCHAIN_RPC_FAILURE, ...)
```

### 6-2. 쓰기 RPC 흐름 (멱등성 + Circuit Breaker)

```
POST /lotto/commit
  X-Idempotency-Key: abc-123
    │
    ▼
Redis 멱등키 조회 "idempotency:abc-123"
    ├── 존재 → 기존 결과 반환 (중복 처리 없음)
    └── 없음
          │
          ▼
     Circuit Breaker 확인
          ├─[OPEN]──▶ 503 + "노드 일시 불안정, 잠시 후 재시도" 응답
          └─[CLOSED]
                │
                ▼
           HTTP RPC 호출 (타임아웃 12초, 재시도 없음)
                │
                ├── 성공
                │     │
                │     ▼
                │   txId 반환 + Redis에 멱등키 결과 저장 (TTL 24h)
                │
                ├── 타임아웃
                │     │
                │     ▼
                │   202 Accepted + "처리 중" 응답
                │   (TX가 이미 제출됐을 수 있으므로 실패 처리 불가)
                │
                └── 명확한 실패 (잔액 부족 등)
                      │
                      ▼
                    400/500 오류 응답
```

---

## 7. 이 프로젝트에서 얻을 수 있는 결과

### 7-1. 운영 안정성

| 시나리오 | 장애 처리 없을 때 | 장애 처리 적용 후 |
|---------|----------------|----------------|
| Node 1분간 응답 없음 | Spring 스레드 고갈, 서비스 다운 | Circuit open, 캐시 fallback, 서비스 계속 동작 |
| 일시적 네트워크 순단 | 사용자에게 에러 반환 | 자동 재시도 후 성공 |
| 사용자 commit 버튼 연타 | 중복 TX 제출 위험 | 멱등키로 1회만 처리 |
| Node 회복 후 | 수동 재시작 필요 | HALF_OPEN 자동 탐색 후 CLOSED 복귀 |

### 7-2. Grafana 모니터링과의 연동

```
Circuit Breaker 상태 변화 → Micrometer 메트릭으로 자동 기록

resilience4j_circuitbreaker_state{name="rpcClient"} 0 = CLOSED
                                                     1 = OPEN
                                                     2 = HALF_OPEN

resilience4j_circuitbreaker_calls_total{name="rpcClient",kind="failed"} 42
resilience4j_circuitbreaker_calls_total{name="rpcClient",kind="successful"} 380
```

Grafana에서 Circuit Breaker 상태를 패널로 시각화하면:
- OPEN 전환 즉시 알림 발송 가능
- 실패율 추이로 Node 건강 상태 선제 감지

### 7-3. 사용자 경험 개선

```
이전 (장애 처리 없음):
- Node 느림 → 대시보드 10초 흰 화면 → 에러 페이지

이후 (장애 처리 적용):
- Node 느림 → 대시보드 즉시 로드 (직전 캐시)
            → 상태 표시: "블록 정보 업데이트 중..."
            → 노드 회복 시 자동 갱신
```

---

## 8. 자주 헷갈리는 것들

**Q. Timeout과 Circuit Breaker를 같이 써야 하는가?**
다른 역할이다. Timeout은 "개별 요청의 최대 대기 시간"이고,
Circuit Breaker는 "연속 실패를 감지해 요청 자체를 차단"한다.
Timeout 없이 Circuit Breaker만 있으면, Circuit이 OPEN될 때까지 스레드를 계속 낭비한다.
**항상 Timeout을 먼저 설정하고, 그 위에 Circuit Breaker를 얹는다.**

**Q. Retry와 Circuit Breaker를 같이 쓸 때 순서가 중요한가?**
중요하다. 권장 순서:
```
요청 → Circuit Breaker → Retry → Timeout → 실제 RPC 호출
```
Circuit Breaker가 바깥에 있어야 Retry로 증폭된 실패도 집계된다.
반대로 하면 재시도 3회가 Circuit에는 3건의 실패로 기록되어 너무 빨리 OPEN된다.
→ Resilience4j에서는 `@CircuitBreaker` + `@Retry`를 같이 쓸 때 데코레이터 순서 주의.

**Q. 멱등키는 누가 만들어야 하는가?**
원칙적으로는 **요청을 시작하는 쪽(클라이언트)**이 만든다.
프론트엔드가 버튼 클릭 시 UUID를 생성해 헤더에 실어 보내는 방식이 이상적이다.
서버에서 만들면 이미 요청이 서버에 도달한 뒤이므로 진정한 멱등성을 보장하기 어렵다.

**Q. TX 타임아웃 시 "처리 중" 상태로 두는 게 맞는가?**
블록체인에서는 TX가 mempool에 들어간 뒤 응답이 늦을 수 있다.
타임아웃이 발생했다고 TX 제출이 실패한 것이 아닐 수 있으므로,
무조건 "실패" 처리하면 사용자가 중복 제출을 시도할 위험이 있다.
**"처리 중"으로 두고 `lottocheckresult`로 결과를 주기적으로 확인하는 것이 안전하다.**

**Q. Circuit Breaker가 OPEN 중에도 일부 요청은 통과시킬 수 있는가?**
HALF_OPEN 상태가 그 역할을 한다.
`permittedNumberOfCallsInHalfOpenState` 설정값만큼만 통과시켜 회복 여부를 확인한다.
직접 "이 요청은 중요하니까 OPEN 중에도 보내줘"를 설정하는 것은 아니다.
중요한 요청은 별도 CircuitBreaker 인스턴스를 분리(예: `rpcWrite`, `rpcRead`)해 독립적으로 관리한다.

---

## 9. 학습 체크포인트

| 질문 | 답을 알면 이해한 것 |
|------|------------------|
| 왜 쓰기 RPC는 재시도하면 안 되는가? | 중복 TX 위험, 멱등성 미보장 |
| Circuit이 OPEN되면 어떤 이점이 있는가? | 스레드 절약, 노드 회복 시간 확보, 빠른 fallback |
| Exponential backoff에 jitter가 왜 필요한가? | thundering herd 방지 |
| 멱등키는 어디에 저장하고 얼마나 보관하는가? | Redis, TTL 24시간 |
| Timeout → Retry → Circuit 순서 이유는? | 각 계층의 역할 분리와 집계 정확성 |
| HALF_OPEN 상태의 목적은? | 자동 회복 탐지 |

---

## 10. 이 문서와 연결된 파일들

| 파일 | 역할 |
|------|------|
| `BE-ssatto/src/main/java/.../rpc/JackpotChainHttpRpcClient.java` | RPC 호출 진입점, Timeout 설정 위치 |
| `BE-ssatto/src/main/java/.../service/LottoService.java` | commit/claim 호출부, 멱등키 적용 위치 |
| `BE-ssatto/src/main/resources/application.yml` | Resilience4j 설정 (retry, circuitbreaker, timelimiter) |
| `docs/studies/monitoring.md` | Grafana에서 Circuit Breaker 메트릭 시각화 참고 |
| `docs/studies/overview.md` | 전체 아키텍처에서 RPC 호출 위치 |
