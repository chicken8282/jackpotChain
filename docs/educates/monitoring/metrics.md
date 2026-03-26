# JackpotChain 메트릭 파이프라인 — Micrometer → Prometheus → Grafana

> 작성일: 2026-03-26
> 기준: monitoring/prometheus/prometheus.yml, monitoring/grafana/provisioning/, BE-ssatto JackpotChainHttpRpcClient.java

---

## 왜 메트릭이 필요한가 — 로그만으로는 부족한 것

로그는 "무슨 일이 일어났는가"를 서술한다. "RPC 호출 실패", "지갑 등록 완료" 같은 개별 사건이다. 반면 메트릭은 "지금 시스템 상태가 어떤가"를 수치로 표현한다. "지난 5분간 RPC 호출의 p95 응답 시간이 1.2초", "DB 커넥션 풀 대기가 8개"처럼 집계된 상태다.

"API가 느려졌다"는 민원이 들어왔을 때 로그를 뒤지면 개별 에러는 찾을 수 있지만 "얼마나 느려졌는지", "언제부터 느려졌는지", "어느 구간이 병목인지"는 알기 어렵다. 메트릭 대시보드가 있으면 타임라인으로 즉시 확인할 수 있다. 이 프로젝트는 Prometheus(수집·저장) + Micrometer(계측) + Grafana(시각화)를 조합해 이 관점을 확보한다.

---

## Prometheus Pull 모델 — 왜 "긁어오기"인가

Prometheus는 메트릭 수집을 Pull 방식으로 수행한다. Prometheus 서버가 주기적으로 각 서비스의 엔드포인트(`/actuator/prometheus`)에 HTTP GET 요청을 보내 메트릭을 가져온다.

> **Pull 모델:** 데이터 수집자(Prometheus)가 수집 대상에게 능동적으로 요청해 데이터를 가져오는 방식. 반대인 Push 모델은 수집 대상이 데이터를 수집자에게 밀어 넣는다.

Push 방식을 쓰면 각 서비스가 Prometheus 서버 주소를 알아야 한다. 서비스가 많아지면 설정 관리가 복잡해진다. 더 중요한 문제는 서비스가 죽었을 때다. 죽은 서비스는 Push를 보내지 않기 때문에 "데이터가 없는 것"인지 "서비스가 죽은 것"인지 구분하기 어렵다.

Pull 방식에서는 Prometheus가 스케줄대로 요청을 보내고, 응답이 없으면 즉시 해당 타깃을 `DOWN` 상태로 표시한다. 죽은 서비스를 자동으로 감지할 수 있다.

**실제 Prometheus 설정 (`monitoring/prometheus/prometheus.yml`):**

```yaml
global:
  scrape_interval: 15s  # 15초마다 모든 타깃 스크랩

scrape_configs:
  # 로컬 개발 환경
  - job_name: 'spring-local'
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['host.docker.internal:8080']
        labels:
          env: local

  # Dev 환경
  - job_name: 'spring-dev'
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['jc-spring-dev:8080']
        labels:
          env: dev

  # Prod Blue/Green 배포
  - job_name: 'spring-blue'
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['jc-spring-blue:8080']
        labels:
          env: prod
          color: blue

  - job_name: 'spring-green'
    metrics_path: /actuator/prometheus
    static_configs:
      - targets: ['jc-spring-green:8080']
        labels:
          env: prod
          color: green
```

Blue/Green 배포 환경을 별도 job으로 분리한 이유가 있다. Blue와 Green은 동시에 한 쪽만 실서비스 트래픽을 받는다. Prometheus는 두 job 모두를 수집하므로 배포 전후 지표를 비교하거나, 롤백 시 이전 버전 메트릭을 확인할 수 있다.

---

## Micrometer — Spring Boot 계측 추상화 레이어

Spring Boot는 메트릭 계측 라이브러리로 Micrometer를 사용한다. Micrometer가 중요한 이유는 추상화다. 코드에서 `MeterRegistry`에 타이머나 카운터를 등록하면, 런타임에 어떤 백엔드(Prometheus, Datadog, InfluxDB 등)를 쓰든 자동으로 해당 포맷으로 변환된다.

> **Micrometer:** Spring Boot의 메트릭 계측 파사드(Facade). 측정 코드(`Timer`, `Counter`, `Gauge`)를 특정 모니터링 시스템에 종속되지 않게 작성할 수 있게 해준다. `micrometer-registry-prometheus`를 추가하면 Prometheus 포맷으로 노출된다.

**노출 흐름:**

```
build.gradle:
  runtimeOnly 'io.micrometer:micrometer-registry-prometheus'

application.yml:
  management.endpoints.web.exposure.include: health,info,prometheus

→ Micrometer가 JVM/HTTP/HikariCP 자동 계측
→ micrometer-registry-prometheus가 Prometheus 텍스트 포맷으로 변환
→ /actuator/prometheus 엔드포인트로 노출
→ Prometheus가 15초마다 GET 요청으로 수집
```

---

## 메트릭 타입 — Counter, Gauge, Histogram, Summary

메트릭에는 용도에 따라 다른 타입을 사용해야 한다.

> **Counter:** 단조 증가하는 누적 카운터. 절대 감소하지 않는다. HTTP 요청 수, 에러 발생 수처럼 "몇 번 일어났는가"를 센다. `rate(counter[5m])`으로 초당 증가율로 변환해 사용한다.

> **Gauge:** 현재 상태값. 올라가거나 내려갈 수 있다. DB 커넥션 풀 활성 수, JVM 힙 사용량처럼 "지금 얼마인가"를 표현한다. `rate()`를 적용하지 않는다.

> **Histogram:** 관찰값을 버킷별로 분류한다. `_bucket{le="0.1"} 42`는 "0.1초 이하인 요청이 42건"을 의미한다. `histogram_quantile(0.95, rate(_bucket[5m]))`으로 p95 응답 시간을 계산할 수 있다. HTTP 응답 시간, RPC 호출 시간에 사용한다.

> **Summary:** Histogram과 유사하지만 클라이언트에서 분위수를 계산해 노출한다. 서버 자원을 더 쓰고 집계가 어려우므로 현재 Prometheus 생태계에서는 Histogram을 권장한다.

---

## 자동 계측 메트릭 — JVM, HTTP, HikariCP

Micrometer는 Spring Boot와 함께 다음 메트릭을 자동으로 계측한다.

| 카테고리 | 메트릭 | 타입 | 의미 |
|--------|--------|------|------|
| JVM | `jvm_memory_used_bytes` | Gauge | Heap/Non-Heap 사용량 |
| JVM | `jvm_memory_max_bytes` | Gauge | Heap 최대 용량 |
| JVM | `jvm_threads_live_threads` | Gauge | 활성 스레드 수 |
| JVM | `jvm_gc_pause_seconds` | Histogram | GC 정지 시간 (action, cause 라벨) |
| HTTP | `http_server_requests_seconds` | Histogram | 요청 수 + 응답 시간 분포 |
| HikariCP | `hikaricp_connections_active` | Gauge | 현재 사용 중인 커넥션 수 |
| HikariCP | `hikaricp_connections_pending` | Gauge | 커넥션 대기 중인 요청 수 |
| HikariCP | `hikaricp_connections_idle` | Gauge | 유휴 커넥션 수 |

`hikaricp_connections_pending`이 특히 중요하다. 이 값이 0보다 크면 애플리케이션 전체가 느린 것이 아니라 DB 커넥션 대기가 병목이라는 신호다. 성능 테스트 Step 1에서 `maximum-pool-size: 10 → 30`으로 늘린 이유가 여기에 있다.

`jvm_gc_pause_seconds`는 GC 정지 시간이다. `action=end of major GC, cause=G1 Humongous Allocation` 같은 라벨이 붙는다. 이 값이 급등하면 힙이 부족하거나 객체 생성 패턴에 문제가 있다는 신호다.

---

## 커스텀 RPC 타이머 — jackpotchain.rpc.duration

자동 계측으로는 볼 수 없는 부분이 있다. JackpotChain 노드에 대한 JSON-RPC 호출 지연 시간이다. HTTP 계층에서는 Spring이 `/actuator/prometheus`를 통해 외부 RPC를 측정할 수 없다. 직접 계측 코드를 추가해야 한다.

**실제 구현 (`JackpotChainHttpRpcClient.java`):**

```java
private static final String RPC_DURATION_METRIC = "jackpotchain.rpc.duration";
private static final long RPC_WARN_THRESHOLD_MS = 1_000L;  // 1초 초과 시 WARN

Timer.Sample sample = Timer.start(meterRegistry);
String outcome = "success";
try {
    // HTTP JSON-RPC 호출
} catch (BusinessException e) {
    outcome = "rpc_error";
    throw e;
} catch (RestClientException | IllegalArgumentException e) {
    outcome = "http_error";
    throw new BusinessException(ErrorCode.BLOCKCHAIN_RPC_FAILED, e);
} finally {
    sample.stop(Timer.builder(RPC_DURATION_METRIC)
        .description("JackpotChain RPC call duration")
        .tag("method", method)      // RPC 메서드명 (getblockcount, getblock 등)
        .tag("outcome", outcome)    // success | rpc_error | http_error
        .register(meterRegistry));
}
```

이 코드 한 줄로 `/actuator/prometheus`에 다음 메트릭이 자동 생성된다:

```
jackpotchain_rpc_duration_seconds_count{method="getblockcount",outcome="success"} 42
jackpotchain_rpc_duration_seconds_sum{method="getblockcount",outcome="success"}   0.38
jackpotchain_rpc_duration_seconds_bucket{method="getblockcount",outcome="success",le="0.005"} 5
jackpotchain_rpc_duration_seconds_bucket{method="getblockcount",outcome="success",le="0.1"}  35
```

`method` 태그로 어떤 RPC 메서드가 느린지, `outcome` 태그로 실패 유형이 어떤지를 구분해서 볼 수 있다. 성능 테스트에서 `getblock`, `getblockhash` 호출이 dashboard p95=7,689ms의 원인이었음을 이 메트릭으로 확인할 수 있다.

---

## cAdvisor — 컨테이너 레벨 리소스 계측

Micrometer는 JVM 내부(힙, 스레드, HTTP)를 측정한다. 컨테이너 자체의 CPU, 메모리, 네트워크는 JVM 바깥이다. cAdvisor가 이 영역을 담당한다.

> **cAdvisor (Container Advisor):** Google이 만든 컨테이너 메트릭 수집기. Docker 소켓과 `/sys`, `/var/lib/docker`에 접근해 각 컨테이너의 CPU 사용률, 메모리, 네트워크 I/O를 수집한다. `/metrics` 엔드포인트로 Prometheus가 스크랩한다.

cAdvisor의 핵심 가치는 Micrometer와의 관점 분리다. "API 응답이 느리다"는 현상이 있을 때 두 가지 원인이 가능하다. 하나는 애플리케이션 코드 문제(GC 과다, DB 쿼리 느림, RPC 느림)이고, 다른 하나는 컨테이너 자원 한계(CPU throttle, 메모리 부족으로 스왑 발생)다. Micrometer만 보면 첫 번째만 확인 가능하다. cAdvisor를 추가하면 두 번째 원인도 빠르게 확인할 수 있다.

주요 cAdvisor 메트릭:

| 메트릭 | 의미 |
|--------|------|
| `container_cpu_usage_seconds_total` | 컨테이너 누적 CPU 사용량 |
| `container_memory_usage_bytes` | 컨테이너 현재 메모리 사용량 |
| `container_memory_working_set_bytes` | 페이지 캐시 제외 실제 메모리 |
| `container_network_receive_bytes_total` | 수신 바이트 누적 |
| `container_network_transmit_bytes_total` | 송신 바이트 누적 |

Spring Boot 컨테이너가 죽어있어도 cAdvisor는 계속 동작하므로, 컨테이너가 죽기 직전까지의 자원 사용 추이를 볼 수 있다.

---

## Prometheus TSDB — 왜 시계열 데이터베이스인가

> **TSDB (Time-Series Database):** 타임스탬프와 함께 저장되는 수치 데이터에 특화된 데이터베이스. 시간 범위 쿼리, 다운샘플링, 효율적인 압축에 최적화되어 있다.

일반 관계형 DB에서 "지난 5분간 RPC 호출 수의 변화"를 쿼리하려면 `GROUP BY` + 시간 범위 인덱스가 필요하고, 데이터가 쌓일수록 느려진다. TSDB는 데이터가 시간 순서로 들어오는 특성을 알기 때문에 블록 단위로 시간 파티셔닝하고, 숫자 시계열에 특화된 압축(델타 인코딩, XOR 압축)을 적용한다. Prometheus 공식 벤치마크 기준 디스크 공간이 평균 1.3 bytes/sample로 매우 효율적이다.

Prometheus TSDB는 기본 15일 보관 정책을 사용한다. 장기 보관이 필요하면 Thanos나 Cortex 같은 원격 스토리지 연동이 필요하다. 이 프로젝트는 단기 운영 모니터링이 목적이므로 기본 설정으로 충분하다.

---

## Grafana Datasource Provisioning — 파일 기반 자동 등록

Grafana를 새로 띄울 때마다 Prometheus, Loki 연결을 수동으로 설정하면 실수가 생기고 환경마다 설정이 달라진다. Provisioning을 사용하면 파일로 datasource를 정의하고 Grafana 기동 시 자동으로 등록된다.

```yaml
# monitoring/grafana/provisioning/datasources/datasources.yml
datasources:
  - name: Prometheus
    uid: prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    uid: loki
    type: loki
    url: http://loki:3100
    jsonData:
      maxLines: 1000
```

`uid`를 고정하는 것이 핵심이다. Grafana 대시보드 JSON에서 datasource를 참조할 때 uid로 참조한다. uid가 바뀌면 대시보드의 모든 패널이 "datasource not found" 에러를 낸다. 파일로 uid를 고정해두면 이 문제가 없다.

---

## PromQL 핵심 쿼리 패턴

```promql
# RPC p95 응답 시간 (5분 윈도우, 메서드별)
histogram_quantile(0.95,
  sum(rate(jackpotchain_rpc_duration_seconds_bucket[5m])) by (le, method)
)

# HTTP 5xx 에러율 (%)
sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m]))
/
sum(rate(http_server_requests_seconds_count[5m])) * 100

# dashboard API p95 응답시간
histogram_quantile(0.95,
  sum(rate(http_server_requests_seconds_bucket{uri="/api/v1/blockchain/dashboard"}[5m])) by (le)
)

# HikariCP 커넥션 대기 현황 (Gauge이므로 rate() 없음)
hikaricp_connections_pending{application="jackpotchain-backend"}

# GC 정지 시간 평균 (5분)
rate(jvm_gc_pause_seconds_sum[5m]) / rate(jvm_gc_pause_seconds_count[5m])
```

`histogram_quantile(0.95, rate(_bucket[5m]))`에서 왜 `rate()`를 먼저 적용하는지 설명이 필요하다. `_bucket`은 Counter다(단조 증가). 직접 `histogram_quantile`에 넣으면 전체 누적 데이터 기준 분위수가 나온다. `rate()`를 적용하면 최근 5분간의 초당 증가율 기준이 되어 "지금 현재의" p95를 계산할 수 있다.

---

## 알림 설계 — 단순 임계치가 아닌 지속 임계치

단순 임계치 알림은 노이즈가 많다. p95가 일시적으로 500ms를 넘었다가 즉시 돌아오는 경우에도 알림이 간다. 진짜 문제는 "일정 기간 동안 지속되는 이상"이다.

Grafana 알림 규칙 설계 원칙:

- **단일 스파이크는 알림 제외:** `for: 5m` 설정으로 5분 이상 지속될 때만 발송
- **에러율 기준 설정:** 에러 1건이 아니라 에러율 5% 이상 지속 5분
- **RPC 지연 감지:** `jackpotchain_rpc_duration_seconds` p95 > 3초 지속 2분 (노드 문제 신호)

이 프로젝트의 `monitoring/grafana/provisioning/alerting/rules.yml`에 다음 세 가지 규칙이 코드로 관리된다:
1. HTTP 5xx 에러율 지속 알림
2. RPC 호출 p95 지연 알림
3. HikariCP 커넥션 대기 지속 알림

---

## 한계와 트레이드오프

**Prometheus는 장기 보관에 부적합하다:** 기본 15일 보관. 1년 치 트렌드를 보려면 Thanos/Cortex/VictoriaMetrics 같은 원격 스토리지가 필요하다.

**cAdvisor scrape job 누락:** 현재 `prometheus.yml`에는 Spring Boot scrape job만 있고 cAdvisor job이 없다. cAdvisor가 Docker Compose에 포함되어 있지만 Prometheus가 수집하려면 `job_name: cadvisor` job을 추가해야 한다.

**메트릭은 집계 데이터다:** p95=500ms는 "요청 중 95%가 500ms 이하"이지, 어떤 요청이 왜 느렸는지는 로그를 봐야 한다. 메트릭으로 "어디가 문제인가"를 파악하고, 로그로 "왜 문제인가"를 확인하는 두 관점의 조합이 필수다.

---

## 면접 Q&A

**Q1. Prometheus Pull 방식과 Push 방식을 비교하고, Pull의 장단점을 설명하라.**

Pull 방식에서 Prometheus는 설정된 스케줄(15초)마다 각 타깃의 `/actuator/prometheus`에 HTTP GET 요청을 보낸다. Push 방식에서는 각 서비스가 StatsD나 Pushgateway 같은 수신자에게 메트릭을 밀어 넣는다.

Pull의 장점: 첫째, 서비스 발견이 쉽다. Prometheus가 타깃 목록을 관리하고 어떤 서비스가 죽으면 즉시 DOWN으로 표시된다. Push에서는 죽은 서비스가 Push를 보내지 않아 "데이터 없음"과 "서비스 죽음"을 구별하기 어렵다. 둘째, 설정이 중앙화된다. 어떤 서비스에서 어떤 메트릭을 수집하는지 Prometheus 설정 한 곳에서 관리된다. 셋째, 서비스가 Prometheus 서버 주소를 알 필요가 없어 서비스 코드가 단순해진다.

Pull의 단점: 방화벽 뒤 서비스나 단명하는 배치 잡(batch job)은 Prometheus가 직접 스크랩할 수 없다. 이 경우에는 Pushgateway를 경유하는 방식을 사용한다.

**Q2. Counter와 Gauge의 차이를 설명하고, 각각 언제 사용하는가?**

Counter는 절대 감소하지 않는 단조 증가 값이다. 요청 수, 에러 수, 완료된 작업 수처럼 "몇 번 일어났는가"를 센다. Counter는 재시작 시 0으로 초기화된다. 분석할 때는 `rate(counter[5m])`으로 초당 증가율로 변환해서 사용한다. 절대값 자체는 의미 없고 변화율이 중요하다.

Gauge는 현재 상태값이다. 올라가거나 내려갈 수 있다. DB 커넥션 풀 활성 수, JVM 힙 사용량, 큐 대기 작업 수처럼 "지금 얼마인가"를 표현한다. Gauge에는 `rate()`를 적용하지 않는다. 이미 현재 상태를 나타내기 때문이다.

**Q3. histogram_quantile()을 사용할 때 반드시 rate()를 먼저 적용해야 하는 이유는 무엇인가?**

`http_server_requests_seconds_bucket`은 Counter 타입이다. `{le="0.1"} 1000`은 "서버 시작부터 지금까지 0.1초 이하인 요청 누적 1000건"을 의미한다. 이 누적값에 직접 `histogram_quantile`을 적용하면 서버 시작부터 지금까지 전체 요청 기준의 분위수가 나온다. 몇 시간 전 데이터와 지금 데이터가 섞인 값이다.

`rate(_bucket[5m])`을 먼저 적용하면 "최근 5분간 각 버킷의 초당 증가율"이 된다. 이 비율에 `histogram_quantile`을 적용하면 "최근 5분간의 요청 분포 기준 p95"가 계산된다. "지금 현재 p95가 얼마인가"를 알려면 rate() 먼저 적용이 필수다.

**Q4. cAdvisor가 Micrometer와 무엇이 다른가? 두 가지가 모두 필요한 이유는?**

Micrometer는 JVM 프로세스 내부를 측정한다. 힙 메모리, GC 횟수, HTTP 요청 처리 시간, DB 커넥션 풀 상태 등이다. 이것은 "애플리케이션이 어떻게 동작하는가"다.

cAdvisor는 컨테이너 외부에서 컨테이너 자원을 측정한다. Linux cgroup을 통해 컨테이너에 할당된 CPU 사용률, 실제 메모리 사용량, 네트워크 I/O를 수집한다. 이것은 "컨테이너가 얼마나 많은 자원을 쓰는가"다.

두 가지가 필요한 이유: API 응답이 느릴 때 원인이 두 가지일 수 있다. 첫째는 JVM GC 과다, DB 쿼리 느림, RPC 타임아웃처럼 애플리케이션 로직 문제다(Micrometer로 감지). 둘째는 컨테이너에 할당된 CPU가 throttle되거나 메모리 한계로 스왑이 발생하는 인프라 문제다(cAdvisor로 감지). Micrometer만 보면 두 번째 원인을 놓친다.

**Q5. Prometheus 보관 기간을 늘리면 어떤 트레이드오프가 있는가?**

보관 기간이 길어지면 디스크 사용량이 선형적으로 증가한다. 15일치 데이터가 10GB라면 30일은 20GB다. 더 심각한 문제는 쿼리 성능이다. Prometheus TSDB는 시간 블록(block) 단위로 데이터를 파티셔닝하는데, 조회 범위가 넓어질수록 더 많은 블록을 열어야 한다. "지난 30일 p95 트렌드"를 그리는 쿼리는 상당한 CPU와 I/O를 소비한다.

장기 보관이 필요한 경우 Thanos를 사용한다. Thanos는 Prometheus와 사이드카로 붙어 오래된 블록을 S3 같은 오브젝트 스토리지로 내보내고, Thanos Query가 단일 쿼리 인터페이스를 제공한다. 이 프로젝트 규모에서는 기본 15일 보관으로 충분하다.

**Q6. Grafana 알림과 로그 기반 알림의 차이는 무엇인가? 각각 어떤 상황에서 적합한가?**

Grafana 알림은 PromQL 쿼리 결과가 임계치를 초과할 때 발송된다. "HTTP 5xx 에러율이 5분 이상 5%를 초과하면 Slack 알림"처럼 수치 기반으로 동작한다. 집계된 상태 변화에 반응하기 때문에 지속적인 성능 저하나 에러율 증가 같은 "느리게 나빠지는" 상황을 잘 잡는다.

로그 기반 알림(Loki 기반)은 특정 로그 패턴이 나타날 때 반응한다. "JACKPOTCHAIN_RPC_FAILURE 로그가 1분에 10번 이상 나타나면 알림"처럼 이벤트 발생 기반이다. 한 번의 특정 에러 이벤트에 즉시 반응해야 할 때 적합하다.

상호 보완적으로 사용하는 것이 좋다. "API 응답이 전반적으로 느려졌다"는 메트릭 기반 알림이 더 적합하고, "특정 이상 이벤트(예: 알 수 없는 예외)가 발생했다"는 로그 기반 알림이 더 빠르다.
