# 모니터링 학습 — Prometheus · Grafana · Loki · Micrometer

> 작성일: 2026-03-25
> 기준: docker-compose.monitoring.yml, monitoring/ 설정 파일, BE-ssatto 실제 코드

---

## 1. 왜 모니터링이 필요한가

운영 서버에서 다음 질문들에 즉시 답할 수 있어야 한다.

| 상황 | 질문 |
|------|------|
| 장애 발생 | 언제, 어떤 서비스가, 어떤 이유로 죽었는가? |
| 성능 저하 | 응답이 느린 구간이 DB인가, RPC인가, JVM인가? |
| 비즈니스 이상 | 오늘 로또 commit이 갑자기 0건인 이유가 뭔가? |
| 용량 계획 | 메모리/커넥션 풀이 앞으로 언제 고갈되는가? |

코드 로그만으로는 집계와 시각화가 불가능하고, 메트릭만으로는 원인 추적이 불가능하다.
**이 프로젝트는 메트릭(Prometheus) + 로그(Loki) + 시각화(Grafana)를 조합해 두 관점을 동시에 확보한다.**

---

## 2. 전체 구성 한 줄 요약

```
Spring Boot  ──메트릭 노출──▶  Prometheus  ──▶  Grafana (대시보드 · 알림)
    │                                               ▲
    │ stdout 로그 (JSON)                            │
    ▼                                               │
컨테이너 로그  ──수집──▶  Promtail  ──전송──▶  Loki  ──쿼리──┘

Docker 컨테이너  ──CPU/메모리──▶  cAdvisor  ──스크랩──▶  Prometheus
```

---

## 3. 기술 스택 구성 요소 & 역할

### 3-1. Prometheus — 메트릭 수집기

**무엇인가**
시계열 데이터베이스. 대상 서버에서 주기적으로(15초) `GET /actuator/prometheus`를 호출해 수치를 긁어간다.

**왜 "긁어오기(Pull)"인가**
Push 방식이면 각 서비스가 Prometheus 주소를 알아야 하고, 서비스가 죽으면 데이터가 안 온다.
Pull 방식이면 Prometheus가 스케줄대로 수집하고, 응답이 없으면 "down" 상태로 즉시 감지된다.

**저장 형식**
```
{메트릭명}{라벨들} 값 타임스탬프

예시:
jackpotchain_rpc_duration_seconds_count{application="jackpotchain-backend",method="getblockcount",outcome="success"} 42 1711300000
http_server_requests_seconds_count{status="200",uri="/api/v1/lotto/commit"} 7 1711300000
```

**이 프로젝트의 scrape targets**

```yaml
# prometheus.yml
- job_name: 'spring-local'
  targets: ['host.docker.internal:8080']   # 로컬 개발용

- job_name: 'spring-blue'
  targets: ['spring-blue:8080']            # Prod Blue

- job_name: 'spring-green'
  targets: ['spring-green:8080']           # Prod Green

- job_name: 'spring-dev'
  targets: ['spring-dev:8080']             # Dev
```

**PromQL — 쿼리 언어 예시**

```promql
# RPC p95 응답 시간 (5분 윈도우)
histogram_quantile(0.95,
  sum(rate(jackpotchain_rpc_duration_seconds_bucket[5m])) by (le, method)
)

# HTTP 5xx 에러율 (%)
sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m]))
/
sum(rate(http_server_requests_seconds_count[5m])) * 100

# 최근 2분간 로또 commit 요청 수/초
rate(http_server_requests_seconds_count{uri="/api/v1/lotto/commit",status="200"}[2m])
```

---

### 3-2. Micrometer — Spring Boot 메트릭 계측기

**무엇인가**
코드 안에서 "측정"을 담당하는 라이브러리. JVM, HTTP 서버, DB 커넥션 풀을 자동으로 계측하고,
개발자가 원하는 비즈니스 지점에 직접 계측을 추가할 수 있다.

**어떻게 노출되는가**

```
build.gradle:
  runtimeOnly 'io.micrometer:micrometer-registry-prometheus'

application.yml:
  management.endpoints.web.exposure.include: health,info,prometheus
```

→ Micrometer가 JVM/HTTP/HikariCP를 자동 계측
→ micrometer-registry-prometheus가 Prometheus 포맷으로 변환
→ `/actuator/prometheus`에서 노출
→ Prometheus가 15초마다 긁어감

**자동 계측되는 메트릭 목록**

| 카테고리 | 메트릭 이름 | 의미 |
|---------|------------|------|
| JVM | `jvm_memory_used_bytes` | Heap/Non-Heap 사용량 |
| JVM | `jvm_threads_live_threads` | 활성 스레드 수 |
| JVM | `jvm_gc_pause_seconds` | GC 정지 시간 |
| HTTP | `http_server_requests_seconds` | 요청 수, 지연 시간 (histogram) |
| HikariCP | `hikaricp_connections_active` | 현재 사용 중인 DB 커넥션 수 |
| HikariCP | `hikaricp_connections_pending` | 커넥션 대기 중인 요청 수 |
| RabbitMQ | `rabbitmq_connections` | 메시지 큐 연결 수 |

**직접 추가한 커스텀 메트릭 — RPC Timer**

```java
// JackpotChainHttpRpcClient.invoke()
Timer.Sample sample = Timer.start(meterRegistry);
String outcome = "success";
try {
    // HTTP 호출 수행
} catch (...) {
    outcome = "rpc_error";
} finally {
    sample.stop(Timer.builder("jackpotchain.rpc.duration")
        .tag("method", method)      // getblockcount, sendrawtransaction 등
        .tag("outcome", outcome)    // success, rpc_error, http_error
        .register(meterRegistry));
}
```

→ 이 코드 한 줄로 `/actuator/prometheus`에 아래 메트릭이 자동 생성됨:

```
jackpotchain_rpc_duration_seconds_count{method="getblockcount",outcome="success"} 42
jackpotchain_rpc_duration_seconds_sum{method="getblockcount",outcome="success"}  0.38
jackpotchain_rpc_duration_seconds_bucket{method="getblockcount",outcome="success",le="0.005"} 5
jackpotchain_rpc_duration_seconds_bucket{method="getblockcount",outcome="success",le="0.01"}  20
...
```

`_count`는 호출 횟수, `_sum`은 누적 시간, `_bucket`은 분포(히스토그램).
이 세 가지를 합쳐서 `histogram_quantile(0.95, ...)`로 p95 지연 시간을 계산할 수 있다.

---

### 3-3. Loki — 로그 집계 저장소

**무엇인가**
Prometheus와 같은 구조로 설계된 로그 저장소. Prometheus가 메트릭을 라벨로 인덱싱하듯,
Loki는 **로그를 라벨로만 인덱싱하고 본문은 압축 보관**한다.

**Elasticsearch와 차이**
Elasticsearch는 로그 본문 전체를 인덱싱 → 저장 공간이 크고 인프라가 무겁다.
Loki는 라벨만 인덱싱 → 가볍고 Grafana와 완벽하게 통합된다.
대신 full-text 검색 성능은 Elasticsearch가 낫다.

**설정 (loki/config.yml)**

```yaml
schema_config:
  configs:
    - from: 2026-01-01
      store: tsdb           # 인덱스 저장 방식
      object_store: filesystem
      schema: v13
      index:
        period: 24h         # 하루 단위 인덱스 파일
```

**LogQL — 로그 쿼리 언어 예시**

```logql
# 백엔드 에러 로그만 조회
{container=~"jc-backend.*"} | json | level="ERROR"

# eventType이 LOTTO_COMMIT_SUBMITTED인 로그만
{container=~"jc-backend.*"} | json | eventType="LOTTO_COMMIT_SUBMITTED"

# 특정 traceId로 요청 전체 추적
{container=~"jc-backend.*"} | json | traceId="9a7c4d7b"

# 최근 5분간 에러 발생 횟수
count_over_time(
  {container=~"jc-backend.*"} | json | level="ERROR" [5m]
)
```

---

### 3-4. Promtail — 로그 수집 에이전트

**무엇인가**
컨테이너에서 발생하는 로그를 수집해 Loki로 전송하는 에이전트.
Prometheus가 메트릭을 "긁어오는" 것과 반대로, Promtail은 로그를 "밀어넣는다."

**수집 방식 — Docker socket 감시**

```yaml
# promtail/config.yml
scrape_configs:
  - job_name: docker-containers
    docker_sd_configs:
      - host: unix:///var/run/docker.sock   # Docker 소켓에 직접 접근
        refresh_interval: 5s
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        target_label: container             # 라벨: container="jc-backend-local"
      - source_labels: [__meta_docker_container_label_com_docker_compose_service]
        target_label: service               # 라벨: service="backend"
    pipeline_stages:
      - json:
          expressions:
            level: level        # JSON 로그에서 level 필드 추출
            eventType: eventType
      - labels:
          level:                # 추출된 값을 Loki 라벨로 등록
          eventType:
```

**핵심**: `docker_sd_configs`로 모든 컨테이너 로그를 자동 발견하고,
JSON 파이프라인으로 `level`, `eventType` 필드를 Loki 라벨로 변환한다.
라벨이 되면 Loki에서 인덱스로 빠르게 검색할 수 있다.

**Spring Boot 로그가 JSON이 되는 이유**

```xml
<!-- logback-spring.xml -->
<springProfile name="prod">
    <appender name="STDOUT_JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdc>true</includeMdc>
        </encoder>
    </appender>
</springProfile>
```

`prod` 프로파일에서는 `LogstashEncoder`가 로그를 JSON 한 줄로 출력한다.
이 JSON을 Promtail이 수집하면 `level`, `eventType`, `traceId` 등이 Loki 라벨이 된다.

---

### 3-5. MDC (Mapped Diagnostic Context) — 요청 추적

**무엇인가**
스레드 로컬 저장소. HTTP 요청이 시작될 때 고유 ID를 넣어두면,
해당 요청을 처리하는 모든 코드에서 자동으로 로그에 ID가 붙는다.

**RequestLoggingFilter — 요청 시작 시 MDC 세팅**

```java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(...) {
        String requestId = resolveRequestId(request.getHeader("X-Request-Id"));
        String traceId = newTraceId();
        try {
            MDC.put("requestId", requestId);
            MDC.put("traceId", traceId);
            MDC.put("method", request.getMethod());
            MDC.put("uri", request.getRequestURI());
            filterChain.doFilter(request, response);
        } finally {
            MDC.clear();   // 요청 처리 후 반드시 정리
        }
    }
}
```

**결과 로그 (prod 환경, JSON)**

```json
{
  "timestamp": "2026-03-25T14:30:01.123+09:00",
  "level": "INFO",
  "service": "jackpotchain-backend",
  "profile": "prod",
  "traceId": "9a7c4d7b",
  "requestId": "f6f2bb10-ef07",
  "eventType": "LOTTO_COMMIT_SUBMITTED",
  "uri": "/api/v1/lotto/commit",
  "method": "POST",
  "walletAddress": "jack1abc...",
  "txId": "deadbeef...",
  "message": "lotto commit submitted"
}
```

이 한 줄에서 Loki는 `level`, `eventType`을 라벨로 인덱싱하고,
나머지 필드는 본문으로 압축 보관한다.

---

### 3-6. BusinessEventLogger — 핵심 이벤트 명시적 기록

**왜 AOP 자동 로깅을 안 쓰는가**
AOP로 모든 메서드를 자동 로깅하면 잡음이 너무 많아진다.
"무엇을 수집할지"가 코드에 명시되지 않아 Loki에서 검색 기준이 흐려진다.

**이 프로젝트의 핵심 이벤트**

```java
// AuthService.verify()
BusinessEventLogger.info(LoggingEventType.AUTH_TOKEN_ISSUED, "token issued",
    LoggingUtils.fields("walletAddress", address));

// WalletService.createWallet()
BusinessEventLogger.info(LoggingEventType.WALLET_REGISTERED, "wallet registered",
    LoggingUtils.fields("walletAddress", address));

// LottoService.commit()
BusinessEventLogger.info(LoggingEventType.LOTTO_COMMIT_SUBMITTED, "lotto commit submitted",
    LoggingUtils.fields("txId", txId, "walletAddress", fromAddress));

// LottoService.claim()
BusinessEventLogger.info(LoggingEventType.LOTTO_CLAIM_SUBMITTED, "lotto claim submitted",
    LoggingUtils.fields("txId", claimTxId, "walletAddress", fromAddress));

// ExchangeService.exchange()
BusinessEventLogger.info(LoggingEventType.EXCHANGE_TRANSACTION_SUBMITTED, "exchange submitted",
    LoggingUtils.fields("txId", txId, "walletAddress", fromAddress));
```

**`eventType` 열거형으로 오타 방지**

```java
public enum LoggingEventType {
    AUTH_TOKEN_ISSUED,
    WALLET_REGISTERED,
    EXCHANGE_TRANSACTION_SUBMITTED,
    LOTTO_COMMIT_SUBMITTED,
    LOTTO_CLAIM_SUBMITTED,
    JACKPOTCHAIN_TRANSACTION_SUBMITTED,
    JACKPOTCHAIN_RPC_FAILURE,
    JACKPOTCHAIN_RPC_SLOW,
    UNHANDLED_EXCEPTION
}
```

Loki에서 `eventType="LOTTO_COMMIT_SUBMITTED"` 검색 시 오타가 있으면 아무것도 안 나온다.
열거형이면 컴파일 타임에 잡힌다.

---

### 3-7. cAdvisor — 컨테이너 리소스 수집기

**무엇인가**
Google이 만든 컨테이너 메트릭 수집기. Docker 소켓에 접근해
각 컨테이너의 CPU 사용률, 메모리, 네트워크 I/O를 수집한다.

Prometheus는 cAdvisor의 `/metrics` 엔드포인트를 스크랩한다.
**Spring Boot가 죽어있어도** 컨테이너 자체의 리소스는 계속 수집된다.

---

### 3-8. Grafana — 시각화 + 알림

**무엇인가**
Prometheus와 Loki를 datasource로 연결해 대시보드와 알림을 만드는 UI.

**Provisioning — 코드로 대시보드 관리**

```
monitoring/grafana/provisioning/
├── datasources/
│   └── datasources.yml     → Grafana 기동 시 Prometheus, Loki 자동 연결
├── dashboards/
│   ├── dashboard.yml        → 이 폴더의 JSON 파일을 자동 import
│   ├── spring-overview.json → JVM / HTTP / HikariCP / RPC 대시보드
│   └── loki-logs.json       → 에러 로그 / 비즈니스 이벤트 로그 대시보드
└── alerting/
    └── rules.yml            → 알림 규칙 3개 코드로 관리
```

**이점**: Grafana를 새로 띄워도 대시보드가 자동으로 복원된다.
`grafana-data` Docker volume이 날아가도 JSON 파일이 있으면 재생성된다.

---

## 4. 전체 데이터 흐름

### 4-1. 메트릭 흐름

```
[Spring Boot JVM, HTTP, HikariCP]
[RPC Timer — jackpotchain.rpc.duration]
        │
        │  Micrometer가 수집
        │
        ▼
/actuator/prometheus  (HTTP endpoint)
        │
        │  Prometheus가 15초마다 GET 요청 ("Pull")
        │
        ▼
Prometheus TSDB (시계열 DB, 15일 보관)
        │
        │  Grafana가 PromQL로 쿼리
        │
        ▼
Grafana 대시보드 패널
        │
        │  임계치 초과 시
        ▼
Alert 발송 (설정한 채널로)
```

### 4-2. 로그 흐름

```
[Spring Boot stderr → stdout]
    │  logback-spring.xml
    │  prod: LogstashEncoder → JSON 한 줄
    │  local: 패턴 텍스트
    │
    ▼
Docker 컨테이너 stdout 로그
    /var/lib/docker/containers/{id}/{id}-json.log
    │
    │  Promtail이 docker_sd_configs로 자동 발견
    │  JSON 파이프라인 → level, eventType 라벨 추출
    │  Loki API로 push (HTTP POST /loki/api/v1/push)
    │
    ▼
Loki 저장소
    │  라벨 인덱스: container, service, level, eventType
    │  본문: 압축 보관
    │
    │  Grafana가 LogQL로 쿼리
    │
    ▼
Grafana 로그 패널 / Explore
```

---

## 5. 이 프로젝트에서 얻을 수 있는 결과

### 5-1. Spring Overview 대시보드 (`spring-overview.json`)

Grafana 기동 시 자동으로 로드되는 대시보드다.

**JVM 섹션**
```
│ Heap Used    │ JVM Threads   │ GC Pause Duration  │
│ (게이지 그래프) │ (시계열)       │ (시계열)            │
```
→ 메모리 누수 조기 감지, GC 과다 발생 탐지

**HTTP 섹션**
```
│ Request Rate     │ p95 Latency  │ 5xx Error Rate  │
│ (엔드포인트별 RPS) │ (endpoint별) │ (시계열)         │
```
→ 어떤 API가 느린지 즉시 확인, 에러 급증 감지

**HikariCP 섹션**
```
│ Connections (active/pending/idle)  │ Acquire Duration p95  │
```
→ DB 커넥션 부족 사전 감지

**JackpotChain RPC 섹션**
```
│ RPC Duration p95 by Method  │ RPC Call Rate & Error Rate  │
```
→ 노드 응답이 느려지는 순간 즉시 감지, 어떤 RPC 메서드에서 오류가 나는지 확인

**Business Metrics 섹션**
```
│ Lotto Commit/Claim Rate  │ Exchange Request Rate  │
```
→ 오늘 commit이 왜 0건인지, exchange가 갑자기 급증했는지 확인

### 5-2. Loki 로그 대시보드 (`loki-logs.json`)

**에러 로그 패널**
```
Error/Warn Log Rate (시계열)
──────────────────────────────────────────────────────
2026-03-25 14:30:01 | ERROR | UNHANDLED_EXCEPTION
  {"traceId": "9a7c", "uri": "/api/v1/lotto/commit",
   "exception": "DataIntegrityViolationException", ...}
```
→ 에러 발생 즉시 원인과 트레이스 아이디 확인

**비즈니스 이벤트 패널**
```
Business Event Rate by eventType (시계열)
──────────────────────────────────────────────────────
LOTTO_COMMIT_SUBMITTED ██████████ 12/min
AUTH_TOKEN_ISSUED      ████       4/min
WALLET_REGISTERED      █          1/min
──────────────────────────────────────────────────────
2026-03-25 14:30:01 | INFO | LOTTO_COMMIT_SUBMITTED
  {"traceId": "9a7c", "walletAddress": "jack1abc...",
   "txId": "deadbeef..."}
```
→ traceId로 요청 전체 흐름 추적 (`{container=~"jc-backend.*"} | json | traceId="9a7c"`)

### 5-3. 알림 규칙 (`rules.yml`)

| 규칙 | 조건 | 심각도 |
|------|------|--------|
| RPC Latency Warning | RPC p95 > 3초 (2분 지속) | WARNING |
| HTTP 5xx Critical | 5xx 에러율 > 1% (1분 지속) | CRITICAL |
| Node 연결 끊김 | RPC error rate > 0.1/s (2분 지속) | CRITICAL |

→ 조건 충족 시 Grafana가 설정한 채널(이메일/슬랙)로 자동 발송

---

## 6. 메트릭 vs 로그 — 언제 무엇을 보는가

| 질문 | 도구 | 쿼리 예시 |
|------|------|----------|
| "지금 RPC 평균 응답은?" | Prometheus | `rate(jackpotchain_rpc_duration_seconds_sum[5m])` |
| "RPC 오류가 있었나?" | Prometheus | `rate(jackpotchain_rpc_duration_seconds_count{outcome="rpc_error"}[5m])` |
| "오류 원인 메시지는?" | Loki | `{container=~"jc-backend.*"} \| json \| level="ERROR"` |
| "이 요청의 전체 흐름은?" | Loki | `{container=~"jc-backend.*"} \| json \| traceId="9a7c"` |
| "commit이 이 시각에 몇 건?" | Prometheus | `rate(http_server_requests_seconds_count{uri="/api/v1/lotto/commit"}[5m])` |
| "commit 오류의 스택트레이스?" | Loki | `{container=~"jc-backend.*"} \| json \| eventType="UNHANDLED_EXCEPTION"` |
| "컨테이너 메모리가 급증?" | Prometheus (cAdvisor) | `container_memory_usage_bytes{name="jc-backend-local"}` |

**핵심 원칙**: 메트릭으로 "언제, 얼마나" 이상이 생겼는지 탐지하고,
로그에서 "왜, 어디서" 원인을 찾는다.

---

## 7. 포트 정리

| 서비스 | 호스트 포트 | 용도 |
|--------|-----------|------|
| Prometheus | 9090 | `http://EC2:9090/targets` → 수집 대상 상태 확인 |
| Grafana | 3002 | `http://EC2:3002` → 대시보드 (admin/admin) |
| Loki | 3100 | Promtail → Loki 내부 통신 (직접 접근 불필요) |
| cAdvisor | 8088 | 컨테이너 메트릭 원본 (`/metrics`) |

---

## 8. 자주 헷갈리는 것들

**Q. `_count`, `_sum`, `_bucket` 차이가 뭔가?**
Histogram 타입 메트릭은 자동으로 3개 시리즈를 생성한다.
- `_count`: 호출 횟수 (Counter)
- `_sum`: 누적 응답 시간 (Counter)
- `_bucket{le="N"}`: N초 이하로 완료된 비율 (le = less than or equal)
→ `histogram_quantile(0.95, rate(_bucket[5m]))` 로 p95를 계산한다.

**Q. `rate()`가 왜 필요한가?**
Counter는 서버가 재시작되면 0으로 초기화된다.
`rate()`는 지정 시간 범위의 초당 증가율을 계산해 재시작 초기화를 보정한다.
`increase()`는 지정 시간 범위의 절대 증가량.

**Q. MDC.clear()를 안 하면?**
`Thread pool`에서 스레드가 재사용되므로 이전 요청의 `traceId`가 다음 요청 로그에 섞인다.
`RequestLoggingFilter`의 `finally` 블록이 이를 보장한다.

**Q. Loki와 Elasticsearch 중 왜 Loki인가?**
이 프로젝트 규모에서 Elasticsearch는 과하다.
Loki는 Grafana와 기본 통합이고, Prometheus와 같은 라벨 기반 모델이라 배우기 쉽다.
대신 로그 전문 검색이 필요하면 Elasticsearch가 맞다.

---

## 9. 이 문서와 연결된 파일들

| 파일 | 역할 |
|------|------|
| `monitoring/prometheus/prometheus.yml` | 수집 대상(scrape targets) 정의 |
| `monitoring/loki/config.yml` | Loki 저장 방식 설정 |
| `monitoring/promtail/config.yml` | 컨테이너 로그 수집 & 라벨 설정 |
| `monitoring/grafana/provisioning/datasources/datasources.yml` | Grafana datasource 자동 등록 |
| `monitoring/grafana/provisioning/dashboards/spring-overview.json` | JVM/HTTP/RPC 대시보드 |
| `monitoring/grafana/provisioning/dashboards/loki-logs.json` | 로그 조회 대시보드 |
| `monitoring/grafana/provisioning/alerting/rules.yml` | 알림 규칙 |
| `BE-ssatto/src/main/resources/logback-spring.xml` | prod → JSON 로그 포맷 |
| `BE-ssatto/src/main/java/.../logging/RequestLoggingFilter.java` | 요청별 traceId/requestId MDC 주입 |
| `BE-ssatto/src/main/java/.../logging/BusinessEventLogger.java` | 핵심 이벤트 구조화 기록 |
| `BE-ssatto/src/main/java/.../rpc/JackpotChainHttpRpcClient.java` | RPC Timer 계측 (Micrometer) |
| `docker-compose.monitoring.yml` | Prometheus, Grafana, Loki, Promtail, cAdvisor 실행 |
