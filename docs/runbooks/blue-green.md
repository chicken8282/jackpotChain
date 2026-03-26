# Blue/Green 배포 Runbook

> 작성일: 2026-03-26
> 대상 환경: Main EC2 (`ubuntu@15.165.75.53`)
> 관련 파일: `scripts/`, `docker-compose.prod.yml`, `Jenkinsfile`

---

## 개요

JackpotChain 운영 환경은 **Blue/Green 배포** 방식을 사용한다.
Spring Boot 컨테이너를 blue / green 두 슬롯으로 나누어 운영하며,
Host Nginx의 `upstream.conf`를 교체하고 reload하는 방식으로 무중단 전환한다.

```
                  ┌─────────────────────────────┐
사용자 요청         │    Host Nginx (ssatto777.site) │
──────────────────►│                             │
                  │  /api → active_spring        │
                  │  /    → 127.0.0.1:8010       │
                  └─────────┬───────────────────-┘
                            │
               ┌────────────▼────────────┐
               │    upstream.conf        │
               │  active_spring =        │
               │   blue (8090) or        │
               │   green (8092)          │
               └────────────┬────────────┘
              ┌─────────────┴─────────────┐
              │                           │
     jc-spring-blue              jc-spring-green
      (127.0.0.1:8090)           (127.0.0.1:8092)
```

---

## 포트 매핑

| 컨테이너 | Host 포트 | 역할 |
|---|---|---|
| `jc-spring-blue` | `127.0.0.1:8090` | Blue 슬롯 (Spring Boot) |
| `jc-spring-green` | `127.0.0.1:8092` | Green 슬롯 (Spring Boot) |
| `jc-frontend-prod` | `127.0.0.1:8010` | Frontend (Nginx SPA) |
| `jc-node-prod` | `127.0.0.1:8776` | JackpotChain RPC (내부 전용) |
| `jc-node-prod` | `8777`, `8778` | P2P / Rendezvous (외부 오픈) |

---

## 스크립트 역할

| 스크립트 | 용도 |
|---|---|
| `deploy-prod.sh <color>` | 전체 prod 배포 자동화 (pull → up → health check → 전환) |
| `switch-color.sh <blue\|green>` | upstream.conf 교체 + nginx reload |
| `health-check.sh <url>` | HTTP 200 반환까지 최대 20회(5초 간격) 대기 |
| `rollback.sh <previous_color>` | switch-color.sh를 이전 color로 재호출 |

---

## 정상 배포 흐름 (Jenkins 자동)

Jenkins가 `master`/`main` 브랜치 push를 감지하면 아래 흐름이 자동 실행된다.

```
GitLab push (master/main)
  └─► Jenkins Pipeline
        ├─ Checkout
        ├─ Build Backend (./gradlew clean build -x test)
        ├─ Docker Login
        ├─ Build & Push Images (tag: BUILD_NUMBER)
        └─ Deploy Green (SSH → Main EC2)
              ├─ deploy-repo git pull
              ├─ ~/app/에 compose/scripts/monitoring 파일 복사
              ├─ .env.prod의 IMAGE_TAG 치환
              └─ deploy-prod.sh green 실행
                    ├─ docker compose pull
                    ├─ 공통 서비스 up (postgresql, redis, rabbitmq, node, frontend)
                    ├─ spring-green up
                    ├─ health-check.sh http://127.0.0.1:8092/actuator/health
                    └─ switch-color.sh green → nginx reload
```

> Jenkins는 항상 **green** 슬롯에 배포한다. blue가 현재 active인 상태에서 green을 기동하고,
> health check 통과 후 nginx를 green으로 전환한다.

---

## 수동 배포 (긴급 시)

### 1. EC2 접속

```bash
ssh ubuntu@15.165.75.53
```

### 2. 최신 코드 동기화

```bash
cd ~/deploy-repo
git fetch origin
git pull origin master
```

### 3. 파일 복사

```bash
cp docker-compose.prod.yml ~/app/compose/
cp scripts/*.sh ~/app/scripts/
chmod +x ~/app/scripts/*.sh
```

### 4. IMAGE_TAG 설정

```bash
# 배포할 이미지 태그(BUILD_NUMBER 또는 커밋 SHA)로 교체
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=<태그값>/" ~/app/env/.env.prod
```

### 5. 배포 실행

```bash
bash ~/app/scripts/deploy-prod.sh green
```

---

## Blue/Green 수동 전환

active color를 확인하고 반대 color로 전환한다.

### 현재 active color 확인

```bash
cat /etc/nginx/conf.d/upstream.conf
```

출력 예:
```nginx
# blue가 active인 경우
upstream active_spring {
    server 127.0.0.1:8090;
}
```

### 전환 실행

```bash
# green으로 전환
bash ~/app/scripts/switch-color.sh green

# blue로 전환
bash ~/app/scripts/switch-color.sh blue
```

전환 후 nginx가 자동 reload되며 `switched active color to green` 메시지가 출력된다.

---

## Rollback

health check 실패 또는 배포 후 장애 발생 시 이전 color로 즉시 되돌린다.

```bash
# 이전 active color가 blue였던 경우
bash ~/app/scripts/rollback.sh blue

# 이전 active color가 green였던 경우
bash ~/app/scripts/rollback.sh green
```

> `rollback.sh`는 내부적으로 `switch-color.sh`를 호출한다.
> rollback은 nginx upstream만 되돌리므로 컨테이너는 그대로 유지된다.

### rollback 후 확인

```bash
# upstream 상태 확인
cat /etc/nginx/conf.d/upstream.conf

# nginx 상태 확인
sudo nginx -t && sudo systemctl status nginx

# smoke test
curl -sf https://ssatto777.site/api/blockchain/dashboard | jq .
```

---

## health-check.sh 동작 방식

```
최대 20회 × 5초 간격 = 최대 100초 대기
HTTP 200 반환 시 → exit 0 (성공)
20회 모두 실패 시 → exit 1 (실패) → deploy-prod.sh 전체 중단 (set -euo pipefail)
```

health check 대상 URL: `http://127.0.0.1:<port>/actuator/health`

---

## 컨테이너 상태 확인

```bash
# prod 전체 서비스 상태
docker compose --env-file ~/app/env/.env.prod \
  -f ~/app/compose/docker-compose.prod.yml ps

# Spring 로그 실시간
docker logs -f jc-spring-green
docker logs -f jc-spring-blue

# 노드 상태
docker logs -f jc-node-prod
```

---

## 모니터링 연계

배포 전후 Grafana에서 상태를 확인한다.

| 항목 | 확인 방법 |
|---|---|
| Spring 서비스 up/down | Grafana → Spring Overview 대시보드 |
| RPC latency 급증 | Grafana → `jackpotchain_rpc_duration_seconds` |
| HTTP 5xx 에러율 | Grafana → `http_server_requests_seconds_count{status=~"5.."}` |
| 배포 전후 로그 | Grafana → Loki → `{container_name="jc-spring-green"}` |

알림 규칙 (`rules.yml`):
- RPC p95 latency > 3s → **WARN**
- 5xx 에러율 > 1% (5분간) → **CRITICAL**
- RPC 연결 끊김 (2분간) → **CRITICAL**

---

## 자주 쓰는 명령 모음

```bash
# upstream 확인
cat /etc/nginx/conf.d/upstream.conf

# nginx 설정 검증 및 reload
sudo nginx -t && sudo systemctl reload nginx

# green 기동 (이미 pull된 이미지 사용)
docker compose --env-file ~/app/env/.env.prod \
  -f ~/app/compose/docker-compose.prod.yml \
  up -d spring-green

# 특정 서비스 재시작
docker compose --env-file ~/app/env/.env.prod \
  -f ~/app/compose/docker-compose.prod.yml \
  restart spring-green

# 이전 color 컨테이너 정리 (standby 상태 제거 시)
docker compose --env-file ~/app/env/.env.prod \
  -f ~/app/compose/docker-compose.prod.yml \
  stop spring-blue
```
