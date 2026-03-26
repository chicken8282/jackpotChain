# 모니터링 알림 학습 — Grafana Alerting · Discord Webhook · Provisioning as Code

> 작성일: 2026-03-26
> 기준: monitoring/grafana/provisioning/alerting/, monitoring.md 기반 실제 설정

---

## 0. 용어 정리

| 용어 | 개념 | 이 프로젝트에서의 역할 | 운영상 포인트 |
|------|------|------------------------|---------------|
| `Alert Rule` | "어떤 조건이 되면 알림을 트리거하는가"를 정의하는 규칙이다. | PromQL로 메트릭을 평가하고 임계치를 초과하면 발동한다. | Pending → Firing → Resolved 세 상태가 있다. |
| `Contact Point` | "어디로 알림을 보낼 것인가"를 정의한다. | Discord Webhook URL을 등록한 수신처다. | 이메일, Slack, PagerDuty, Discord 등 다양한 타입을 지원한다. |
| `Notification Policy` | "어떤 알림을 어느 Contact Point로 라우팅할 것인가"를 정의한다. | `severity=critical`이면 10초 내 Discord 전송, `warning`이면 2시간 간격으로 전송 등 라우팅 규칙이다. | 트리 구조로 매처(matchers)를 중첩할 수 있다. |
| `Provisioning` | Grafana 설정을 UI가 아닌 파일(YAML)로 관리하는 방식이다. | 컨테이너를 재시작해도 설정이 자동 복원된다. | 파일 변경 → Grafana 재시작으로 반영된다. |
| `Discord Webhook` | Discord가 외부 서비스에서 메시지를 받아 채널에 게시할 수 있도록 제공하는 HTTP 엔드포인트다. | Grafana가 임계치 초과 시 이 URL로 POST 요청을 보낸다. | URL 자체가 인증 토큰이므로 유출 시 누구나 메시지를 보낼 수 있다. |
| `Go Template` | Grafana 알림 메시지 본문을 동적으로 구성할 때 사용하는 템플릿 언어다. | `{{ .Labels.severity }}`, `{{ .Annotations.description }}` 등으로 알림 내용에 컨텍스트를 삽입한다. | 잘못된 템플릿 문법은 알림 발송 자체를 실패시킨다. |
| `Alertmanager` | Prometheus 생태계의 알림 관리 컴포넌트다. | Grafana 9+는 자체 내장 Alertmanager를 포함한다. 이 프로젝트는 별도 Alertmanager 컨테이너 없이 Grafana에 내장된 것을 사용한다. | 별도 Alertmanager를 구성하면 더 정교한 라우팅(억제, 그룹화)이 가능하지만 이 규모에서는 내장으로 충분하다. |
| `Inhibition` | 특정 알림이 발동 중일 때 관련된 하위 알림을 억제하는 기능이다. | 예: Node 연결 끊김(CRITICAL)이 발동하면 RPC Latency(WARNING)는 당연히 따라오므로 중복 알림을 억제할 수 있다. | 이 프로젝트에서는 현재 억제 규칙을 설정하지 않았다. |

---

## 1. 왜 Discord로 알림을 받는가

모니터링 대시보드는 Grafana에서 볼 수 있다. 그런데 이상이 생겼을 때 **능동적으로 확인하러 가지 않으면 문제를 모른다.**

```
현재 방식 (대시보드만 있을 때):
  임계치 초과 → 대시보드에 빨간 패널 표시 → 아무도 안 보면 모름

목표 방식 (알림 연동 후):
  임계치 초과 → Grafana가 Discord에 POST → 채널 멤버가 즉시 인지
```

| 상황 | 알림 없이 | 알림 있으면 |
|------|-----------|-------------|
| RPC p95 > 3초 | 2분 후 알게 됨 (누군가 대시보드 열면) | 2분 지속되면 Discord 즉시 알림 |
| 5xx 에러율 > 1% | 사용자 민원이 먼저 옴 | 1분 지속되면 Discord 즉시 알림 |
| 노드 연결 끊김 | 서비스 완전 중단 후 파악 | 2분 지속되면 Discord 즉시 알림 |

---

## 2. Grafana Alerting 전체 구조

```
[메트릭 수집]                [알림 판단]                  [알림 발송]
Prometheus                   Alert Rule                   Contact Point
  ↑                              │                              │
  scrape                   PromQL 평가                   Discord Webhook
  15초마다                  1분마다 (interval)             HTTP POST
                                 │
                         Notification Policy
                         (라우팅 & 타이밍 결정)
                                 │
                         ┌───────┴───────┐
                    severity=critical  severity=warning
                    group_wait: 10s    repeat_interval: 2h
```

Grafana Alerting은 세 개의 독립된 개념이 파이프라인처럼 연결된다.

1. **Alert Rule** — "무엇을 감시할 것인가" (PromQL + 임계치)
2. **Notification Policy** — "언제, 어떻게 라우팅할 것인가" (타이밍 + 매칭)
3. **Contact Point** — "어디로 보낼 것인가" (Discord / 이메일 / Slack)

이 세 개가 분리되어 있기 때문에 알림 규칙을 건드리지 않고 수신처만 바꾸거나,
수신처는 그대로 두고 라우팅 정책만 조정할 수 있다.

---

## 3. Alert Rule 상태 머신

알림 규칙은 단순히 "발동/미발동"이 아니라 세 가지 상태를 거친다.

```
Normal ──[조건 충족]──▶ Pending ──[for 기간 지속]──▶ Firing
  ▲                        │                            │
  │                   [조건 해소]                  [조건 해소]
  └────────────────────────┘                            │
  ▲                                                     │
  └─────────────────[Resolved]──────────────────────────┘
```

| 상태 | 의미 | Discord 알림 |
|------|------|--------------|
| `Normal` | 임계치 미만, 정상 | 없음 |
| `Pending` | 임계치 초과, 아직 `for` 시간이 지나지 않음 | 없음 |
| `Firing` | `for` 시간 동안 임계치 초과 유지 → 실제 알림 발동 | 발송 |
| `Resolved` | Firing 상태에서 조건이 해소됨 | 해소 알림 발송 (`disableResolveMessage: false`면) |

**`for` 기간이 왜 필요한가?**

메트릭은 순간적으로 스파이크가 생길 수 있다. `for: 2m`은 "2분 동안 지속되어야 진짜 문제"라고 판단하는 잡음 필터다.
1분짜리 일시적 스파이크에 매번 Discord 알림이 오면 알림 피로(alert fatigue)가 쌓여 결국 무시하게 된다.

**이 프로젝트의 `for` 설정**

```yaml
# rules.yml 발췌
- uid: jc-rpc-latency-warn
  for: 2m           # 2분 지속되어야 WARNING 발동

- uid: jc-5xx-error-critical
  for: 1m           # 5xx는 1분만 지속돼도 CRITICAL

- uid: jc-node-connection-critical
  for: 2m           # RPC 실패 2분 지속 시 CRITICAL
```

5xx 에러는 더 짧게 설정한 이유: 에러율 >1%가 발생했다는 것 자체가 이미 사용자에게 영향을 주고 있다는 뜻이므로 더 빠르게 알려야 한다.

---

## 4. Contact Point — Discord Webhook 연동 원리

### 4-1. Discord Webhook이란

Discord가 제공하는 **수신 전용 HTTP 엔드포인트**다. 외부 시스템이 이 URL로 JSON을 POST하면 Discord가 지정한 채널에 메시지를 게시한다.

```
Grafana ──POST──▶ https://discord.com/api/webhooks/{webhook.id}/{webhook.token}
                           │
                           ▼
                  Discord 서버 → #monitoring-alerts 채널에 메시지 게시
```

**인증 방식**: URL 자체에 토큰이 포함되어 있다. 별도 Authorization 헤더 없이 URL을 알면 누구나 메시지를 보낼 수 있다.
→ **Webhook URL은 Git에 커밋하지 말 것.** 환경 변수나 Docker secret으로 주입해야 한다.

### 4-2. Grafana가 보내는 Discord 페이로드

Grafana는 Discord Webhook 타입에 맞게 아래 형식으로 POST한다.

```json
{
  "content": "{{ message 템플릿 렌더링 결과 }}",
  "username": "Grafana"
}
```

Discord Webhook은 Slack과 달리 `embeds` 배열 형식도 지원하지만,
Grafana의 Discord Contact Point는 기본적으로 `content` 필드를 사용한다.

### 4-3. contact_points.yml 각 필드 설명

```yaml
apiVersion: 1

contactPoints:
  - orgId: 1                      # Grafana 조직 ID. 단일 인스턴스면 항상 1
    name: discord-alerts          # Notification Policy에서 참조할 이름
    receivers:
      - uid: discord-webhook      # Grafana 내부 식별자, 고유해야 함
        type: discord             # Contact Point 타입 (grafana가 지원하는 타입 중 하나)
        settings:
          url: "https://discord.com/api/webhooks/..."   # Discord에서 발급한 Webhook URL
          message: |              # Go Template으로 작성하는 메시지 본문
            {{ range .Alerts }}
            **[{{ .Labels.severity | toUpper }}] {{ .Annotations.summary }}**
            {{ .Annotations.description }}
            상태: {{ .Status }}
            {{ end }}
        disableResolveMessage: false   # true면 Resolved 시 알림 안 보냄
```

**`disableResolveMessage: false`의 의미**: Firing → Resolved 전환 시 Discord에 "해소됨" 메시지를 자동으로 보낸다. 운영자가 "이제 괜찮아졌구나"를 알 수 있어서 true로 두는 것보다 낫다.

---

## 5. Go Template — 알림 메시지 동적 구성

Grafana 알림 메시지는 Go의 `text/template` 패키지를 사용한다. 변수 치환, 반복, 조건부 출력이 가능하다.

### 5-1. 알림 컨텍스트 구조

Grafana가 템플릿에 넘겨주는 데이터는 아래와 같다.

```
.Alerts         → 현재 발동 중인 알림 목록 (여러 개가 묶일 수 있음)
  .Labels       → 알림 규칙에 붙은 라벨 (severity, team 등)
  .Annotations  → 알림 규칙의 summary, description
  .Status       → "firing" 또는 "resolved"
  .StartsAt     → 알림 시작 시각
  .EndsAt       → 알림 종료 시각 (resolved일 때만 의미 있음)
  .GeneratorURL → Grafana 대시보드 링크

.CommonLabels   → .Alerts 전체에 공통인 라벨
.CommonAnnotations → .Alerts 전체에 공통인 Annotations
```

### 5-2. 실제 사용 예시

```
# 기본형: 알림마다 반복 출력
{{ range .Alerts }}
**[{{ .Labels.severity | toUpper }}] {{ .Annotations.summary }}**
{{ .Annotations.description }}
상태: {{ .Status }}
시작: {{ .StartsAt }}
{{ end }}

# 조건부 출력: CRITICAL만 다르게
{{ range .Alerts }}
{{ if eq .Labels.severity "critical" }}
🚨 **[CRITICAL]** {{ .Annotations.summary }}
{{ else }}
⚠️ **[WARNING]** {{ .Annotations.summary }}
{{ end }}
{{ .Annotations.description }}
{{ end }}

# 필터 사용: 문자열 변환
{{ .Labels.severity | toUpper }}   → "WARNING", "CRITICAL"
{{ .StartsAt | since }}            → "5m ago"
```

**주의**: Go Template 문법 오류는 메시지를 빈 문자열로 만들어 알림이 와도 내용이 없을 수 있다.
실제 배포 전에 Grafana UI에서 "Test" 버튼으로 반드시 검증해야 한다.

---

## 6. Notification Policy — 라우팅과 타이밍

### 6-1. Notification Policy가 하는 일

Alert Rule이 Firing 상태가 되면 Grafana는 Notification Policy를 보고 세 가지를 결정한다.

1. **어느 Contact Point로 보낼 것인가** (matchers로 라우팅)
2. **얼마나 기다렸다가 첫 번째 알림을 보낼 것인가** (group_wait)
3. **같은 알림을 얼마 간격으로 반복할 것인가** (repeat_interval)

### 6-2. notification_policies.yml 각 필드 설명

```yaml
apiVersion: 1

policies:
  - orgId: 1
    receiver: discord-alerts      # 기본 수신처: 어떤 route도 매칭 안 되면 여기로
    group_by: ["severity", "team"]  # 이 라벨이 같은 알림끼리 묶어서 함께 보냄
    group_wait: 30s               # 그룹 내 첫 알림 전 최대 대기 시간
                                  # 같은 시각에 여러 알림이 터졌을 때 묶어서 보내려고 잠깐 기다림
    group_interval: 5m            # 같은 그룹에 새로운 알림이 추가됐을 때 재발송 간격
    repeat_interval: 1h           # 동일 알림이 계속 Firing 상태일 때 반복 발송 간격

    routes:                       # 트리 구조로 매처를 중첩 적용
      - matchers:
          - name: severity
            value: critical
        receiver: discord-alerts  # 같은 수신처여도 타이밍만 다르게 설정 가능
        group_wait: 10s           # CRITICAL: 10초만 기다리고 즉시 발송
        repeat_interval: 30m      # 30분마다 반복 (1h보다 자주 리마인드)

      - matchers:
          - name: severity
            value: warning
        receiver: discord-alerts
        repeat_interval: 2h       # WARNING: 2시간마다 반복 (덜 긴급)
```

### 6-3. group_wait vs group_interval vs repeat_interval

세 타이밍 파라미터는 쉽게 혼동된다. 상황별로 구분하면 아래와 같다.

| 파라미터 | 적용 시점 | 목적 |
|----------|----------|------|
| `group_wait` | **처음** Firing 발생 후 ~ 첫 알림 발송 전 | 비슷한 시각의 여러 알림을 묶어 하나의 메시지로 보내기 위한 대기 |
| `group_interval` | 기존 그룹에 **새 알림**이 추가됐을 때 | 새 알림을 포함한 업데이트를 발송 |
| `repeat_interval` | 동일 알림이 **계속 Firing**일 때 | "아직도 해결 안 됐어" 리마인드 발송 |

**예시 흐름 (`severity=critical`)**:

```
T+0s   RPC 실패 → Firing
T+10s  group_wait 만료 → Discord 1차 알림 발송
T+2m   jc-5xx-error-critical도 Firing → 동일 그룹에 추가
T+5m   group_interval 만료 → 두 알림을 묶어 Discord 2차 알림
T+30m  여전히 Firing → repeat_interval 만료 → 리마인드 발송
T+60m  여전히 Firing → 리마인드 발송
```

### 6-4. matchers 라우팅 트리 작동 방식

Grafana는 routes를 위에서 아래로 순차적으로 검사한다. **처음 매칭된 route를 사용하고 멈춘다.**

```
정책 트리:
root (receiver: discord-alerts, repeat: 1h)
  ├─ severity=critical → repeat: 30m  ← 먼저 검사
  └─ severity=warning  → repeat: 2h   ← 다음 검사

severity=critical 알림이 오면:
  → 첫 번째 route 매칭 → repeat_interval: 30m 적용
  → 두 번째 route는 검사하지 않음

severity=info 알림이 오면 (만약 존재한다면):
  → 첫 번째 route 매칭 안 됨
  → 두 번째 route 매칭 안 됨
  → root의 기본 설정 적용 (repeat: 1h)
```

---

## 7. Grafana Provisioning as Code

### 7-1. 왜 UI 대신 파일로 관리하는가

Grafana UI에서 직접 설정하면 `grafana-data` Docker volume에 SQLite DB로 저장된다.
이 volume이 날아가면 (서버 재구축, `docker compose down -v`) 모든 설정이 사라진다.

파일로 관리하면:
- Git으로 이력 추적
- 컨테이너 재시작 시 자동 복원
- 팀원 간 동일한 설정 공유

### 7-2. 프로비저닝 파일 경로와 역할

```
monitoring/grafana/provisioning/
├── datasources/
│   └── datasources.yml          → Prometheus, Loki 자동 등록
├── dashboards/
│   ├── dashboard.yml            → 이 폴더를 대시보드 소스로 지정
│   ├── spring-overview.json     → JVM/HTTP/RPC 대시보드
│   └── loki-logs.json           → 로그 조회 대시보드
└── alerting/
    ├── rules.yml                → Alert Rule 정의 (임계치)
    ├── contact_points.yml       → 수신처 정의 (Discord Webhook)  ← 이번에 추가
    └── notification_policies.yml → 라우팅 정책                   ← 이번에 추가
```

### 7-3. docker-compose에서 마운트하는 방법

`docker-compose.monitoring.yml`에서 Grafana 컨테이너에 이 디렉토리를 마운트한다.

```yaml
grafana:
  image: grafana/grafana:latest
  volumes:
    - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
    #                                    ↑
    # 이 경로가 Grafana가 기동 시 읽는 provisioning 루트
```

Grafana는 기동 시 `/etc/grafana/provisioning/` 하위 파일을 모두 읽어 자동 적용한다.
`contact_points.yml`과 `notification_policies.yml`을 여기 추가하면 재시작 시 자동 등록된다.

### 7-4. 적용 확인 방법

```bash
# Grafana 재시작
docker compose -f docker-compose.monitoring.yml restart jc-grafana

# 로그로 프로비저닝 성공 여부 확인
docker logs jc-grafana 2>&1 | grep -i "provisioning\|contact\|policy"
```

Grafana UI에서도 확인할 수 있다:
- `http://EC2:3002/alerting/notifications` → Contact Points 탭 → `discord-alerts` 확인
- `http://EC2:3002/alerting/routes` → Notification Policies 탭 → 라우팅 트리 확인

---

## 8. 이 프로젝트의 실제 알림 파이프라인

### 8-1. 알림 규칙 → Discord 전체 흐름

```
[1] Prometheus scrape (15초마다)
    spring-blue:8080/actuator/prometheus 긁어옴

[2] Grafana Alert Rule 평가 (1분마다)
    PromQL 실행 → 값이 임계치 초과하면 Pending

[3] for 기간 경과
    jc-rpc-latency-warn: 2분 지속 → Firing
    jc-5xx-error-critical: 1분 지속 → Firing
    jc-node-connection-critical: 2분 지속 → Firing

[4] Notification Policy 매칭
    severity=critical → group_wait 10s → discord-alerts로 라우팅
    severity=warning  → group_wait 30s → discord-alerts로 라우팅

[5] Grafana → Discord Webhook POST
    URL: https://discord.com/api/webhooks/{id}/{token}
    Body: { "content": "**[CRITICAL] HTTP 5xx 에러율 > 1%**\n최근 5분간 5xx 에러율이 1%를 초과했습니다.\n상태: firing" }

[6] Discord 채널에 메시지 표시
    알림 수신자가 즉시 인지
```

### 8-2. 현재 정의된 알림 규칙 3개 요약

```
rules.yml (현재 상태)

┌─────────────────────────────────────────────────────────────┐
│ uid: jc-rpc-latency-warn                                    │
│ 조건: RPC p95 > 3초 (2분 지속)                               │
│ PromQL: histogram_quantile(0.95,                            │
│           sum(rate(jackpotchain_rpc_duration_seconds_bucket  │
│               [5m])) by (le, method))                       │
│ severity: warning → Discord 알림, repeat: 2h               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ uid: jc-5xx-error-critical                                  │
│ 조건: 5xx 에러율 > 1% (1분 지속)                             │
│ PromQL: errors / total * 100 > 1                            │
│ severity: critical → Discord 알림, repeat: 30m             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ uid: jc-node-connection-critical                            │
│ 조건: RPC 오류율 > 0.1/s (2분 지속)                          │
│ PromQL: rate(rpc_duration...{outcome=~"rpc_error|http_error"}│
│           [5m]) > 0.1                                       │
│ severity: critical → Discord 알림, repeat: 30m             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. 자주 헷갈리는 것들

**Q. Webhook URL을 Git에 커밋해도 되는가?**
절대 안 된다. Discord Webhook URL은 인증 없이 메시지를 보낼 수 있는 키다. 유출되면 스팸/피싱 메시지가 채널에 올 수 있다. `contact_points.yml`의 URL은 환경 변수로 주입하거나, `.gitignore`에 추가하거나, Grafana UI에서만 직접 설정해야 한다.

**Q. Grafana를 재시작하지 않고 설정을 반영할 수 있는가?**
불가능하다. Provisioning 파일은 Grafana 기동 시에만 읽는다. 파일을 수정한 뒤 반드시 `docker compose restart jc-grafana`가 필요하다.
단, Grafana UI에서 직접 수정한 설정은 즉시 적용된다. 단 UI 변경은 파일로 관리되지 않아 컨테이너 재생성 시 사라진다는 트레이드오프가 있다.

**Q. contact_points.yml에서 설정한 내용을 UI에서 수정하면 어떻게 되는가?**
파일로 프로비저닝된 항목은 UI에서 수정이 잠겨있거나(read-only), 수정해도 Grafana 재시작 시 파일 내용으로 덮어써진다. 파일로 관리하기로 했으면 파일만 수정해야 한다.

**Q. Discord에서 Webhook URL을 재발급하면 기존 URL은?**
즉시 무효화된다. `contact_points.yml`의 URL을 새 URL로 교체하고 Grafana를 재시작해야 한다.

**Q. 알림이 안 오는데 왜인가?**
체크리스트:
1. `docker logs jc-grafana` → 프로비저닝 오류 여부 확인
2. Grafana UI → Alerting → Contact Points → `discord-alerts` → "Test" 버튼 클릭 → Discord에 테스트 메시지 도착 여부 확인
3. Grafana UI → Alerting → Alert Rules → 해당 규칙의 상태가 Normal인지 Firing인지 확인
4. Prometheus UI(`http://EC2:9090/targets`) → scrape target이 UP인지 확인 (메트릭이 수집되지 않으면 알림도 발동 안 됨)
5. PromQL을 Grafana Explore에서 직접 실행 → 값이 임계치를 넘는지 확인

**Q. 알림이 너무 자주 와서 피로하다면?**
`repeat_interval`을 늘리거나 `for` 시간을 늘려 일시적 스파이크를 걸러낸다.
임계치 자체를 높이는 것도 방법이지만, 진짜 문제를 놓칠 수 있으므로 신중하게.

---

## 10. 이 문서와 연결된 파일들

| 파일 | 역할 |
|------|------|
| `monitoring/grafana/provisioning/alerting/rules.yml` | Alert Rule 3개 정의 (임계치 기준) |
| `monitoring/grafana/provisioning/alerting/contact_points.yml` | Discord Webhook 수신처 등록 |
| `monitoring/grafana/provisioning/alerting/notification_policies.yml` | severity별 라우팅·타이밍 정책 |
| `monitoring/grafana/provisioning/datasources/datasources.yml` | Prometheus, Loki datasource 자동 등록 |
| `docker-compose.monitoring.yml` | provisioning 폴더를 컨테이너에 마운트 |

**연관 학습 문서**:
- [monitoring.md](./monitoring.md) — Prometheus, Grafana, Loki, Micrometer 전체 구조
- 알림 규칙에서 사용하는 PromQL 쿼리는 monitoring.md 3-1절, 5-3절 참고
