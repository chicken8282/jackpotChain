# Phase 5-1, 5-2: 모니터링 스택 구축 및 백엔드 메트릭 노출

> 작성일: 2026-03-25

---

## Overview

Phase 4 배포 환경 구축 완료 후, Phase 5-1(모니터링 서비스 Docker Compose)와 5-2(Backend 메트릭 노출)를 점검하고 미구현 항목을 구현했다.

**왜 했는가:**
- `/actuator/prometheus`가 노출되지 않아 Prometheus가 Spring 메트릭을 수집할 수 없었다.
- Grafana datasource가 자동으로 프로비저닝되지 않아 매번 수동 설정이 필요했다.
- promtail이 Docker 컨테이너 로그를 수집하지 못하고 `/var/log/*.log`만 수집하는 상태였다.
- 로컬 환경에서 Prometheus가 local backend를 스크랩할 수 없었다.

---

## Changed Files

| 파일 | 변경 이유 |
|------|----------|
| `BE-ssatto/build.gradle` | `micrometer-registry-prometheus` 의존성 추가 — 없으면 `/actuator/prometheus` endpoint가 아예 동작하지 않음 |
| `BE-ssatto/src/main/resources/application.yml` | `management.endpoints.web.exposure.include`에 `prometheus` 추가, `metrics.tags.application` 라벨 추가 |
| `monitoring/prometheus/prometheus.yml` | 로컬 backend scrape target(`host.docker.internal:8080`) 추가, env/color 라벨 추가 |
| `monitoring/promtail/config.yml` | Docker socket 기반 `docker_sd_configs` 방식으로 전면 교체 — 컨테이너 이름/서비스/프로젝트 라벨 자동 부착, JSON 파이프라인으로 `level`/`eventType` 라벨 추출 |
| `monitoring/grafana/provisioning/datasources/datasources.yml` | 신규 생성 — Prometheus와 Loki datasource를 Grafana 기동 시 자동 등록 |
| `docker-compose.monitoring.yml` | Grafana 환경변수(`GRAFANA_ADMIN_*`) 추가, datasource provisioning volume 마운트 추가, promtail에 Docker socket volume 추가, prometheus retention 플래그 추가 |

---

## Tests Run

### 빌드

```
docker compose -f docker-compose.local.yml build backend
```

결과: **PASS** — 이미지 빌드 성공

### 스택 실행

```
docker compose -f docker-compose.local.yml up -d
```

결과: **PASS** — 전 서비스 healthy

### `/actuator/prometheus` 확인

```
curl -sf http://localhost:8080/actuator/prometheus | head -5
```

결과: **PASS**

```
# HELP application_ready_time_seconds ...
# TYPE application_ready_time_seconds gauge
application_ready_time_seconds{application="jackpotchain-backend",...} 8.017
```

`application` 라벨이 정상 포함되어 있고, JVM/HTTP/HikariCP/RabbitMQ 등 메트릭이 전량 노출됨.

---

## Failed / Unresolved

### monitoring 스택 로컬 테스트 미수행

`docker-compose.monitoring.yml`은 `monitoring-net: external: true`로 외부 네트워크를 요구하므로, 로컬에서 실행하려면 아래 네트워크를 먼저 생성해야 한다.

```bash
docker network create monitoring-net
docker compose -f docker-compose.monitoring.yml up -d
```

이 테스트는 별도 실행이 필요하며 이번 세션에서는 local 스택 테스트만 수행했다.

**영향 범위:** 모니터링 스택 자체의 기능 검증(Grafana 접속, Loki 로그 조회)은 EC2 또는 추가 실행에서 확인해야 함.

### promtail docker_sd_configs 가용성

`docker_sd_configs`는 promtail 2.x+에서 지원되며 `grafana/promtail:latest` 이미지에 포함된다. Windows Docker Desktop 환경에서 `/var/run/docker.sock` 마운트는 `//var/run/docker.sock` 형태로 마운트해야 할 수 있다. EC2(Linux)에서는 정상 동작 예정.

---

## Next Steps

1. **EC2에서 monitoring 스택 실행 검증**
   ```bash
   docker network create monitoring-net
   docker compose -f ~/app/compose/docker-compose.monitoring.yml up -d
   # http://{EC2-IP}:3002 에서 Grafana 접속 확인
   # Prometheus http://{EC2-IP}:9090/targets 에서 spring-blue/green UP 확인
   ```

2. **Phase 5-3: Grafana 대시보드 구성**
   - Spring Boot 기본 대시보드 import (ID: 4701 또는 17175)
   - Loki 기반 eventType 검색 패널 추가

3. **Phase 5-4: Loki 로그 수집 검증**
   - Grafana → Explore → Loki에서 `{container="jc-backend-*"} | json | eventType="LOTTO_COMMIT_SUBMITTED"` 쿼리 확인

4. **보안: actuator endpoint 접근 제어**
   - 운영에서는 `/actuator/prometheus`를 외부에 직접 노출하지 않고 nginx에서 내부망만 허용하는 규칙 추가 필요
   - `nginx/CLAUDE.md` 참고하여 `/actuator/` 외부 차단 규칙 확인
