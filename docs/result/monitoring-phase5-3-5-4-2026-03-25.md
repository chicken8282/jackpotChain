# Phase 5-3, 5-4: Grafana 대시보드 + Loki 로그 수집

> 작성일: 2026-03-25

---

## Overview

Phase 5-1/5-2 완료 후 5-3(Grafana 대시보드), 5-4(Loki 로그 수집)를 코드 레벨 작업과 웹 설정 작업으로 분리해 구현했다.

**코드 레벨 vs 웹 설정 구분:**

| 구분 | 항목 |
|------|------|
| 코드 레벨 (이번 구현) | RPC Micrometer Timer, Grafana provisioning 파일(대시보드 JSON, alert rules YAML, datasource UID) |
| 웹 설정 필요 | Alert contact point(이메일/슬랙), Grafana Explore에서 Loki 쿼리 실제 확인, 대시보드 패널 커스터마이징 |

---

## Changed Files

| 파일 | 변경 이유 |
|------|----------|
| `BE-ssatto/.../JackpotChainHttpRpcClient.java` | `MeterRegistry` 주입 + `invoke()`에 `Timer.Sample` 계측 추가. method/outcome 태그로 메트릭 분리 (`jackpotchain.rpc.duration{method, outcome}`) |
| `monitoring/grafana/provisioning/datasources/datasources.yml` | Prometheus/Loki datasource에 고정 UID(`prometheus`, `loki`) 추가 — dashboard JSON과 alert rules에서 참조 가능 |
| `monitoring/grafana/provisioning/dashboards/dashboard.yml` | 신규 — `/etc/grafana/provisioning/dashboards` 경로 기반 자동 대시보드 로드 설정 |
| `monitoring/grafana/provisioning/dashboards/spring-overview.json` | 신규 — JVM(heap, threads, GC), HTTP(RPS, p95 latency, 5xx rate), HikariCP(active/pending/idle), RPC(p95 duration, error rate), 비즈니스(commit/claim/exchange rate) |
| `monitoring/grafana/provisioning/dashboards/loki-logs.json` | 신규 — Error/Warn 로그 rate, business eventType 로그 필터(LOTTO_COMMIT_SUBMITTED 등), container 및 level 변수 |
| `monitoring/grafana/provisioning/alerting/rules.yml` | 신규 — 3개 alert 규칙 (RPC p95 > 3s / 5xx > 1% / node 연결 끊김) |

---

## Tests Run

### BE 빌드

```bash
docker compose -f docker-compose.local.yml build backend
```

결과: **PASS**

### backend 재기동 후 커스텀 메트릭 확인

```bash
curl -sf http://localhost:8080/actuator/prometheus | grep "jackpotchain_rpc"
```

결과: **PASS**

```
# HELP jackpotchain_rpc_duration_seconds JackpotChain RPC call duration
# TYPE jackpotchain_rpc_duration_seconds summary
jackpotchain_rpc_duration_seconds_count{application="jackpotchain-backend",method="getblock",outcome="success"} 2
jackpotchain_rpc_duration_seconds_count{application="jackpotchain-backend",method="getblockcount",outcome="success"} 5
jackpotchain_rpc_duration_seconds_count{application="jackpotchain-backend",method="getjackpotpool",outcome="success"} 5
...
```

`method`, `outcome` 태그 포함된 Timer 메트릭 정상 수집 확인.

---

## Failed / Unresolved

### Grafana/Loki 스택 로컬 검증 미수행

`docker-compose.monitoring.yml`은 `monitoring-net: external: true`를 요구하므로 별도 네트워크 생성 후 실행해야 한다. 이번 세션에서는 BE 빌드/메트릭 노출만 검증했다.

**EC2 실행 체크리스트:**
```bash
docker network create monitoring-net
docker compose -f ~/app/compose/docker-compose.monitoring.yml up -d
```

### Alert contact point 미설정

alert rules YAML로 규칙 자체는 프로비저닝되지만, 알림을 보낼 채널(이메일/슬랙)은 Grafana UI 또는 별도 contact-points.yml에서 설정해야 한다.

### Loki JSON 파이프라인 검증 미수행

promtail의 `pipeline_stages.json` 필드 추출이 실제 컨테이너 로그 포맷과 맞는지는 Grafana Explore에서 직접 확인 필요.

---

## 웹 설정 가이드라인

### 1. 모니터링 스택 실행 (EC2)

```bash
# 네트워크 생성 (1회)
docker network create monitoring-net

# 스택 실행
docker compose -f ~/app/compose/docker-compose.monitoring.yml up -d

# 상태 확인
docker compose -f ~/app/compose/docker-compose.monitoring.yml ps
```

### 2. Grafana 초기 접속

- URL: `http://{EC2-IP}:3002`
- ID/PW: `admin` / `admin` (환경변수 `GRAFANA_ADMIN_PASSWORD`로 변경 가능)
- JackpotChain 폴더에 대시보드 2개 자동 등록 확인

### 3. Prometheus targets 확인

- URL: `http://{EC2-IP}:9090/targets`
- `spring-blue`, `spring-green`, `spring-dev` job이 **UP** 상태인지 확인

### 4. Loki 로그 확인 (Grafana Explore)

Grafana → Explore → Loki datasource 선택 후 아래 쿼리 실행:

```logql
# 비즈니스 이벤트 로그
{container=~"jc-backend.*"} | json | eventType="LOTTO_COMMIT_SUBMITTED"

# 에러 로그
{container=~"jc-backend.*"} | json | level="ERROR"

# traceId 기준 추적
{container=~"jc-backend.*"} | json | traceId="<traceId값>"
```

### 5. Alert contact point 설정 (Grafana UI)

Grafana → Alerting → Contact points → New contact point

| 채널 | 설정 경로 |
|------|----------|
| 이메일 | Grafana → Admin → SMTP 설정 후 Email contact point |
| 슬랙 | Webhook URL 입력 → Slack contact point |

그 후 Grafana → Alerting → Notification policies → Default policy에 contact point 연결.

### 6. 추가 대시보드 import (선택)

Grafana UI에서 `+` → Import → ID 입력:
- `4701` (JVM Micrometer) — 상세 JVM 메트릭
- `10280` (Spring Boot Statistics) — HTTP endpoint별 상세

---

## Next Steps

1. **EC2 배포 후 monitoring 스택 실행 검증** — 위 가이드라인 1~3 수행
2. **Loki 로그 쿼리 검증** — `eventType` 기준 검색 패널 동작 확인
3. **Alert contact point 연결** — 실제 알림 채널 설정
4. **Phase 5-3 알림 검증** — 의도적 RPC 오류 주입 후 Grafana 알림 발송 확인
5. **Phase 6: 성능 테스트** — nGrinder/JMeter로 baseline 측정
