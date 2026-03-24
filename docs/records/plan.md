# JackpotChain 구현 계획

> 최종 업데이트: 2026-03-23
> 현재 단계: 로컬 통합 테스트 완료 → 배포 환경 구축 단계 진입

---

## 전체 로드맵

```
[완료] Phase 1: 백엔드 기반 + DB + JackpotChain RPC 연동
[완료] Phase 2: 로컬 Docker 스택 구축 + FE-API 전 흐름 연동
[완료] Phase 3: 로컬 통합 QA (전 시나리오 PASS)
──────────────────────────────────────────
[진행 예정] Phase 4: CI/CD (Jenkins) + 배포 환경 구축
[진행 예정] Phase 5: 모니터링 스택 구축
[진행 예정] Phase 6: 성능 테스트
```

---

## ✅ 완료된 작업

### [완료] 1. BE 기반 환경

- [x] Spring Boot 프로파일 분리 (local / prod)
- [x] PostgreSQL / Redis / RabbitMQ 연결
- [x] 공통 응답/예외 구조 (`code`, `message`, `timestamp`)
- [x] Global Exception Handler (4xx → domain exception, 5xx → system exception)
- [x] `/actuator/health` 노출

### [완료] 2. ERD 기반 JPA 엔티티 + Flyway

- [x] wallet, block, transaction, wallet_activity, lotto_entry, jackpot_pool, lotto_ranking, auth_refresh_session 엔티티
- [x] Flyway 마이그레이션 (초기 스키마 + 인덱스)
- [x] Repository 기본 구성

### [완료] 3. JackpotChain RPC 연동

- [x] `JackpotChainRpcClient` 인터페이스 + `JackpotChainHttpRpcClient` 구현
- [x] `getblockcount`, `getblockchaininfo`, `getlottoinfo`, `getjackpotpool`, `getbalances`, `listunspent`, `listpoolunspent` 래핑
- [x] `sendrawtransaction` (commit/claim/exchange TX relay)
- [x] `--rpc-host` CLI 인자 추가 (Docker `0.0.0.0` override 지원)
- [x] Webhook 수신 (`POST /internal/new-block`) → 블록 인덱싱

### [완료] 4. 로컬 Docker 스택 안정화

- [x] `blockchain/Dockerfile`, `.dockerignore`, `entrypoint.sh`
- [x] `docker-compose.local.yml` 전 서비스 (postgres, redis, rabbitmq, jackpotchain-node, backend, frontend)
- [x] healthcheck `condition: service_healthy` 전 서비스 적용
- [x] wallet/data volume 영속성 (`node-wallet:/wallets`, `node-data:/data`)
- [x] nginx SPA 라우팅 (`index.html` fallback)

### [완료] 5. 핵심 REST API 구현

- [x] 인증: `/auth/challenge`, `/auth/verify`, `/auth/refresh`, `/auth/logout`
- [x] 지갑: `POST /wallet`, `GET /wallet`, `GET /wallet/{addr}/activities`, `GET /wallet/{addr}/utxos`
- [x] 블록체인: `GET /blockchain/dashboard`, `GET /blockchain/blocks/{height}`
- [x] 로또: `GET /lotto`, `POST /lotto/commit`, `GET /lotto/entries`, `GET /lotto/entries/{hash}/result`, `GET /lotto/entries/{hash}/claim-context`, `POST /lotto/claim`
- [x] 교환: `GET /exchange/info`, `POST /exchange/jack-to-pot`
- [x] 채굴: `GET /mining/blocks`

### [완료] 6. FE-API 전 흐름 연동

- [x] 인증 흐름: `walletAuthFlowService` (challenge → sign → verify)
- [x] IndexedDB 암호화 key 저장 (`useWalletStore`, `useWalletSessionStore`)
- [x] signed TX builder: version 1/2/3/5 (`txBuilder.ts`)
- [x] claim write flow: 브라우저에서 signed version=5 TX 생성 → relay
- [x] Polling: `usePollingQuery` (탭 비활성화 pause, AbortController)
- [x] Axios interceptor: 401 자동 refresh, 403 처리
- [x] 온보딩 1 POT 지급 흐름

### [완료] 7. 로컬 통합 QA (전 시나리오 PASS — 2026-03-22)

- [x] 전 API 엔드포인트 (30개 시나리오)
- [x] 인증 보안 (401/403, stale challenge, cross-wallet 차단)
- [x] Exchange success (funded wallet signed TX)
- [x] Lotto commit → 결과 확정 (N+18) → claim context → signed claim → read model sync
- [x] BE test suite PASS, FE Vitest(40개) PASS, blockchain pytest(12개) PASS, QA harness PASS

---

## 🔲 진행 예정 작업

## 8. CI/CD (Jenkins) + 배포 환경 구축

> 현재 전제:
> - Host Nginx 사용
> - 외부 Jenkins EC2 사용
> - Docker Hub 사용
> - Main EC2 내부에 `~/app`, `~/deploy-repo` 분리
> - Blue/Green 배포 적용
> - Dev / Prod / Monitoring 분리 운영

목표: GitLab push → Jenkins 자동 빌드/이미지 푸시 → Main EC2 자동 배포까지 완성한다.

---

### 8-1. 현재까지 완료된 기초 작업

- [x] Main EC2 SSH 접속 확인
- [x] Jenkins EC2 접속 확인
- [x] Main EC2에 Docker / Docker Compose 설치
- [x] Main EC2에 Host Nginx 설치 및 실행 확인
- [x] Main EC2 디렉토리 구조 생성
  - [x] `~/app/compose`
  - [x] `~/app/env`
  - [x] `~/app/scripts`
  - [x] `~/app/monitoring`
- [x] Main EC2에 운영용 Nginx 설정 파일 생성
  - [x] `/etc/nginx/conf.d/upstream.conf`
  - [x] `/etc/nginx/sites-available/jackpotchain`
- [x] 도메인 DNS 설정
  - [x] `ssatto777.site` → Main EC2
  - [x] `dev.ssatto777.site` → Main EC2
- [x] Jenkins Credentials 등록
  - [x] `dockerhub-creds`
  - [x] `main-ec2-ssh`
  - [x] `gitlab-api-token`
  - [x] `gitlab-https-auth`
- [x] Jenkins 새 Pipeline Job 생성
- [x] GitLab Connection 연동
- [x] Jenkinsfile 초안 작성

---

### 8-2. Main EC2 디렉토리 구조 확정

```bash
~/app/
├── compose/
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   └── docker-compose.monitoring.yml
├── env/
│   ├── .env.dev
│   └── .env.prod
├── scripts/
│   ├── switch-color.sh
│   ├── health-check.sh
│   ├── rollback.sh
│   ├── deploy-dev.sh
│   └── deploy-prod.sh
└── monitoring/
    ├── prometheus/
    │   └── prometheus.yml
    ├── loki/
    │   └── config.yml
    └── promtail/
        └── config.yml

~/deploy-repo/
└── GitLab 원본 저장소 clone 위치
```

운영 원칙:
- `~/deploy-repo`는 GitLab 원본 동기화 용도
- `~/app`은 실제 실행 파일 위치
- Jenkins는 Main EC2에 SSH 접속 후 `~/deploy-repo`에서 git pull
- 이후 `~/app`에 필요한 파일을 복사하고 배포 스크립트를 실행

---

### 8-3. EC2 사전 준비 (사람이 직접 수행)

체크리스트:

- [ ] Main EC2 보안 그룹 확인
  - [ ] 22 허용
  - [ ] 80 허용
  - [ ] 443 허용
- [ ] Main EC2 UFW 확인
  - [ ] 22/tcp 허용
  - [ ] 80/tcp 허용
  - [ ] 443/tcp 허용
- [ ] Host Nginx 상태 확인
- [ ] prod-net, dev-net, monitoring-net 생성
- [ ] Main EC2에 `~/deploy-repo` clone 완료
- [ ] Main EC2에서 GitLab git pull 가능 상태 확인
- [ ] Main EC2에 `.env.dev`, `.env.prod` 실제값 작성
- [ ] Docker Hub 저장소 생성
  - [ ] `jooyoonjang/jackpotchain-be`
  - [ ] `jooyoonjang/jackpotchain-fe`
  - [ ] `jooyoonjang/jackpotchain-node`
- [ ] Jenkins EC2 → Main EC2 SSH 배포 키 검증
- [ ] Jenkins → Docker Hub 로그인 테스트
- [ ] Jenkins → GitLab checkout 테스트

---

### 8-4. docker-compose.prod.yml 완성

체크리스트:

- [ ] `docker-compose.prod.yml` 최종 작성
- [ ] `docker compose --env-file ~/app/env/.env.prod -f ~/app/compose/docker-compose.prod.yml config` 검증
- [ ] spring-blue 서비스 정의 (host port 8080:8080)
- [ ] spring-green 서비스 정의 (host port 8081:8080)
- [ ] frontend-prod 서비스 정의 (host port 3000:80)
- [ ] postgresql 서비스 정의
- [ ] redis 서비스 정의
- [ ] rabbitmq 서비스 정의
- [ ] jackpotchain-node 서비스 정의
- [ ] prod-net, dev-net, monitoring-net 연결 구조 검증
- [ ] 모든 주요 서비스에 healthcheck 적용
- [ ] 이미지 태그를 `.env.prod`의 `IMAGE_TAG`로 통제
- [ ] `latest` 상시 고정 사용 금지
- [ ] node-data / node-wallet volume 영속성 검증
- [ ] RPC 포트(8332) 외부 비공개 유지
- [ ] P2P 포트(8333) 외부 오픈 여부 최종 결정

---

### 8-5. docker-compose.dev.yml 완성

체크리스트:

- [ ] `docker-compose.dev.yml` 최종 작성
- [ ] `docker compose --env-file ~/app/env/.env.dev -f ~/app/compose/docker-compose.dev.yml config` 검증
- [ ] spring-dev 서비스 정의 (host port 8082:8080)
- [ ] frontend-dev 서비스 정의 (host port 3001:80)
- [ ] postgresql-dev 서비스 정의
- [ ] redis-dev 서비스 정의
- [ ] rabbitmq-dev 서비스 정의
- [ ] dev 환경도 healthcheck 전 서비스 적용
- [ ] jackpotchain-node 공용 사용 여부 기준 정리
- [ ] `IMAGE_TAG`를 `.env.dev`에서 교체 가능하도록 유지

---

### 8-6. docker-compose.monitoring.yml 완성

체크리스트:

- [ ] `docker-compose.monitoring.yml` 최종 작성
- [ ] Prometheus / Grafana / Loki / Promtail / cAdvisor 정의
- [ ] `docker compose -f ~/app/compose/docker-compose.monitoring.yml config` 검증
- [ ] Spring `/actuator/prometheus` 스크랩 가능 확인
- [ ] Prometheus scrape_config 반영
- [ ] Grafana 접속 확인
- [ ] Loki / Promtail 연결 확인
- [ ] cAdvisor 메트릭 수집 확인

---

### 8-7. Host Nginx prod/dev 설정

현재 구조:
- `ssatto777.site` → prod
- `dev.ssatto777.site` → dev

체크리스트:

- [ ] upstream.conf 분리
  - [ ] 운영 active spring upstream 정의
- [ ] ssatto777.site server block 생성
  - [ ] `/api` → active_spring
  - [ ] `/` → 127.0.0.1:3000
- [ ] dev.ssatto777.site server block 생성
  - [ ] `/api` → 127.0.0.1:8082
  - [ ] `/` → 127.0.0.1:3001
- [ ] `/internal/` 외부 차단 규칙 추가
- [ ] TLS 설정 (Let's Encrypt)
- [ ] HSTS 적용
- [ ] Security Headers 적용
  - [ ] X-Frame-Options
  - [ ] X-Content-Type-Options
  - [ ] Referrer-Policy
- [ ] auth/write 계열 rate limiting 적용 여부 결정
- [ ] `nginx -t` 검증 가능 상태
- [ ] `systemctl reload nginx` 반영 가능 상태

---

### 8-8. Blue/Green 전환 스크립트

체크리스트:

- [ ] `scripts/switch-color.sh` 작성
- [ ] `scripts/health-check.sh` 작성
- [ ] `scripts/rollback.sh` 작성
- [ ] `scripts/deploy-prod.sh` 최종 보강
  - [ ] inactive color(green) pull/up
  - [ ] health check
  - [ ] smoke test
  - [ ] upstream 전환
  - [ ] reload
- [ ] healthcheck 실패 시 자동 rollback 트리거
- [ ] 이전 color 정리 정책 결정 (standby 유지 / 즉시 down)
- [ ] 수동 Blue → Green 전환 1회 테스트
- [ ] 전환 절차 runbook 작성 `docs/runbooks/blue-green.md`

---

### 8-9. Jenkinsfile 작성 및 파이프라인 단계 확정

목표 파이프라인:

```
Checkout → Determine Branch → Build → Docker Login → Build Image → Push Image → Deploy
```

체크리스트:

- [ ] Jenkinsfile 초안 작성
- [ ] Jenkinsfile 최종 반영
- [ ] `disableConcurrentBuilds()` 적용
- [ ] 브랜치 분기 적용
  - [ ] `develop` → dev 배포
  - [ ] `master/main` → prod 배포
- [ ] Docker Hub 로그인 단계 확인
- [ ] 이미지 태그를 `BUILD_NUMBER` 또는 commit SHA로 최종 확정
- [ ] Main EC2 SSH 접속 후 아래 절차 수행
  - [ ] `~/deploy-repo`에서 `git fetch` / `git pull`
  - [ ] `~/app`에 compose / scripts / monitoring 복사
  - [ ] `.env.dev`, `.env.prod`의 `IMAGE_TAG` 치환
  - [ ] 배포 스크립트 실행
    - [ ] dev 배포는 `deploy-dev.sh`
    - [ ] prod 배포는 `deploy-prod.sh green`
- [ ] 배포 실패 시 rollback 스크립트 연동
- [ ] Jenkins credentials store 사용
- [ ] 민감 정보 echo 금지

---

### 8-10. Jenkins 설정 작업

체크리스트:

- [ ] 새 Pipeline Job 생성
- [ ] GitLab Connection 연결
- [ ] SCM 설정 최종 확정
  - [ ] Repository URL 입력
  - [ ] Credentials: `gitlab-https-auth`
  - [ ] Branches to build: `*/develop`, `*/master` 또는 `*/main`
  - [ ] Script Path: `Jenkinsfile`
- [ ] General 설정
  - [ ] Description 입력
  - [ ] Do not allow concurrent builds 체크
- [ ] Trigger 설정
  - [ ] Build when a change is pushed to GitLab 체크
  - [ ] Push Events 활성화
  - [ ] Merge Request Events 사용 여부 결정
- [ ] GitLab Webhook URL 복사
- [ ] GitLab 프로젝트 Webhook 등록
- [ ] Webhook Secret 적용 여부 결정

---

### 8-11. GitLab / Docker Hub / SSH Credential 검증

체크리스트:

- [ ] Jenkins Credentials 등록 완료
  - [ ] `dockerhub-creds`
  - [ ] `main-ec2-ssh`
  - [ ] `gitlab-api-token`
  - [ ] `gitlab-https-auth`
- [ ] Jenkins에서 GitLab checkout 수동 테스트
- [ ] Jenkins에서 Docker Hub login 수동 테스트
- [ ] Jenkins에서 Main EC2 SSH 접속 수동 테스트 (`ssh ubuntu@15.165.75.53`)
- [ ] Main EC2에서 `~/deploy-repo` Git pull 테스트
- [ ] Main EC2에서 Docker Hub pull 테스트

---

### 8-12. 배포 검증 기준

**A. Dry Run**

- [ ] feature 브랜치 기준 build/test만 동작하는지 확인
- [ ] 배포 브랜치 외에는 배포 stage 차단되는지 확인

**B. Dev 자동 배포**

- [ ] `develop` push → Jenkins 자동 실행
- [ ] `~/app/env/.env.dev`의 `IMAGE_TAG` 갱신 확인
- [ ] `docker-compose.dev.yml` pull / up 동작 확인
- [ ] `dev.ssatto777.site` 접속 확인
- [ ] `GET /api/blockchain/dashboard` smoke test 확인

**C. Prod Blue/Green 자동 배포**

- [ ] `master/main` push → Jenkins 자동 실행
- [ ] inactive color(green) pull / up 확인
- [ ] green `/actuator/health` 성공
- [ ] prod smoke test 성공
- [ ] `switch-color.sh green` 전환 성공
- [ ] `ssatto777.site` 무중단 확인
- [ ] 실패 시 rollback 동작 확인

**D. 모니터링 검증**

- [ ] Grafana에서 Spring / JVM / Container 대시보드 확인
- [ ] 배포 중 error rate 급증 여부 확인
- [ ] Blue → Green 전환 구간 latency 확인
- [ ] Loki에서 배포 직후 로그 추적 가능 여부 확인

---

### 8-13. 이번 Phase 완료 기준

완료 조건:
- Jenkins에서 GitLab push를 자동 감지한다
- Jenkins가 Docker 이미지를 빌드하고 Docker Hub에 push한다
- Jenkins가 Main EC2에 SSH 접속해 배포 스크립트를 실행한다
- `develop` 브랜치 push 시 dev 환경이 자동 갱신된다
- `master/main` 브랜치 push 시 green 배포 후 healthcheck를 통과하면 active color가 전환된다
- 배포 실패 시 rollback이 가능하다
- 배포 후 Grafana / Loki로 상태를 확인할 수 있다

산출물:
- `Jenkinsfile`
- `docker-compose.prod.yml`
- `docker-compose.dev.yml`
- `docker-compose.monitoring.yml`
- `scripts/deploy-dev.sh`
- `scripts/deploy-prod.sh`
- `scripts/switch-color.sh`
- `scripts/rollback.sh`
- `docs/runbooks/blue-green.md`

---

### Phase 5: 모니터링 스택 구축

> 목표: 장애 감지, 원인 추적, 핵심 메트릭 가시화

#### 5-1. 모니터링 서비스 Docker Compose 추가

```
- [ ] docker-compose.monitoring.yml (또는 prod.yml에 monitoring-net으로 통합)
- [ ] Prometheus, Grafana, Loki, Promtail, cAdvisor 서비스 정의
- [ ] 각 서비스 설정 파일 작성:
      - prometheus.yml (scrape targets)
      - loki-config.yaml
      - promtail-config.yaml
      - grafana datasource provisioning
```

#### 5-2. Backend 메트릭 노출

```
- [ ] Spring Actuator prometheus endpoint 활성화 (/actuator/prometheus)
- [ ] MDC 필드 확인: traceId, requestId, eventType, uri, method
- [ ] 구조화 JSON 로그 (Loki 호환)
- [ ] RequestLoggingFilter — 요청 단위 traceId 주입
- [ ] 핵심 eventType 로그 검증:
      AUTH_TOKEN_ISSUED, WALLET_REGISTERED, EXCHANGE_TRANSACTION_SUBMITTED,
      LOTTO_COMMIT_SUBMITTED, JACKPOTCHAIN_TRANSACTION_SUBMITTED
```

#### 5-3. Grafana 대시보드

```
- [ ] Spring Boot 기본 대시보드 (JVM, HTTP, DB)
- [ ] 비즈니스 메트릭 대시보드:
      - RPC latency (JackpotChain 응답 시간)
      - Cache hit ratio (Redis)
      - Outbox pending count
      - Commit/Claim 요청 수
      - HikariCP pending connections
- [ ] 알림 규칙:
      - RPC latency > 3s → WARN
      - 500 에러율 > 1% → CRITICAL
      - node 연결 끊김 → CRITICAL
```

#### 5-4. Loki 로그 수집

```
- [ ] Promtail → 컨테이너 로그 수집
- [ ] Grafana에서 Loki 로그 조회 확인
- [ ] 핵심 이벤트 로그 검색 검증 (eventType 기준)
```

**검증 기준:**
- `http://localhost:9090/targets` → 전 target UP
- `http://localhost:3001` Grafana 접속
- `/actuator/prometheus` 메트릭 확인
- Loki에서 컨테이너 로그 조회
- 의도적 RPC 오류 주입 → Grafana 알림 확인

---

### Phase 6: 성능 테스트

> 목표: baseline 측정 → 병목 식별 → 개선 → 결과 문서화

#### 6-1. Baseline 측정

```
도구: nGrinder 또는 JMeter
대상 시나리오:
- GET /blockchain/dashboard       (100 VU, 5분)
- GET /lotto/entries?address=X    (50 VU, 5분)
- GET /lotto?address=X            (50 VU, 5분)
- POST /lotto/commit              (20 VU, 5분)

수집 지표:
- avg / p95 / p99 latency
- TPS (Transactions Per Second)
- Error rate
- HikariCP pending connection count
- RPC latency
```

#### 6-2. 성능 개선 P1 — HikariCP 튜닝

```
- [ ] maximumPoolSize, minimumIdle, connectionTimeout 최적화
- [ ] Before/After p95 latency 비교
- [ ] 설정 근거 문서화
```

#### 6-3. 성능 개선 P2 — Redis Cache-Aside

```
대상: 빈번한 RPC 조회 (getblockchaininfo, getjackpotpool)
- [ ] @Cacheable 적용 + TTL 전략
- [ ] cache hit ratio Before/After 비교
- [ ] 캐시 무효화 전략 (Webhook 블록 수신 시 evict)
```

#### 6-4. 성능 개선 P3 — RabbitMQ Outbox 비동기화

```
대상: 블록 인덱싱 경로 (Webhook → DB sync)
- [ ] Outbox 패턴 활성화 (설계 완료, 구현 대기)
- [ ] Webhook 수신 응답 속도 Before/After
- [ ] outbox pending count 모니터링 확인
```

#### 6-5. 성능 개선 P4 — 읽기 최적화

```
- [ ] 조회 패턴 N+1 확인 (lotto entries, activities)
- [ ] 투영(Projection) 적용 불필요한 컬럼 제거
- [ ] Batch insert (블록 인덱싱 bulk 처리)
- [ ] Before/After 비교
```

**검증 기준:**
- 전 개선 단계 Before/After 수치 기록
- p95 latency < 500ms (GET), < 1000ms (POST /lotto/commit)
- 결과 `docs/result/performance-baseline-{date}.md` 작성

---

## 단계별 선행 조건 요약

```
Phase 4 시작 전:
  - EC2 접속 가능, Docker 설치 완료
  - Jenkins EC2 구성 완료
  - .env.prod 준비 (DB 계정, JWT secret 등)

Phase 5 시작 전:
  - Phase 4 완료 (배포 환경 정상 동작)
  - /actuator/prometheus 엔드포인트 응답 확인

Phase 6 시작 전:
  - Phase 5 완료 (Grafana/Loki 정상 수집)
  - 부하 테스트 도구 설치 (nGrinder/JMeter)
  - 테스트용 지갑/데이터 준비 스크립트
```

---

## 로컬 QA 전용 RPC 정리 (운영 경로와 구분)

아래는 로컬 QA에서만 사용하는 RPC이며, 운영 계약으로 간주하지 않는다.

| RPC | 용도 |
|-----|------|
| `grantlocaljack` | 로컬 QA용 JACK 직접 지급 |
| `mineqablocks` | QA용 블록 강제 채굴 |
| `listpoolunspent` | 잭팟 풀 UTXO 직접 조회 |

운영에서는 이 RPC를 절대 노출하지 않는다. 별도 runbook으로 분리 예정.
