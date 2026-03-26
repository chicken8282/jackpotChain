# JackpotChain 로그 파이프라인 — Logback → Promtail → Loki → Grafana

> 작성일: 2026-03-26
> 기준: BE-ssatto/src/main/resources/logback-spring.xml, monitoring/promtail/config.yml, monitoring/loki/config.yml

---

## 왜 구조화 로그(JSON)인가

초기에는 사람이 읽기 쉬운 텍스트 형식으로 로그를 출력했다. 로컬에서 `docker logs`로 직접 보는 용도에는 충분하다. 그런데 운영 환경으로 올라가면 상황이 달라진다.

텍스트 로그의 문제는 패턴 파싱이다. `2026-03-26 14:30:01.123 ERROR [http-nio-8080-exec-6]`라는 줄에서 레벨을 추출하려면 공백 기준으로 자르거나 정규식을 써야 한다. 여기에 에러 메시지가 `: RPC failed — method=getblock, outcome=http_error`처럼 붙으면 파싱이 더 복잡해진다. Promtail이 이 텍스트를 Loki에 넣을 때 `level=ERROR`라는 라벨을 붙이려면 별도 파싱 규칙을 관리해야 하고, 그 규칙과 실제 로그 포맷이 조금이라도 달라지면 라벨 추출이 깨진다.

JSON 형식이라면 다르다. 로그 한 줄이 이미 구조를 갖고 있어서 `level` 필드를 키로 바로 꺼낼 수 있다. 기계가 파싱하기 쉽고, Loki 라벨로 올리기도 쉽고, 새 필드를 추가해도 기존 파싱 규칙이 깨지지 않는다.

이 프로젝트가 선택한 답은 환경별 분리다. 로컬·개발 환경에서는 사람이 읽기 쉬운 텍스트로 출력하고, prod 환경에서만 JSON을 사용한다.

---

## 실제 Logback 설정

```xml
<!-- BE-ssatto/src/main/resources/logback-spring.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <springProperty scope="context" name="appName" source="spring.application.name" defaultValue="jackpotchain-backend"/>
    <springProperty scope="context" name="activeProfile" source="spring.profiles.active" defaultValue="local"/>

    <!-- local/dev/test: 사람이 읽기 쉬운 패턴 텍스트 -->
    <appender name="STDOUT_PATTERN" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss.SSS} %-5level [%thread] %logger{36} traceId=%X{traceId} requestId=%X{requestId} method=%X{method} uri=%X{uri} eventType=%X{eventType} - %msg%n</pattern>
        </encoder>
    </appender>

    <!-- prod: Promtail이 파싱할 수 있는 JSON 한 줄 -->
    <appender name="STDOUT_JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdc>true</includeMdc>
            <customFields>{"service":"${appName}","profile":"${activeProfile}"}</customFields>
        </encoder>
    </appender>

    <springProfile name="local,dev,test">
        <root level="INFO">
            <appender-ref ref="STDOUT_PATTERN"/>
        </root>
    </springProfile>

    <springProfile name="prod">
        <root level="INFO">
            <appender-ref ref="STDOUT_JSON"/>
        </root>
    </springProfile>
</configuration>
```

`LogstashEncoder`의 `<includeMdc>true</includeMdc>`가 핵심이다. MDC에 담긴 모든 키-값이 JSON 필드로 자동 포함된다. `customFields`로 `service`, `profile`을 고정 필드로 박아두면, 로그를 Loki에서 볼 때 어떤 서비스의 어떤 환경에서 온 로그인지 바로 알 수 있다.

> **LogstashEncoder:** Logback 로그를 JSON 한 줄로 직렬화하는 인코더. `logstash-logback-encoder` 라이브러리가 제공한다. MDC 필드 전체를 JSON 키로 자동 포함하며, 타임스탬프 포맷도 ISO 8601로 출력한다.

---

## MDC (Mapped Diagnostic Context) — 요청 단위 문맥 전파

HTTP 요청 하나를 처리하는 동안 Service, Repository, RPC Client 등 여러 클래스에서 로그가 찍힌다. 이 로그들을 나중에 "이 요청에서 어떤 일이 일어났는지" 순서대로 추적하려면 모든 로그에 동일한 식별자가 붙어 있어야 한다.

문제는 로그 메서드에 식별자를 파라미터로 전달하는 것이 불가능에 가깝다는 점이다. 호출 스택이 깊어질수록 `log.info("...", traceId, requestId, ...)`처럼 식별자를 계속 들고 다녀야 하고, 기존 메서드 시그니처를 전부 바꿔야 한다.

MDC는 스레드 로컬 저장소를 활용해 이 문제를 해결한다. 요청이 들어오는 시점에 한 번만 식별자를 저장해 두면, 같은 스레드에서 실행되는 모든 코드가 자동으로 그 값에 접근할 수 있다. Logback은 `%X{키}` 패턴(텍스트 포맷) 또는 `<includeMdc>true</includeMdc>`(JSON 포맷)으로 MDC 값을 로그에 자동 삽입한다.

> **MDC (Mapped Diagnostic Context):** SLF4J/Logback이 제공하는 스레드 로컬 키-값 저장소. `MDC.put(key, value)`로 값을 넣으면 같은 스레드에서 실행되는 로그 출력 시 자동으로 포함된다. 요청 추적 식별자처럼 컨텍스트 전파가 필요한 값에 사용한다.

**실제 구현 — RequestLoggingFilter:**

```java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(...) {
        String requestId = LoggingUtils.resolveRequestId(request.getHeader(REQUEST_ID_HEADER));
        String traceId = LoggingUtils.newTraceId();

        try {
            MDC.put(LoggingFields.REQUEST_ID, requestId);
            MDC.put(LoggingFields.TRACE_ID, traceId);
            MDC.put(LoggingFields.METHOD, request.getMethod());
            MDC.put(LoggingFields.URI, request.getRequestURI());
            response.setHeader(REQUEST_ID_HEADER, requestId); // 응답 헤더에도 포함
            filterChain.doFilter(request, response);
        } finally {
            // MDC.clear() 대신 개별 remove — 다른 필터가 세팅한 MDC를 보존
            MDC.remove(LoggingFields.REQUEST_ID);
            MDC.remove(LoggingFields.TRACE_ID);
            MDC.remove(LoggingFields.METHOD);
            MDC.remove(LoggingFields.URI);
        }
    }
}
```

`MDC.clear()` 대신 `MDC.remove()`를 쓰는 이유가 있다. Spring Security나 다른 라이브러리가 MDC에 자체적으로 값을 넣어두는 경우, `clear()`를 호출하면 내가 관여하지 않은 값까지 지워버린다. `remove()`는 내가 넣은 키만 제거하므로 안전하다.

**MDC의 치명적 한계 — 비동기 경계 문제:**

MDC는 스레드 로컬이기 때문에 `@Async`, `CompletableFuture.supplyAsync()`, Spring `TaskExecutor` 등을 통해 다른 스레드로 작업이 넘어가면 MDC 값이 사라진다. 이 프로젝트에서는 Step 4 성능 개선에서 `CompletableFuture`로 RPC를 병렬 호출하는 방안을 검토했는데, 해당 비동기 코드에서는 MDC 전파가 끊겨 `traceId`가 로그에 나타나지 않는다. 비동기 코드에서 MDC를 전파하려면 작업 제출 전에 `MDC.getCopyOfContextMap()`으로 스냅샷을 찍고 새 스레드에서 `MDC.setContextMap()`으로 복원해야 한다.

---

## BusinessEventLogger — 고정 eventType으로 Loki 라벨 안정성 확보

비즈니스 이벤트를 로그로 남길 때 자유 문자열을 쓰면 문제가 생긴다. 예를 들어 `log.info("lotto commit submitted")`라고 쓰면 다음 주에 `log.info("Lotto commit submitted")` (대문자)로 바뀌어도 컴파일이 된다. 그런데 Loki에서 `eventType="lotto commit submitted"` 쿼리를 걸어두면 대문자로 바뀐 순간부터 결과가 안 나온다.

열거형(enum)으로 고정하면 오타나 변경이 컴파일 타임에 잡힌다.

**실제 이벤트 타입 열거형:**

```java
public enum LoggingEventType {
    // 정상 비즈니스 이벤트 (INFO)
    AUTH_TOKEN_ISSUED,
    WALLET_REGISTERED,
    WALLET_ONBOARDING_REWARD_GRANTED,
    EXCHANGE_TRANSACTION_SUBMITTED,
    LOTTO_COMMIT_SUBMITTED,
    LOTTO_CLAIM_SUBMITTED,
    JACKPOTCHAIN_TRANSACTION_SUBMITTED,

    // 에러/경고 이벤트 (WARN/ERROR)
    BUSINESS_EXCEPTION,
    VALIDATION_EXCEPTION,
    UNHANDLED_EXCEPTION,
    JACKPOTCHAIN_RPC_FAILURE,
    JACKPOTCHAIN_RPC_SLOW
}
```

**사용 예시:**

```java
// LottoService.commit()
BusinessEventLogger.info(LoggingEventType.LOTTO_COMMIT_SUBMITTED, "lotto commit submitted",
    LoggingUtils.fields("txId", txId, "walletAddress", fromAddress));
```

이 코드가 실행되면 prod 환경에서 아래와 같은 JSON 한 줄이 stdout에 출력된다:

```json
{
  "timestamp": "2026-03-26T14:30:01.123+09:00",
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

---

## 전체 파이프라인 — stdout에서 Grafana까지

```
Spring Boot (prod 프로파일)
  LogstashEncoder → JSON 한 줄 → stdout
          │
          ▼
Docker 컨테이너 stdout
  /var/lib/docker/containers/{id}/{id}-json.log
          │
          │  Promtail이 5초마다 docker_sd_configs로 갱신
          ▼
Promtail 수집 에이전트
  JSON 파이프라인:
    level, eventType → Loki 라벨 (인덱스)
    traceId, requestId, walletAddress, txId → 본문 필드만
          │
          │  HTTP POST /loki/api/v1/push
          ▼
Loki 저장소
  라벨 인덱스: container, service, level, eventType
  본문: 압축 보관
          │
          │  Grafana LogQL 쿼리
          ▼
Grafana 대시보드 / Explore
```

---

## Promtail — docker_sd_configs와 라벨 설계

**실제 Promtail 설정 (`monitoring/promtail/config.yml`):**

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker-containers
    docker_sd_configs:
      - host: unix:///var/run/docker.sock   # Docker 소켓 직접 접근
        refresh_interval: 5s                # 5초마다 컨테이너 목록 갱신
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        regex: "/(.*)"
        target_label: container
      - source_labels: [__meta_docker_container_label_com_docker_compose_service]
        target_label: service
      - source_labels: [__meta_docker_container_label_com_docker_compose_project]
        target_label: compose_project
      - source_labels: [__meta_docker_container_id]
        target_label: container_id
    pipeline_stages:
      - json:
          expressions:
            level: level
            eventType: eventType
            traceId: traceId        # 추출은 하되 라벨로 등록하지 않음
            requestId: requestId    # 추출은 하되 라벨로 등록하지 않음
            walletAddress: walletAddress
            txId: txId
      - labels:
          level:      # 인덱스 라벨로 등록
          eventType:  # 인덱스 라벨로 등록
      - output:
          source: message
```

`docker_sd_configs`를 쓰는 이유는 자동 발견이다. 컨테이너가 새로 뜨거나 내려가도 설정 파일을 건드리지 않아도 된다. Docker 소켓(`/var/run/docker.sock`)에 접근해 현재 실행 중인 컨테이너 목록을 가져오고, 각 컨테이너의 로그 파일 경로를 자동으로 추적한다.

> **docker_sd_configs:** Promtail의 Docker 서비스 디스커버리 기능. Docker 데몬 소켓에 직접 접근해 실행 중인 컨테이너를 주기적으로 스캔하고, 새 컨테이너가 추가되어도 자동으로 로그 수집을 시작한다. 개별 서비스마다 별도 수집 설정이 필요 없다.

---

## Loki 라벨 설계 — 카디널리티 폭발을 피하는 이유

이 설정에서 `traceId`와 `walletAddress`는 JSON에서 추출하지만 라벨로 등록하지 않는다. 왜인가?

Loki는 라벨 조합별로 별도 인덱스를 관리한다. `level=ERROR`는 값이 몇 개 안 된다(DEBUG, INFO, WARN, ERROR). `eventType`도 열거형으로 고정되어 있어 10여 가지다. 이 두 라벨의 조합은 수십 개 정도로 인덱스가 관리 가능하다.

반면 `traceId`는 요청마다 다른 값을 갖는다. 하루 수만 건의 요청이 들어오면 수만 가지 라벨 조합이 생긴다. 이것이 카디널리티 폭발이다. Loki는 각 라벨 조합마다 별도 스트림을 열고, 스트림이 많아질수록 메모리와 인덱스 파일이 폭발적으로 증가한다. 극단적인 경우 Loki 자체가 메모리 부족으로 죽는다.

> **카디널리티 (Cardinality):** 라벨 값의 고유한 경우의 수. `level` 라벨의 카디널리티는 4(DEBUG/INFO/WARN/ERROR), `traceId` 라벨의 카디널리티는 요청 수만큼 폭발적으로 증가한다. Loki는 고카디널리티 라벨을 본문(log body)에만 두고 라벨 인덱스에는 넣지 않을 것을 강력히 권장한다.

`walletAddress`도 마찬가지다. 사용자가 늘어날수록 라벨 조합이 무한히 증가한다. 따라서 이 값들은 JSON 본문에 저장하고 LogQL에서 `| json | traceId="9a7c4d7b"` 방식으로 전체 스캔으로 찾는다. 검색이 느리다는 단점은 있지만, 트레이스ID 검색은 드물고 빠른 범위 필터링이 필요한 것은 `level`, `eventType`이므로 이 트레이드오프는 합리적이다.

---

## LogQL 실제 쿼리 예시

```logql
# 백엔드 에러 로그만 조회
{container=~"jc-backend.*"} | json | level="ERROR"

# 특정 eventType만 필터
{container=~"jc-backend.*"} | json | eventType="LOTTO_COMMIT_SUBMITTED"

# 특정 traceId로 요청 전체 추적 (본문 스캔)
{container=~"jc-backend.*"} | json | traceId="9a7c4d7b"

# 최근 5분간 에러 발생 횟수
count_over_time(
  {container=~"jc-backend.*"} | json | level="ERROR" [5m]
)

# eventType별 이벤트 비율 (Grafana 시계열 패널)
sum by (eventType) (
  rate({container=~"jc-backend.*"} | json | eventType!="" [2m])
)
```

라벨로 등록된 `level`, `eventType`은 `{level="ERROR"}` 형식으로 인덱스를 사용해 빠르게 필터링된다. 라벨이 아닌 `traceId`는 `| json | traceId="..."` 형식으로 본문 전체를 스캔하므로 인덱스 필터를 먼저 좁혀두는 것이 중요하다.

---

## 한계와 트레이드오프

**Promtail은 Push, Prometheus는 Pull:** 로그와 메트릭의 수집 방향이 반대다. Promtail은 로그를 Loki에 밀어 넣고, Prometheus는 애플리케이션에서 메트릭을 긁어온다. 이 차이는 로그가 실시간 스트림이고 메트릭은 주기적 스냅샷이라는 특성에서 온다.

**prod에서만 JSON:** local/dev 환경에서는 텍스트 포맷을 유지하는 대신, Promtail이 로컬 컨테이너 로그를 파싱할 때 JSON 파이프라인이 동작하지 않아 `level`, `eventType` 라벨이 없는 상태로 Loki에 들어간다. 로컬에서도 Grafana를 통해 로그를 보려면 별도 처리가 필요하다.

**JSON 구조를 바꾸면 대시보드가 깨진다:** `LogstashEncoder`가 출력하는 JSON 필드명을 바꾸거나 제거하면 Promtail 파이프라인의 `expressions` 키가 추출에 실패하고, Loki 라벨이 사라지고, Grafana 대시보드 쿼리가 빈 결과를 반환한다. 로그 포맷은 수집 파이프라인과의 계약이다.

**MDC는 비동기 경계를 넘지 못한다:** `CompletableFuture`, `@Async` 메서드에서는 MDC가 전파되지 않아 `traceId`가 빠진 로그가 생긴다. 해당 코드에서는 수동 MDC 복원이 필요하다.

---

## 면접 Q&A

**Q1. Loki를 선택한 이유는 무엇인가? Elasticsearch와 비교해서 설명하라.**

Elasticsearch는 로그 본문 전체를 역인덱싱(inverted index)한다. 어떤 단어가 어떤 문서에 있는지 모두 인덱스로 관리하므로 full-text 검색이 빠르다. 반면 저장 공간이 크고(원본의 2~3배), JVM 기반이라 힙 메모리 관리가 복잡하며, 운영 난이도가 높다.

Loki는 라벨만 인덱싱하고 본문은 압축 보관한다. 인덱스 크기가 작아 저장 공간이 적게 들고, Prometheus/Grafana와 같은 생태계에서 자연스럽게 통합된다. 이 프로젝트에서는 검색 패턴이 `level=ERROR`나 `eventType=LOTTO_COMMIT_SUBMITTED` 같은 라벨 필터 위주이고, 임의 키워드 full-text 검색이 거의 없다. 이 사용 패턴에서는 Loki가 훨씬 가볍고 충분하다. Elasticsearch가 필요한 시나리오는 "어떤 에러 메시지가 있는지 모르고 키워드로 찾을 때"인데, 이 경우는 Grafana Explore의 본문 스캔 쿼리로 대부분 커버된다.

**Q2. Promtail과 Fluentd를 비교하면?**

Fluentd는 범용 로그 수집 에이전트로 수백 개의 플러그인을 통해 다양한 소스에서 다양한 대상으로 로그를 라우팅할 수 있다. Ruby 기반이라 유연하지만 메모리 사용이 상대적으로 크다. Promtail은 Loki 전용으로 설계된 에이전트다. Loki와 같은 생태계(Grafana Labs)에서 나왔기 때문에 Loki의 라벨 모델과 push API에 최적화되어 있고, 설정이 단순하다. `docker_sd_configs`처럼 Docker 컨테이너 자동 발견 기능도 내장되어 있어 별도 플러그인 없이 사용할 수 있다. 이 프로젝트처럼 Loki만 쓰는 단일 로그 파이프라인이라면 Promtail이 더 적합하다.

**Q3. MDC를 비동기 코드에서 사용할 때 어떤 문제가 생기는가? 해결 방법은?**

MDC는 `ThreadLocal` 기반이므로 다른 스레드로 작업이 넘어가면 값이 사라진다. `CompletableFuture.supplyAsync()`나 `@Async` 메서드에서 로그를 찍으면 `traceId`, `requestId` 필드가 비어 있다.

해결 방법은 두 가지다. 첫째, 작업 제출 전에 `MDC.getCopyOfContextMap()`으로 스냅샷을 찍고, 람다 안에서 `MDC.setContextMap(snapshot)`으로 복원한 후 작업을 수행하고 `MDC.clear()`로 정리한다. 둘째, `MDCTaskDecorator`를 구현해 Spring `ThreadPoolTaskExecutor`에 등록하면 모든 `@Async` 메서드에서 자동으로 MDC가 전파된다. 이 프로젝트의 Step 4(병렬 RPC)에서 `CompletableFuture`를 사용할 경우 이 문제가 발생하므로 주의가 필요하다.

**Q4. eventType을 자유 문자열 대신 열거형으로 고정한 이유는 무엇인가?**

세 가지 이유가 있다. 첫째 타입 안전성 — 오타가 컴파일 타임에 잡힌다. 자유 문자열이면 `"LOTTO_COMMIT_SUBMITTED"`를 `"LOTTO_COMIT_SUBMITTED"`로 써도 런타임까지 알 수 없다. 둘째 Loki 라벨 안정성 — `eventType`은 Loki 인덱스 라벨로 등록되어 있다. 값이 자유 문자열이면 언제든 새 값이 생겨 카디널리티가 증가한다. 열거형으로 고정하면 가능한 값의 집합이 코드베이스에 명확히 정의된다. 셋째 문서화 — enum 파일 자체가 "이 시스템에서 추적하는 비즈니스 이벤트 목록"이 된다. 새 이벤트를 추가하려면 enum에 명시적으로 추가해야 하므로 누락 위험이 줄어든다.

**Q5. 구조화 로그와 비구조화 로그의 차이를 설명하라. 왜 prod에서만 JSON을 쓰는가?**

구조화 로그(JSON)는 필드명과 값이 명확히 분리된 포맷이다. `{"level":"ERROR","traceId":"9a7c4d7b",...}` 형태라 파싱 없이 키로 바로 값을 꺼낼 수 있다. 비구조화 로그는 `2026-03-26 14:30:01 ERROR [exec-6] ...` 같은 텍스트로, 사람이 읽기 쉽지만 기계가 파싱하려면 패턴 규칙이 필요하다.

prod에서만 JSON을 쓰는 이유는 개발 편의성 때문이다. 로컬에서 `docker logs` 명령으로 로그를 볼 때 JSON 한 줄은 오히려 가독성이 떨어진다. `{"timestamp":"2026-03-26T14:30:01.123...","level":"INFO",...,"message":"lotto commit submitted"}`를 한눈에 읽는 것은 불편하다. 반면 prod에서는 사람이 직접 로그를 읽는 것이 아니라 Promtail이 수집하고 Grafana에서 파싱된 필드로 보기 때문에 JSON이 유리하다. 환경 분리는 이 두 목적을 동시에 달성하는 합리적 선택이다.

**Q6. Loki에서 "고카디널리티 라벨"이 문제가 되는 구체적 이유는 무엇인가?**

Loki는 라벨 조합별로 "스트림(stream)"을 생성한다. 스트림은 같은 라벨 집합을 가진 로그 항목들의 시계열이다. `{container="jc-backend", level="ERROR", eventType="JACKPOTCHAIN_RPC_FAILURE"}`는 하나의 스트림이고, 이 조합이 달라질 때마다 새 스트림이 열린다.

`traceId`를 라벨로 쓰면 요청마다 새 스트림이 생긴다. 스트림이 많아지면: 1) 각 스트림마다 인메모리 버퍼가 필요해 메모리 사용이 폭증한다. 2) WAL(Write Ahead Log) 크기가 커진다. 3) 컴팩션 성능이 저하된다. 4) 스트림 수가 일정 이상이면 Loki가 새 스트림 생성을 거부(`too many active streams`)하는 에러가 발생한다. `traceId`나 `walletAddress`는 카디널리티가 높으므로 본문에만 두고, 라벨은 카디널리티가 낮은 `level`(4종), `eventType`(10여 종)으로만 구성한다.
