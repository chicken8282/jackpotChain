# Infra Spec — JackpotChain

> Source of truth: `docs/reviews/architecture.md` (전체 아키텍처), `docs/reviews/plan.md` (구현 계획)

---

## 1. Hard Rules

- 모든 인프라 설정은 파일(코드)로 관리 — 콘솔 직접 수정 금지 (IaC 원칙)
- 시크릿(DB 비밀번호, JWT 시크릿, RPC 자격증명)은 환경변수로만 주입, 절대 파일에 하드코딩 금지
- `docker-compose.prod.yml` / `docker-compose.monitoring.yml` 수정 시 Dev-Net에서 먼저 검증 후 Prod 적용
- Prod-Net 컨테이너는 `restart: unless-stopped` 필수
- Flyway migration 파일(`V{n}__*.sql`)은 커밋 후 절대 수정 금지

---

## 2. 네트워크 분리 원칙

```
Main EC2
├── prod-net      Spring-Blue/Green, Redis, PostgreSQL, RabbitMQ, Node-PROD
├── dev-net       Spring-DEV, Redis-DEV, PostgreSQL-DEV, RabbitMQ-DEV, Node-DEV
└── monitoring-net  Prometheus, Loki, Grafana, Promtail, cAdvisor
```

**주의사항:**
- Spring API 컨테이너만 `prod-net` + `monitoring-net` 양쪽 연결 (메트릭 스크랩 허용)
- Redis / PostgreSQL / RabbitMQ는 `prod-net` 내부에서만 접근 — 외부 포트 바인딩 금지
- monitoring-net은 Prod-Net 컨테이너를 읽기만 함 — monitoring → prod 쓰기 경로 없음
- Node RPC(8332) / P2P(8333) 포트는 Docker 내부 네트워크에서만 허용, 외부 노출 금지

**Docker Compose 네트워크 템플릿:**
```yaml
networks:
  prod-net:
    driver: bridge
    internal: false          # Nginx → Spring 트래픽 허용
  monitoring-net:
    driver: bridge
    internal: true           # 외부 접근 차단

services:
  spring-blue:
    networks: [prod-net, monitoring-net]
  postgresql:
    networks: [prod-net]     # 외부 포트 바인딩 없음 (ports: 생략)
  redis:
    networks: [prod-net]
```

---

## 3. Docker Compose 파일 구조

```
docker-compose.local.yml       # 로컬 개발용 (PostgreSQL, Redis만)
docker-compose.prod.yml        # Prod-Net (Blue/Green + DB + MQ + Node)
docker-compose.dev.yml         # Dev-Net (Spring-DEV + 전체 스택)
docker-compose.monitoring.yml  # Prometheus, Loki, Grafana, Promtail, cAdvisor
```

**파일 분리 이유:** monitoring 스택은 서비스 스택과 독립 재시작 가능해야 함. 하나의 파일로 묶으면 모니터링 재시작이 서비스에 영향을 줌.

---

## 4. Blue/Green 배포

### Nginx upstream 전환 규칙

```
upstream.conf 파일로 분리 관리 — nginx.conf에 직접 하드코딩 금지
```

```nginx
# /etc/nginx/conf.d/upstream.conf
upstream active_spring {
    server spring-blue:8080;   # 전환 시 이 한 줄만 교체
}
```

**전환 스크립트 (`scripts/switch-color.sh`) 필수 포함 단계:**
1. Inactive color 컨테이너 이미지 pull
2. Inactive color 컨테이너 실행
3. `/actuator/health` 200 확인 (최대 3회, 10초 간격)
4. Smoke test 실행
5. `upstream.conf` 교체 → `nginx -s reload`
6. 60초 관찰 후 old color 컨테이너 standby 유지 (즉시 종료 금지)

**롤백:** `upstream.conf`를 이전 color로 복구 → `nginx -s reload` (5초 이내 완료).

**주의:**
- `nginx -s reload`는 graceful reload — 진행 중인 요청을 끊지 않음
- `nginx -s restart` 사용 금지 (다운타임 발생)
- Health check 실패 시 upstream 전환 없이 스크립트 종료 (`exit 1`)

---

## 5. 볼륨 관리

| 볼륨 | 목적 | 주의사항 |
|------|------|---------|
| `postgresql-data` | PostgreSQL 데이터 | 절대 삭제 금지. 백업 전 drop 금지 |
| `node-data-prod` | JackpotChain 블록 데이터 | 체인 진실의 원천 — 별도 백업 필수 |
| `node-data-dev` | DEV 체인 데이터 | 테스트 용도, 초기화 허용 |
| `prometheus-data` | 메트릭 저장 | 유실 허용 (재수집 가능) |
| `loki-data` | 로그 저장 | 유실 시 과거 로그 복구 불가 — 중요 |

```yaml
# Named volume 선언 필수 (anonymous volume 사용 금지)
volumes:
  postgresql-data:
    driver: local
  node-data-prod:
    driver: local
```

---

## 6. 환경변수 & 시크릿 관리

**주입 방식:** Docker Compose `env_file` + EC2 환경변수 조합

```yaml
services:
  spring-blue:
    env_file:
      - .env.prod          # 비민감 설정
    environment:
      - DB_PASSWORD=${DB_PASSWORD}      # EC2 환경변수에서 주입
      - JWT_SECRET=${JWT_SECRET}
      - RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}
```

**규칙:**
- `.env.prod` 파일: Git 커밋 금지 (`.gitignore` 등록)
- 시크릿은 EC2 `~/.bashrc` 또는 AWS Parameter Store에서 관리
- Spring `application-prod.yaml`에는 `${ENV_VAR}` 형태만 사용, 실제 값 없음

```yaml
# application-prod.yaml (올바른 예)
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

---

## 7. Health Check 설정

모든 Prod 컨테이너에 `healthcheck` 명시:

```yaml
services:
  spring-blue:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s   # JVM 기동 시간 확보

  postgresql:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME}"]
      interval: 10s
      retries: 5

  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  rabbitmq:
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 15s
      retries: 5
```

Spring `depends_on`에 `condition: service_healthy` 사용:
```yaml
spring-blue:
  depends_on:
    postgresql:
      condition: service_healthy
    redis:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
```

---

## 8. 모니터링 스택 코드 주의사항

### Prometheus scrape 설정

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'spring-prod'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['spring-blue:8080']   # Blue/Green 전환 시 이 값도 동기화 필요
    scrape_interval: 15s

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']
```

**주의:** Blue/Green 전환 시 Prometheus target도 active color로 업데이트. 스크립트에 포함할 것.

### Promtail 로그 수집 필터

```yaml
# promtail-config.yml
pipeline_stages:
  - json:
      expressions:
        level: level
  - match:
      selector: '{job="spring"}'
      stages:
        - drop:
            expression: '.*"level":"(WARN|DEBUG|TRACE)".*'
            drop_counter_reason: below_info
```

INFO / ERROR만 Loki로 전송 — WARN은 Spring 로그 파일에는 남지만 Loki 수집 대상 제외.

### Spring Actuator 노출 설정

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics
      base-path: /actuator
  endpoint:
    health:
      show-details: when-authorized   # 외부 노출 제한
  metrics:
    export:
      prometheus:
        enabled: true
```

**주의:** `/actuator` 엔드포인트는 Nginx에서 외부 접근 차단. Prometheus만 내부 네트워크로 스크랩.

---

## 9. CI/CD (Jenkins) 코드 주의사항

### Jenkinsfile 단계별 원칙

```groovy
stage('Health Check') {
    // inactive color health check — 실패 시 즉시 배포 중단 (error() 호출)
    // Nginx upstream 전환 이전에 반드시 위치
}

stage('Switch Upstream') {
    // health check 통과 후에만 실행
    // switch-color.sh 스크립트 호출 (직접 sed 사용 금지)
}

stage('Cleanup') {
    // 전환 후 최소 60초 대기 후 old color 컨테이너 처리
    // 즉시 종료 금지 — 진행 중인 요청 처리 시간 확보
}
```

**금지 패턴:**
- `--no-verify` 옵션으로 hook 우회 금지
- health check 없이 Nginx 전환 금지
- DB migration 실패 시 강제 진행 금지 (`flyway.validateOnMigrate=true` 유지)

### Docker Image 관리

```
태그 전략: {브랜치명}-{GitSHA 7자리}  (예: main-a1b2c3d)
latest 태그 단독 사용 금지 — rollback 시 이전 이미지 식별 불가
```

---

## 10. 방화벽 / Nginx 포트 정책

| 포트 | 외부 공개 | 용도 |
|------|----------|------|
| 80 | ✅ | HTTP → HTTPS 리다이렉트 |
| 443 | ✅ | HTTPS (Nginx TLS 종료) |
| 22 | ✅ (제한) | SSH (IP 화이트리스트 권장) |
| 8080/8081 | ❌ | Spring Blue/Green (Nginx 내부만) |
| 8082 | ❌ | Spring DEV (Nginx 내부만) |
| 5432 | ❌ | PostgreSQL |
| 6379 | ❌ | Redis |
| 5672/15672 | ❌ | RabbitMQ (15672 관리 UI — VPN or SSH tunnel만 허용) |
| 8332/8333 | ❌ | JackpotChain Node RPC/P2P |
| 9090 | ❌ | Prometheus |
| 3100 | ❌ | Loki |
| 3000 | ❌ | Grafana (필요 시 SSH tunnel) |

---

## 11. 장애 대응 체크리스트 (코드 레벨)

**배포 전:**
- [ ] Flyway migration 파일 문법 검증 (`flyway validate` dry-run)
- [ ] Compose 파일 `docker compose config` 로 파싱 오류 확인
- [ ] 시크릿 환경변수 전체 설정 확인

**배포 중:**
- [ ] Inactive color health check 통과 확인
- [ ] Prometheus target이 새 color로 업데이트됐는지 확인
- [ ] Nginx reload 후 access log에서 5xx 급증 없음 확인

**장애 발생 시:**
- [ ] `nginx -s reload` (upstream.conf 이전 color로 복구) — 5초 이내
- [ ] `docker compose logs --tail=100 spring-blue` 로 오류 확인
- [ ] Grafana에서 `http_server_requests{status=~"5.."}` 패널 즉시 확인
