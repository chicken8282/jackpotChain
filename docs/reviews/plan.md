# JackpotChain 구현 계획 (Plan)

> FE 완료 상태. BE는 Spring Boot 초기 세팅만 된 상태에서 시작.
> 목표: 기술 스택을 단계적으로 추가하면서 **Before/After 성능 측정**을 기록한다.
> CI/CD 자동화 배포를 성능 테스트 전에 완료하여 도커 실행 여부와 관계없이 모니터링을 지속 확인할 수 있도록 한다.

---

## Before/After 성능 측정 시나리오 전략

> 부하 도구: **nGrinder** (분산 부하) / **JMeter** (시나리오 기반)
> 관측 도구: **Prometheus + Grafana** (메트릭) / **Loki** (로그)

### 측정 대상 요약

| # | 측정 주제 | Before | After | 핵심 지표 |
|---|-----------|--------|-------|-----------|
| P1 | HikariCP Pool 튜닝 | 기본값 (pool=10) | 최적화 pool size + timeout | connection wait time, TPS |
| P2 | Redis Cache-Aside | 매 요청 DB/RPC 직접 호출 | Redis 캐시 적용 | avg/p95 latency, RPC call 빈도 |
| P3 | 동기 Commit → Outbox 비동기 | RPC 완료까지 블로킹 응답 | DB+Outbox 저장 후 즉시 응답 | throughput, response time |
| P4 | Outbox Dispatcher 배치 처리 | 이벤트 1건씩 발행 | N건 배치 발행 | outbox 처리 TPS, DB I/O |

### 시나리오별 부하 설계

```
P1 (HikariCP 기준 성능)
  - 시나리오: GET /blockchain/dashboard, GET /lotto/entries?address=X
  - 동시 사용자: 50 → 100 → 200 VU, 유지 시간: 3분
  - 기록: avg / p95 / p99 latency, TPS, hikaricp_connections_pending (Prometheus)

P2 (Redis 캐시)
  - 시나리오: GET /lotto?address=X, GET /blockchain/dashboard 반복 조회
  - 동시 사용자: 100 VU, 5분
  - 기록: cache_hit_ratio, RPC 호출 빈도, avg latency before vs after

P3 (Outbox 비동기)
  - 시나리오: POST /lotto/commit 동시 다중 요청
  - 동시 사용자: 30 VU (Commit은 무거운 요청)
  - 조건: Node RPC에 의도적 500ms 지연 주입 후 측정
  - 기록: API response time, throughput, error rate

P4 (Dispatcher 배치)
  - 시나리오: outbox_pending_count 500건 주입 후 처리 속도 측정
  - before: dispatcher 1건씩 처리
  - after: 50건 배치 처리
  - 기록: outbox 소진 시간, DB I/O (insert/update 횟수)
```

---

## 1. BE 기반 환경 세팅

> Spring Boot 구조 잡기, DB 연결, 공통 설정

- [ ] `application.yml` 분리: `application.yml` / `application-local.yml` / `application-prod.yml`
- [ ] PostgreSQL Docker Compose 로컬 설정 작성 (`docker-compose.local.yml`)
- [ ] HikariCP 기본 DataSource 연결 확인
- [ ] JPA 기본 설정 (`ddl-auto: validate`, `show-sql`, dialect)
- [ ] 공통 응답 포맷 정의 (`ApiResponse<T>` wrapper)
- [ ] 공통 예외 처리 (`@RestControllerAdvice`, `ErrorCode` enum)
- [ ] Lombok, Validation 의존성 추가 및 동작 확인
- [ ] Health check 엔드포인트 확인 (`/actuator/health`)
- [ ] 패키지 구조 확정 (모듈러 모놀리식: `blockchain / wallet / exchange / lotto / mining / ops`)

---

## 2. ERD 기반 JPA 엔티티 + Flyway 마이그레이션

> DB 스키마를 코드로 관리

- [ ] `docs/reviews/erd.md` 기반으로 엔티티 클래스 작성
  - [ ] `Wallet` (지갑 메타데이터)
  - [ ] `Block` (블록 인덱싱)
  - [ ] `Transaction` (TX 인덱싱, version별)
  - [ ] `WalletActivity` (지갑 활동 내역)
  - [ ] `LottoEntry` (로또 참여 기록)
  - [ ] `JackpotPool` (잭팟 풀 캐시, 단일 레코드)
  - [ ] `LottoRanking` (역대 Top 3 랭킹)
  - [ ] `OutboxEvent` (Outbox 패턴용)
- [ ] Flyway 의존성 추가
- [ ] `V1__init_schema.sql` 작성 (최초 스키마)
- [ ] `V2__add_indexes.sql` 작성 (복합 인덱스, 부분 인덱스)
  - [ ] `wallet_activity(wallet_address, created_at DESC)` 복합 인덱스
  - [ ] `lotto_entry(wallet_address, created_at DESC)` 복합 인덱스
  - [ ] `lotto_entry(status, claimable_from_height)` 복합 인덱스
  - [ ] `block(miner_address)`, `block(mined_at DESC)` 인덱스
  - [ ] `outbox_events(status, created_at)` 부분 인덱스 (`WHERE status = 'PENDING'`)
- [ ] 엔티티 연관관계 매핑 확인 (Lazy 로딩 기본값 설정)
- [ ] Repository 인터페이스 작성 (JpaRepository 상속)

---

## 3. JackpotChain RPC 클라이언트 구현

> Spring → JackpotChain Node JSON-RPC 연결

- [ ] JSON-RPC 요청/응답 공통 모델 작성 (`JsonRpcRequest`, `JsonRpcResponse<T>`)
- [ ] `WebClient` 기반 RPC 클라이언트 구현
- [ ] RPC 메서드별 클라이언트 메서드 구현
  - [ ] `getblockcount()` — 현재 블록 높이
  - [ ] `getblock(hash)` — 블록 상세
  - [ ] `getlottoinfo(blockHeight)` — 로또 정보 조회
  - [ ] `getjackpotpool()` — 잭팟 풀 조회
  - [ ] `getbalance(address)` — 지갑 잔액 (JACK/POT)
  - [ ] `listunspent(address)` — UTXO 목록
  - [ ] `sendrawtransaction(signedTxHex)` — TX 브로드캐스트
  - [ ] `lottocheckresult(commitHash)` — 결과 조회
- [ ] RPC 연결 설정 외부화 (`rpc.host`, `rpc.port`, `rpc.timeout`)
- [ ] 로컬에서 JackpotChain Node 실행 후 RPC 통신 동작 확인
- [ ] RPC 에러 응답 파싱 및 예외 변환 처리

---

## 4. 핵심 REST API 구현 (BE)

> FE에서 필요한 API 엔드포인트 구현 (`docs/reviews/api.md` 기준)

- [ ] **Auth API**
  - [ ] `POST /auth/token` — JWT 토큰 발급 (지갑 주소 기반)
  - [ ] JWT 필터 구현 (`JwtAuthenticationFilter`)
- [ ] **Blockchain API**
  - [ ] `GET /blockchain/dashboard?limit=10` — 대시보드 통합 조회
  - [ ] `GET /blockchain/blocks/{height}` — 블록 상세 조회
- [ ] **Wallet API**
  - [ ] `POST /wallet` — 지갑 등록 (메타데이터 + WALLET_CREATED activity)
  - [ ] `GET /wallet?addresses=...` — 다중 지갑 목록 조회 (RPC 잔액 포함)
  - [ ] `GET /wallet/{address}/activities` — 활동 내역 조회 (커서 페이지네이션)
- [ ] **Exchange API**
  - [ ] `GET /exchange/info?address=...` — 교환 정보 (JACK/POT 잔액)
  - [ ] `POST /exchange/jack-to-pot` — JACK→POT 교환 (signed TX)
- [ ] **Lotto API**
  - [ ] `GET /lotto?address=...` — 로또 페이지 통합 조회
  - [ ] `POST /lotto/commit` — 로또 참여 (signed TX)
  - [ ] `GET /lotto/entries` — 참여 내역 목록 조회
  - [ ] `GET /lotto/entries/{commitHash}/result` — 참여 결과 조회
  - [ ] `POST /lotto/claim` — 보상 수령 (signed TX)
- [ ] **Mining API**
  - [ ] `GET /mining/blocks?address=...` — 내 채굴 블록 목록 (커서 페이지네이션)
- [ ] **Node Webhook 수신 엔드포인트**
  - [ ] `POST /internal/webhook/block` — 새 블록 이벤트 수신 + 인덱싱
- [ ] 각 API `.http` 파일 작성

---

## 5. FE–API 연동 테스트

> 실제 BE API와 FE를 붙이고 전체 사용자 흐름 검증

- [ ] FE `vite.config.ts` proxy 설정 (로컬 BE 포트로 프록시)
- [ ] **인증 흐름** 연동 확인
  - [ ] `POST /auth/token` → JWT localStorage 저장 → API 헤더 자동 첨부
- [ ] **지갑 흐름** 연동 확인
  - [ ] 지갑 생성 API 호출 → 메타데이터 등록 → 잔액 조회
  - [ ] 다중 지갑 일괄 조회 → 캐러셀 UI 반영
  - [ ] JACK→POT 교환 API 호출 → 잔액 업데이트
- [ ] **대시보드 흐름** 연동 확인
  - [ ] `GET /blockchain/dashboard` 단일 호출 → 블록 높이·노드·블록 목록 분기
  - [ ] 블록 상세 모달 → `GET /blockchain/blocks/{height}`
- [ ] **로또 흐름** 연동 확인
  - [ ] `GET /lotto?address=...` → 잭팟 풀, 랭킹, 잔액
  - [ ] Commit 참여 → `POST /lotto/commit` → `GET /lotto/entries` 폴링 확인
  - [ ] 결과 조회 → `GET /lotto/entries/{commitHash}/result`
  - [ ] Claim 요청 → `POST /lotto/claim` → 성공/실패 처리
- [ ] **채굴 흐름** 연동 확인
  - [ ] `GET /mining/blocks?address=...` → 내 채굴 블록 목록
- [ ] **에러 케이스** 확인
  - [ ] Node RPC 실패 시 FE 에러 메시지 표시
  - [ ] 잘못된 지갑 주소 validation 처리
  - [ ] 401 응답 시 토큰 재발급 흐름
- [ ] 전체 사용자 흐름 E2E 시나리오 1회 통과 확인

---

## 6. 모니터링 스택 구성 (Prometheus + Grafana + Loki)

> 성능 측정의 관측 기반을 먼저 완성한다 — 이후 Before/After 비교의 전제 조건

- [ ] `docker-compose.monitoring.yml` 작성 (Prometheus, Grafana, Loki, Promtail, cAdvisor)
- [ ] Spring Boot Actuator 설정
  - [ ] `management.endpoints.web.exposure.include: health,info,prometheus,metrics`
  - [ ] Micrometer Prometheus Registry 의존성 추가
- [ ] Prometheus `scrape_config` 설정 (Spring `/actuator/prometheus` 스크랩)
- [ ] Grafana 기본 대시보드 구성
  - [ ] Spring Boot 공식 대시보드 import (ID: 12900)
  - [ ] JVM 대시보드 import (ID: 4701)
  - [ ] cAdvisor 컨테이너 대시보드 구성
- [ ] Loki + Promtail 연결 확인 (Spring 로그 수집 확인)
- [ ] JSON 구조화 로그 설정 (logstash-logback-encoder)
  - [ ] `traceId`, `spanId`, `walletAddress`, `commitHash`, `eventType` 키 포함
- [ ] 커스텀 메트릭 등록
  - [ ] `lottery_commit_requests_total` (Counter)
  - [ ] `lottery_claim_attempt_total` / `lottery_claim_success_total` (Counter)
  - [ ] `blockchain_rpc_latency_ms` (Timer)
  - [ ] `outbox_pending_count` (Gauge)
  - [ ] `cache_hit_ratio` (Gauge — 캐시 적용 전에는 0 고정)
  - [ ] `queue_depth` (Gauge — MQ 적용 전에는 0 고정)
- [ ] Grafana에서 커스텀 메트릭 패널 추가 확인

---

## 7. Blue/Green 배포 환경 구성

> CI/CD 파이프라인 연결 전 배포 구조를 먼저 완성

- [ ] Host Nginx 설치 및 설정
  - [ ] `upstream.conf` 분리 (active color 전환 스크립트로 교체)
  - [ ] SSL/TLS 인증서 설정 (Let's Encrypt)
  - [ ] `/api`, `/dev/api`, `/`, `/dev` 라우팅 설정
- [ ] `docker-compose.prod.yml` 작성 (blue / green 각각 서비스 정의)
- [ ] Blue/Green 전환 스크립트 작성 (`scripts/switch-color.sh`)
  ```bash
  # 사용법: ./switch-color.sh green
  # → upstream.conf 수정 → nginx -s reload
  ```
- [ ] Health check 스크립트 작성 (`scripts/health-check.sh`)
- [ ] 롤백 스크립트 작성 (`scripts/rollback.sh`)
- [ ] 수동 Blue → Green 전환 1회 테스트
- [ ] 전환 중 다운타임 0 확인 (nGrinder로 전환 중 error rate 모니터링)

---

## 8. CI/CD (Jenkins) 연결

> 자동화 배포 완료 후 성능 테스트 진입 — 모니터링 스택을 지속적으로 확인 가능하게

- [ ] Jenkins EC2 Docker 설치 및 Jenkins 컨테이너 실행
- [ ] Jenkins → Git Repository Webhook 연결
- [ ] Jenkins Pipeline 작성 (`Jenkinsfile`)
  - [ ] Stage 1: Build (Gradle)
  - [ ] Stage 2: Docker Image Build & Push (Docker Hub)
  - [ ] Stage 3: SSH로 Main EC2에 배포 스크립트 실행
  - [ ] Stage 4: Health Check (inactive color)
  - [ ] Stage 5: Smoke Test
  - [ ] Stage 6: Nginx upstream 전환
  - [ ] Stage 7: 이전 color 정리
- [ ] 배포 실패 시 자동 롤백 스크립트 연동
- [ ] develop 브랜치 push → Dev-Net 자동 배포
- [ ] main 브랜치 push → Prod-Net Blue/Green 배포
- [ ] 자동 배포 후 Grafana 모니터링 대시보드 지속 확인 가능 여부 검증

---

## 9. 부하 테스트 환경 구성 + Baseline 측정 (Before 기준선)

> P1~P4 모든 Before/After의 기준이 되는 Baseline을 먼저 기록한다

- [ ] nGrinder 또는 JMeter 설치 및 로컬 설정
- [ ] 테스트 스크립트 작성
  - [ ] 시나리오 A: `GET /blockchain/dashboard` (100 VU, 3분)
  - [ ] 시나리오 B: `GET /lotto/entries?address=X` (100 VU, 3분)
  - [ ] 시나리오 C: `POST /lotto/commit` (30 VU, 3분)
  - [ ] 시나리오 D: `GET /lotto?address=X` (100 VU, 5분)
- [ ] Grafana 대시보드에서 아래 지표 캡처 및 기록
  - [ ] avg / p95 / p99 response time
  - [ ] TPS (Transactions Per Second)
  - [ ] JVM heap usage, thread count
  - [ ] DB connection pool 사용률 (`hikaricp_connections_pending`)
  - [ ] `http_server_requests` 에러율
- [ ] `docs/performance/baseline.md` 파일에 수치 기록 (Baseline Before)

---

## 10. [Before/After P1] HikariCP Connection Pool 튜닝

> DB 커넥션 병목을 수치로 확인하고 최적값 탐색

### Before 측정
- [ ] `maximum-pool-size: 10` (기본값) 상태에서 시나리오 A+B 동시 실행
- [ ] Grafana에서 `hikaricp_connections_pending` 대기 수 기록
- [ ] connection timeout 에러 발생 여부 기록

### 튜닝 적용
- [ ] HikariCP 설정 조정
  ```yaml
  hikari:
    maximum-pool-size: 30
    minimum-idle: 10
    connection-timeout: 3000
    idle-timeout: 600000
    max-lifetime: 1800000
  ```
- [ ] `hikaricp_connections_*` 메트릭 Grafana 패널 추가

### After 측정
- [ ] 동일 시나리오 재실행
- [ ] `docs/performance/p1-hikari.md` 에 Before/After 수치 기록

---

## 11. [Before/After P2] Redis Cache-Aside 적용

> 조회성 API의 RPC/DB 부하를 캐시로 분산

### Before 측정
- [ ] 시나리오 D (`GET /lotto?address=X`, 100 VU, 5분) 실행
- [ ] Grafana에서 `blockchain_rpc_latency_ms`, avg response time 기록
- [ ] RPC 호출 횟수 기록 (로그 기반)

### 구현
- [ ] Redis 의존성 추가 (`spring-boot-starter-data-redis`)
- [ ] `RedisTemplate` 설정 (JSON 직렬화)
- [ ] `cache_hit_ratio` 커스텀 메트릭 구현 (hit/miss 카운터)
- [ ] 캐시 대상별 구현
  - [ ] 블록 높이 캐시 (TTL: 10초, `getblockcount` RPC 결과)
  - [ ] 잭팟 풀 캐시 (TTL: 60초, `getjackpotpool` RPC 결과)
  - [ ] 최근 블록 목록 캐시 (TTL: 15초)
  - [ ] 네트워크 상태 캐시 (TTL: 30초)
- [ ] 새 블록 Webhook 수신 시 캐시 수동 eviction 구현
- [ ] Redis 다운 시 fallback (try-catch → DB/RPC 직접 조회)

### After 측정
- [ ] 동일 시나리오 D 재실행
- [ ] `cache_hit_ratio`, `blockchain_rpc_latency_ms`, avg response time 비교
- [ ] `docs/performance/p2-redis.md` 에 Before/After 수치 기록

---

## 12. [Before/After P3] Outbox 패턴 (동기 → 비동기 Commit 분리)

> Commit API가 Node RPC 완료를 기다리지 않도록 구조 변경 후 throughput 측정

### Before 측정
- [ ] Node RPC에 의도적 500ms 지연 주입 (설정값으로 제어 가능하게)
- [ ] 시나리오 C (`POST /lotto/commit`, 30 VU, 3분) 실행
- [ ] avg response time, TPS, error rate 기록

### 구현
- [ ] `OutboxEvent` 엔티티 / Repository 완성
- [ ] Commit 트랜잭션 처리 변경
  - [ ] 기존: `DB 저장 → RPC 호출 → 응답`
  - [ ] 변경: `DB 저장 + Outbox 이벤트 저장 (단일 트랜잭션) → 즉시 200 응답`
- [ ] `OutboxDispatcher` 구현 (`@Scheduled`, 5초 주기)
  - [ ] `PENDING` 상태 이벤트 조회 → RPC 호출 → `PROCESSED` 업데이트
  - [ ] 실패 시 재시도 카운트 증가, 임계 초과 시 `FAILED` 처리
- [ ] `outbox_pending_count` Gauge 메트릭 연동
- [ ] RabbitMQ 없이 DB 기반으로 먼저 구현 (MQ는 이후 단계)

### After 측정
- [ ] 동일 시나리오 C 재실행 (Node 지연 500ms 유지)
- [ ] avg response time, TPS 비교 (응답이 RPC 완료를 기다리지 않으므로 극적 개선 예상)
- [ ] `docs/performance/p3-outbox-async.md` 에 Before/After 수치 기록

---

## 13. [Before/After P4] Outbox Dispatcher 배치 처리

> Dispatcher를 1건씩에서 N건 배치로 변경 시 처리량 비교

### Before 측정
- [ ] `outbox_events` 테이블에 500건 더미 이벤트 INSERT
- [ ] 1건씩 처리 Dispatcher 실행 → 전체 소진까지 시간 측정
- [ ] DB `UPDATE` 횟수, 실행 시간 기록

### 구현
- [ ] Dispatcher에 배치 사이즈 설정값 추가 (`outbox.dispatcher.batch-size: 50`)
- [ ] `LIMIT N`으로 배치 조회 후 일괄 RPC 호출 → 일괄 `PROCESSED` 업데이트
- [ ] 배치 UPDATE (`@Modifying` JPQL bulk update) 적용

### After 측정
- [ ] 동일 500건 주입 후 재실행
- [ ] 소진 시간, DB UPDATE 호출 횟수 비교
- [ ] `docs/performance/p4-outbox-batch.md` 에 Before/After 수치 기록

---

## 14. RabbitMQ 연동 + DLQ 설정

> Outbox Dispatcher가 DB 폴링 대신 MQ로 이벤트를 발행하도록 전환

- [ ] RabbitMQ Docker Compose 설정 추가
- [ ] Spring AMQP 의존성 추가
- [ ] Exchange / Queue / Binding 설정
  - [ ] `jackpot.events` (Fanout Exchange)
  - [ ] `block.index.queue` — 블록 인덱싱
  - [ ] `ops.notification.queue` — 운영 알림
  - [ ] `*.dlq` — Dead Letter Queue 각각 생성
- [ ] Outbox Dispatcher: DB 폴링 → RabbitMQ 발행으로 전환
- [ ] Consumer 구현 (block indexing, notification)
- [ ] ack / nack 처리 구현 (실패 시 DLQ 이동)
- [ ] `queue_depth` 메트릭 Grafana 패널 연동 확인
- [ ] RabbitMQ 다운 시 Outbox DB 폴링으로 자동 fallback 처리

---

## 15. Tracing 구성 (Micrometer + Tempo)

> 요청 한 건의 전체 경로 추적

- [ ] Micrometer Tracing + OpenTelemetry 의존성 추가
- [ ] Tempo Docker Compose 설정 추가
- [ ] Grafana Tempo 데이터소스 연결
- [ ] 커스텀 Span 구현 (최소 3개)
  - [ ] `blockchain.commit.rpc` — Commit RPC 구간
  - [ ] `reward.claim.rpc` — Claim RPC 구간
  - [ ] `block.webhook.index` — Webhook 블록 인덱싱 구간
- [ ] TraceId/SpanId JSON 로그에 자동 포함 확인 (`logback-spring.xml`)
- [ ] Grafana → Loki → Tempo 연결 (로그에서 TraceId 클릭 → Trace 뷰 이동) 확인

---

## 16. Grafana 알림 규칙 설정

- [ ] 알림 Contact Point 설정 (Discord Webhook)
- [ ] 알림 규칙 작성
  - [ ] 5분간 5xx 비율 > 10%
  - [ ] p95 latency > 800ms
  - [ ] `queue_depth` > 100
  - [ ] 최신 블록 높이 3분 이상 변화 없음 (`block_sync_lag_blocks`)
  - [ ] Claim 실패율 5분간 > 5%
  - [ ] Active color health down (Blue/Green 전환 후)
- [ ] 알림 실제 발생 테스트 (의도적 장애 주입 → Discord 수신 확인)

---

## 17. 장애 시나리오 검증 + 포스트모템 작성

> architecture.md 11번 장애 시나리오를 실제로 재현하고 포스트모템 기록

- [ ] **시나리오 1: Python Node RPC Timeout**
  - [ ] Node에 고의 지연 주입 → Redis fallback 응답 확인 → 알림 수신 확인
  - [ ] 포스트모템 작성 (`docs/postmortems/scenario-1-rpc-timeout.md`)
- [ ] **시나리오 2: RabbitMQ 중단**
  - [ ] RabbitMQ 컨테이너 강제 종료 → outbox backlog 쌓임 확인 → 재시작 후 재발행 확인
  - [ ] 포스트모템 작성
- [ ] **시나리오 3: Redis 다운**
  - [ ] Redis 컨테이너 강제 종료 → cache_hit_ratio 0 확인 → 서비스 정상 동작 확인
  - [ ] 포스트모템 작성
- [ ] **시나리오 4: 잘못된 Migration**
  - [ ] 의도적으로 오류 있는 migration 파일 배포 시도 → health check 실패 → Nginx 전환 안 됨 확인
  - [ ] 포스트모템 작성
- [ ] **시나리오 5: 중복 Claim 폭주**
  - [ ] 동일 commitHash로 동시 30 요청 → 1건만 성공 확인 (Redis Lock + DB unique)
  - [ ] 포스트모템 작성

---

## 18. 성능 측정 결과 정리 + ADR 작성

- [ ] `docs/performance/summary.md` 작성 — P1~P4 Before/After 전체 수치 정리
- [ ] ADR 작성 (의사결정 기록)
  - [ ] `docs/adrs/adr-04.md` — Redis 캐시 전략 선택 근거 (P2 결과 반영)
  - [ ] `docs/adrs/adr-05.md` — Outbox 패턴 채택 근거 (P3 결과 반영)
  - [ ] `docs/adrs/adr-06.md` — HikariCP 튜닝 결과 반영 (P1 결과 반영)
- [ ] `docs/reviews/architecture.md` 핵심 기술 가설 체크리스트 업데이트

---

## 구현 순서 요약

```
1 BE 기반 세팅
    ↓
2 ERD + JPA 엔티티 + Flyway
    ↓
3 RPC 클라이언트 구현
    ↓
4 핵심 REST API 구현
    ↓
5 FE–API 연동 테스트 ← 전체 흐름 최초 동작 확인
    ↓
6 모니터링 스택 구성 ← Before/After 관측 기반 완성
    ↓
7 Blue/Green 배포 환경 구성
    ↓
8 CI/CD Jenkins 연결 ← 자동 배포 완료 → 이후 모니터링 상시 확인 가능
    ↓
9 부하 테스트 환경 + Baseline 측정
    ↓
10 P1: HikariCP 튜닝 Before/After
11 P2: Redis Cache-Aside Before/After
12 P3: Outbox 비동기 Before/After
13 P4: Outbox Dispatcher 배치 Before/After
    ↓
14 RabbitMQ + DLQ 연동
15 Tracing (Tempo) 구성
16 Grafana 알림 설정
    ↓
17 장애 시나리오 검증 + 포스트모템
18 성능 결과 정리 + ADR 작성
```
