# JackpotChain 아키텍처 현황

> 최종 업데이트: 2026-03-23
> 기준: 로컬 Docker 스택 QA 전 항목 PASS (2026-03-22)

---

## 1. 프로젝트 개요

블록체인 기반 로또 이벤트 서비스. 직접 운영 가능한 형태로 배포하고, 관측성·장애 대응·장애 격리를 실제 구현으로 경험하는 것이 목표.

**핵심 사용자 흐름**

```
지갑 생성/연결 → JACK↔POT 교환 → 로또 Commit 참여 → 결과 확인 → Claim → 대시보드/탐색기 조회
```

---

## 2. 전체 시스템 구성

```
[사용자 브라우저]
       │ HTTPS
       ▼
[Host Nginx] ── Reverse Proxy / TLS 종료 / Blue-Green 스위치
       │
       ├─ /          → Frontend (React SPA)
       ├─ /api/      → Spring Boot Backend
       └─ /dev/      → Dev 환경 (동일 구조)

[Spring Boot Backend]
       │ JSON-RPC (내부 네트워크)
       ▼
[JackpotChain Node]
       │ Webhook (HTTP POST /internal/new-block)
       └─→ Spring Boot Backend (블록 이벤트 수신)

[TUI Mining Node] ── P2P(8333) ──► JackpotChain Node
```

---

## 3. 컴포넌트 상세

### 3.1 Frontend (FE-ssatto)

| 항목 | 내용 |
|------|------|
| 프레임워크 | React 18+, TypeScript (strict) |
| 빌드 | Vite |
| 상태관리 | Zustand (`useWalletStore`, `useWalletSessionStore`) |
| HTTP | Axios + React Query / custom polling hooks |
| 라우팅 | React Router |

**페이지**

| 페이지 | 경로 | 기능 |
|--------|------|------|
| Dashboard | `/` | 블록 높이, 잭팟 풀, 최근 블록, 피어 현황 |
| Wallet | `/wallet` | 지갑 생성/연결, JACK↔POT 교환, 활동 내역 |
| Lotto | `/lotto` | Commit 참여, Claim, 엔트리 결과 조회 |
| Mining | `/mining` | 채굴 현황, 블록 목록, 채굴 가이드 |

**핵심 구현 특징**
- Private key: 브라우저 IndexedDB 암호화 저장, 서버 전송 금지
- 인증 흐름: `unlock → challenge → sign → verify` (`walletAuthFlowService`)
- Signed TX 생성: `txBuilder.ts` (version 1/2/3/5 모두 지원)
- Polling: `usePollingQuery` 훅, 탭 비활성화 시 pause, AbortController 사용
- claim write flow: 브라우저에서 signed `version=5` TX 생성 후 relay

### 3.2 Backend (BE-ssatto)

| 항목 | 내용 |
|------|------|
| 프레임워크 | Spring Boot 3.x, Java 17+ |
| DB | PostgreSQL (JPA/Hibernate, Flyway 마이그레이션) |
| 캐시 | Redis (challenge TTL, session cache) |
| 메시지 브로커 | RabbitMQ (Outbox 패턴 - 설계 완료, 배포 시 활성화) |
| 인증 | JWT (access) + opaque refresh token (HttpOnly cookie) |
| 블록체인 통신 | JSON-RPC client (`JackpotChainHttpRpcClient`) |

**레이어 구조**

```
Controller   → HTTP 요청/응답만 담당, Service 위임
Service      → 비즈니스 로직, 트랜잭션 경계
Repository   → JPA 조회, 비즈니스 로직 없음
RPC Client   → JackpotChain JSON-RPC 어댑터
```

**구현 완료 API**

| 영역 | 엔드포인트 |
|------|-----------|
| 인증 | POST /auth/challenge, /auth/verify, /auth/refresh, /auth/logout |
| 지갑 | POST /wallet, GET /wallet, GET /wallet/{addr}/activities, GET /wallet/{addr}/utxos |
| 블록체인 | GET /blockchain/dashboard, GET /blockchain/blocks/{height} |
| 로또 | GET /lotto, POST /lotto/commit, GET /lotto/entries, GET /lotto/entries/{hash}/result, GET /lotto/entries/{hash}/claim-context, POST /lotto/claim |
| 교환 | GET /exchange/info, POST /exchange/jack-to-pot |
| 채굴 | GET /mining/blocks |
| 웹훅 | POST /internal/new-block (외부 비노출) |

### 3.3 JackpotChain Node (blockchain/)

| 항목 | 내용 |
|------|------|
| 언어 | Python 3.12+ |
| 런타임 | asyncio |
| 합의 | PoW (자체 구현) |
| 트랜잭션 모델 | UTXO |

**TX 버전 참조**

| 버전 | 종류 |
|------|------|
| 1 | 일반 전송 |
| 2 | JACK → POT 교환 |
| 3 | 로또 커밋 |
| 5 | 로또 클레임 |

**Server Node 역할**
- P2P 수신 전용 (채굴 안 함), 포트 8333
- RPC 제공: 포트 8332 (내부 네트워크만, 외부 비노출)
- 새 블록 수신 시 Backend로 Webhook 발송

**로또 Commit-Reveal 규칙**
- Commit 블록 N → N+3, N+6, N+9, N+12, N+15, N+18 블록 해시로 결과 결정
- Claim 가능 구간: N+18 ~ N+68
- 블록 해시 마지막 hex digit mod 16 = 결과 digit (0~15)

### 3.4 Nginx (nginx/)

**로컬 환경**
- FE: `http://localhost:3000`
- Backend: `http://localhost:18080`
- SPA: 알 수 없는 경로 → `index.html` 반환

**운영 환경 (설계 완료, 미배포)**
- HTTPS, TLS 1.2+, HSTS
- Blue/Green upstream 스위치
- Rate limiting (auth/write 엔드포인트)
- `/internal/` 경로 외부 차단

---

## 4. 포트 할당

| 서비스 | 로컬 포트 | 운영 노출 |
|--------|---------|---------|
| Frontend | 3000 | Nginx 뒤 (80/443) |
| Backend (Spring) | 18080 | Nginx 뒤 |
| Node RPC | 8332 | 내부 네트워크만 (절대 외부 노출 금지) |
| Node P2P | 8333 | 외부 오픈 (TUI 채굴자 접속) |
| PostgreSQL | 5432 | 내부만 |
| Redis | 6379 | 내부만 |
| RabbitMQ | 5672/15672 | 내부만 |

---

## 5. 보안 원칙

| 항목 | 규칙 |
|------|------|
| Private key | 서버 전송 금지, 브라우저 IndexedDB 암호화만 |
| Refresh token | DB에 SHA-256 해시만 저장, 원문 저장 금지 |
| Challenge | Redis TTL 저장, DB 테이블 없음 |
| RPC 포트 | 절대 외부 노출 금지 |
| Auth 검증 | JWT subject == 요청 walletAddress 일치 확인 |
| CORS | Allowlist 기반, wildcard + credentials 조합 금지 |

---

## 6. 로컬 Docker Compose 스택 (구현 완료)

```
docker compose --env-file .env.local -f docker-compose.local.yml up -d
```

포함 서비스: postgres, redis, rabbitmq, jackpotchain-node, backend, frontend

healthcheck: 전 서비스 `condition: service_healthy`

**QA 결과 (2026-03-22 전 시나리오 PASS)**
- FE Routes, Dashboard, Block Detail, Wallet CRUD, Auth (challenge/verify/refresh/logout)
- Lotto Commit/Entries/Result/Claim (signed version=5 TX), Exchange (funded), Mining
- Security (401/403), Polling, Error handling

---

## 7. 운영 아키텍처 (설계 완료, 미배포)

```
Main EC2
├── docker network: prod-net
│   ├── spring-blue (8080)    ← active
│   ├── spring-green (8081)   ← standby
│   ├── redis
│   ├── postgresql
│   ├── rabbitmq
│   └── jackpotchain-node-prod
├── docker network: dev-net
│   ├── spring-dev, redis-dev, postgresql-dev, rabbitmq-dev, node-dev
└── docker network: monitoring-net
    ├── Prometheus
    ├── Loki
    ├── Grafana
    ├── Promtail
    └── cAdvisor

Jenkins EC2 (별도)
└── Jenkins, Docker
```

Blue/Green 전환: Host Nginx upstream 스위치로 무중단 배포

---

## 8. 모니터링 설계 (미구축)

| 도구 | 역할 |
|------|------|
| Prometheus | 메트릭 수집 (Spring Actuator, cAdvisor) |
| Grafana | 대시보드, 알림 |
| Loki | 로그 집계 |
| Promtail | 컨테이너 로그 수집 → Loki |
| cAdvisor | 컨테이너 리소스 메트릭 |

**수집 대상 핵심 메트릭**
- RPC latency (JackpotChain RPC 응답시간)
- Cache hit ratio (Redis)
- Outbox pending count (RabbitMQ)
- Queue depth
- Claim/Commit 요청 수
- HikariCP pending connections

**로그 구조화 (Loki 호환 JSON)**
- 필수 MDC: `traceId`, `requestId`, `eventType`, `uri`, `method`
- 핵심 eventType: `AUTH_TOKEN_ISSUED`, `WALLET_REGISTERED`, `EXCHANGE_TRANSACTION_SUBMITTED`, `LOTTO_COMMIT_SUBMITTED`, `JACKPOTCHAIN_TRANSACTION_SUBMITTED`
