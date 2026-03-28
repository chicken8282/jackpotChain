# JackpotChain 모니터링 구축 가이드

이 문서는 모니터링 스택(Prometheus + Loki + Grafana + Promtail + cAdvisor) 구축부터 Discord 알림 설정까지의 전 과정을 재현하기 위한 가이드입니다.

---

## 전체 구성 개요

```
[Spring Boot] --metrics--> [Prometheus] --query--> [Grafana]
[Docker 컨테이너 로그] --> [Promtail] --> [Loki] --query--> [Grafana]
[컨테이너 리소스] --> [cAdvisor] --metrics--> [Prometheus]
[Grafana] --webhook--> [Discord]
```

| 컨테이너 | 역할 | 포트 |
|---|---|---|
| `jc-prometheus` | 메트릭 수집 | 9090 |
| `jc-grafana` | 시각화 + 알림 | 3002 |
| `jc-loki` | 로그 저장 | 3100 |
| `jc-promtail` | 로그 수집 → Loki 전송 | - |
| `jc-cadvisor` | 컨테이너 리소스 수집 | 8088 |

---

## 사전 준비

### 1. Discord Webhook URL 발급

1. Discord 서버 → 알림 받을 채널 → **채널 편집(톱니바퀴)**
2. **연동** 탭 → **웹후크** → **새 웹후크**
3. 이름 설정 후 **웹후크 URL 복사**
4. `monitoring/grafana/provisioning/alerting/contact_points.yml` 의 `url` 필드에 붙여넣기

```yaml
# contact_points.yml
settings:
  url: "https://discord.com/api/webhooks/{채널ID}/{토큰}"
```

---

## 1단계: EC2 — 네트워크 및 디렉토리 구성

```bash
# Docker 네트워크 생성 (최초 1회만)
docker network create monitoring-net
docker network create dev-net

# 앱 디렉토리 구조 생성
mkdir -p ~/app/compose
mkdir -p ~/app/env
mkdir -p ~/app/monitoring/prometheus
mkdir -p ~/app/monitoring/loki
mkdir -p ~/app/monitoring/promtail
mkdir -p ~/app/monitoring/grafana/provisioning/datasources
mkdir -p ~/app/monitoring/grafana/provisioning/dashboards
mkdir -p ~/app/monitoring/grafana/provisioning/alerting
```

---

## 2단계: EC2 — 저장소 클론 및 파일 배포

```bash
# 저장소 클론 (최초 1회)
git clone https://lab.ssafy.com/s14-blochain-sub1/S14P21E202.git ~/deploy-repo
cd ~/deploy-repo
git checkout develop

# 모니터링 설정 파일 복사
cp ~/deploy-repo/docker-compose.monitoring.yml ~/app/compose/
cp ~/deploy-repo/monitoring/prometheus/prometheus.yml ~/app/monitoring/prometheus/
cp ~/deploy-repo/monitoring/loki/config.yml ~/app/monitoring/loki/
cp ~/deploy-repo/monitoring/promtail/config.yml ~/app/monitoring/promtail/
cp ~/deploy-repo/monitoring/grafana/provisioning/datasources/datasources.yml \
   ~/app/monitoring/grafana/provisioning/datasources/
cp ~/deploy-repo/monitoring/grafana/provisioning/dashboards/dashboard.yml \
   ~/app/monitoring/grafana/provisioning/dashboards/
cp ~/deploy-repo/monitoring/grafana/provisioning/dashboards/spring-overview.json \
   ~/app/monitoring/grafana/provisioning/dashboards/
cp ~/deploy-repo/monitoring/grafana/provisioning/dashboards/loki-logs.json \
   ~/app/monitoring/grafana/provisioning/dashboards/
cp ~/deploy-repo/monitoring/grafana/provisioning/alerting/contact_points.yml \
   ~/app/monitoring/grafana/provisioning/alerting/
cp ~/deploy-repo/monitoring/grafana/provisioning/alerting/notification_policies.yml \
   ~/app/monitoring/grafana/provisioning/alerting/
cp ~/deploy-repo/monitoring/grafana/provisioning/alerting/rules.yml \
   ~/app/monitoring/grafana/provisioning/alerting/
```

---

## 3단계: EC2 — 환경변수 파일 설정

```bash
# ~/app/env/.env.monitoring 파일 생성 (없으면 생성)
cat > ~/app/env/.env.monitoring << 'EOF'
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=변경할비밀번호
EOF
```

> **주의:** 비밀번호는 반드시 변경하세요. 기본값 `admin/admin` 사용 시 보안 경고가 표시됩니다.

---

## 4단계: EC2 — 모니터링 스택 기동

```bash
cd ~/app/compose

# 모니터링 스택 기동
docker compose -f docker-compose.monitoring.yml up -d

# 기동 상태 확인
docker compose -f docker-compose.monitoring.yml ps
```

**정상 상태 예시:**
```
NAME            STATUS          PORTS
jc-prometheus   Up              0.0.0.0:9090->9090/tcp
jc-grafana      Up              0.0.0.0:3002->3000/tcp
jc-loki         Up              0.0.0.0:3100->3100/tcp
jc-promtail     Up
jc-cadvisor     Up (healthy)    0.0.0.0:8088->8080/tcp
```

---

## 5단계: EC2 — 모니터링 스택 정상 여부 확인

```bash
# Prometheus 정상 응답 확인
curl -s http://localhost:9090/-/healthy

# Loki 정상 응답 확인
curl -s http://localhost:3100/ready

# Grafana 프로비저닝 로그 확인 (에러 없으면 OK)
docker logs jc-grafana 2>&1 | grep -i "provision\|error\|contact\|policy"
```

---

## 6단계: Spring Boot — Actuator + Prometheus 메트릭 설정

> 코드 레벨 작업. 이미 적용되어 있다면 건너뜁니다.

`build.gradle` 의존성:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'io.micrometer:micrometer-registry-prometheus'
```

`application.yml` (또는 `application-dev.yml`):

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, prometheus
  metrics:
    tags:
      application: jackpotchain-backend
```

> `application` 태그는 Prometheus 쿼리에서 `application="jackpotchain-backend"` 로 필터링할 때 사용됩니다.

---

## 7단계: Grafana UI — 초기 접속 및 확인

**접속:** `http://{EC2_IP}:3002`

**로그인:** admin / (3단계에서 설정한 비밀번호, 미설정 시 admin)

---

## 8단계: Grafana UI — Datasource 확인

1. 좌측 메뉴 → **Connections** → **Data sources**
2. `Prometheus` 와 `Loki` 가 목록에 있는지 확인
3. 각 항목 클릭 → **Test** 버튼 → "Data source is working" 메시지 확인

> 프로비저닝으로 자동 등록되므로 수동 추가 불필요. Test 실패 시 컨테이너 네트워크(`monitoring-net`) 연결 여부 확인.

---

## 9단계: Grafana UI — Dashboard 확인

1. 좌측 메뉴 → **Dashboards**
2. `JackpotChain` 폴더 안에 다음 2개 대시보드 확인:
   - `Spring Overview` — HTTP 요청수, 응답시간, JVM 메모리 등
   - `Loki Logs` — 컨테이너 로그 스트림

> 데이터가 보이지 않으면 Spring Boot 컨테이너가 `monitoring-net` 에 연결되어 있는지 확인.

---

## 10단계: Grafana UI — Contact Point(Discord) 확인 및 테스트

1. 좌측 메뉴 → **Alerting** → **Contact points**
2. `discord-alerts` 항목 확인
3. 우측 **Test** 버튼 클릭
4. Discord 채널에 테스트 메시지 수신 확인

**테스트 메시지가 오지 않는 경우:**

```bash
# Grafana 로그에서 webhook 오류 확인
docker logs jc-grafana 2>&1 | grep -i "discord\|webhook\|notif" | tail -20
```

- URL이 잘못된 경우 → `contact_points.yml` 의 `url` 수정 후 Grafana 재시작
- Discord 채널 권한 문제 → 해당 채널에서 웹후크 권한 확인

---

## 11단계: Grafana UI — Notification Policy 확인

1. **Alerting** → **Notification policies**
2. 아래 라우팅 트리가 표시되는지 확인:

```
기본: discord-alerts
├── severity=critical  → discord-alerts (group_wait: 10s, repeat: 30m)
└── severity=warning   → discord-alerts (repeat: 2h)
```

> 트리가 보이지 않으면 `notification_policies.yml` 이 정상 복사됐는지 확인 후 Grafana 재시작.

---

## 12단계: Grafana UI — Alert Rules 상태 확인

1. **Alerting** → **Alert rules**
2. `JackpotChain Alerts` 그룹 내 다음 3개 규칙 확인:

| 규칙 | 조건 | severity |
|---|---|---|
| `[WARN] RPC Latency p95 > 3s` | RPC p95 응답시간 > 3초, 2분 지속 | warning |
| `[CRITICAL] HTTP 5xx 에러율 > 1%` | 5xx 비율 > 1%, 1분 지속 | critical |
| `[CRITICAL] JackpotChain Node 연결 끊김` | RPC 에러율 > 0.1/s, 2분 지속 | critical |

3. 각 규칙 상태가 **Normal** 이면 정상 동작 중

**에러 상태인 경우:**

```bash
docker logs jc-grafana 2>&1 | grep -i "rule_uid\|Failed to" | tail -30
```

---

## 트러블슈팅

### Grafana 재시작 (설정 파일 변경 후)

```bash
cd ~/app/compose
docker compose -f docker-compose.monitoring.yml restart grafana
```

> `docker compose restart grafana` 명령에서 서비스명은 **`grafana`** (container_name인 `jc-grafana` 아님)

### Prometheus 스크레이프 대상 확인

브라우저에서 `http://{EC2_IP}:9090/targets` 접속
→ `spring-dev`, `spring-green` 등 타겟의 State가 **UP** 인지 확인

### Loki 로그 수신 확인

```bash
curl -s "http://localhost:3100/loki/api/v1/labels" | python3 -m json.tool
```

### 전체 모니터링 스택 재시작

```bash
cd ~/app/compose
docker compose -f docker-compose.monitoring.yml down
docker compose -f docker-compose.monitoring.yml up -d
```

---

## 파일 구조 참조

```
~/app/
├── compose/
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   └── docker-compose.monitoring.yml
├── env/
│   ├── .env.dev
│   ├── .env.prod
│   └── .env.monitoring
└── monitoring/
    ├── prometheus/
    │   └── prometheus.yml          # 스크레이프 대상 설정
    ├── loki/
    │   └── config.yml              # Loki 스토리지 설정
    ├── promtail/
    │   └── config.yml              # 로그 수집 설정
    └── grafana/
        └── provisioning/
            ├── datasources/
            │   └── datasources.yml      # Prometheus, Loki 데이터소스
            ├── dashboards/
            │   ├── dashboard.yml        # 대시보드 프로바이더
            │   ├── spring-overview.json # Spring 메트릭 대시보드
            │   └── loki-logs.json       # 로그 대시보드
            └── alerting/
                ├── contact_points.yml       # Discord webhook
                ├── notification_policies.yml # 라우팅 정책
                └── rules.yml                # 알림 규칙 3개
```
