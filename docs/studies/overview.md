# JackpotChain 전체 시스템 구조 & 통신 방식

> 작성일: 2026-03-24
> 대상: 프로젝트 전체 흐름 파악 + 성능 테스트 사전 이해

---

## 1. 프로젝트 한 줄 요약

**블록체인 기반 로또 이벤트 서비스** — 자체 PoW 블록체인(JackpotChain)에서
UTXO 기반 트랜잭션으로 로또 Commit/Claim을 처리하고,
Spring Boot 백엔드가 상태를 집계하여 React SPA에 제공한다.

---

## 2. 컴포넌트 전체 지도

```
┌─────────────────────────────────────────────────────────────┐
│                        사용자 브라우저                         │
│  React SPA (Vite + TypeScript)                              │
│  - 개인키: IndexedDB 암호화 저장, 절대 서버 전송 안 함         │
│  - 서명: 브라우저에서 직접 수행                                │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTPS  /api/*
                    ▼
┌───────────────────────────────────────────┐
│           Host Nginx (Reverse Proxy)       │
│  - TLS 종료 (ssatto777.site)               │
│  - /api → Spring Boot Backend              │
│  - /    → Frontend SPA                    │
│  - Blue/Green upstream 스위치 (무중단 배포)│
└──────────┬────────────────────────────────┘
           │ HTTP (내부 네트워크)
           ▼
┌───────────────────────────────────────────┐
│         Spring Boot Backend               │
│  - REST API 제공                           │
│  - JWT + HttpOnly Cookie refresh token    │
│  - PostgreSQL: 읽기 모델(블록/TX/지갑/로또│
│  - Redis: challenge TTL, session cache    │
│  - RabbitMQ: Outbox 패턴 (배포 시 활성화) │
└──────────┬────────────────────────────────┘
           │ JSON-RPC  HTTP  8332 (내부 전용)
           ▼
┌───────────────────────────────────────────┐
│         JackpotChain Node (Python asyncio)│
│  - PoW 합의, UTXO 모델                    │
│  - RPC: getblockcount, getlottoinfo 등    │
│  - 새 블록 수신 시 → Webhook (POST /internal/new-block) │
│  - P2P: 포트 8333 (TUI 채굴 노드 접속)   │
└──────────┬────────────────────────────────┘
           │ P2P 8333
           ▼
┌───────────────────────────────────────────┐
│         TUI Mining Node (Python Textual)  │
│  - 채굴 수행, 블록 전파                   │
└───────────────────────────────────────────┘
```

---

## 3. 핵심 통신 방식 요약

### 3.1 FE ↔ BE: REST API + JWT

| 구분 | 방식 | 비고 |
|------|------|------|
| 인증 | JWT Bearer (access) + HttpOnly Cookie (refresh) | 401 시 자동 refresh |
| 데이터 조회 | GET REST API | React Query + usePollingQuery |
| TX 제출 | POST REST API (서명된 raw tx hex 포함) | 브라우저에서 직접 서명 |
| Polling | `usePollingQuery` | 탭 비활성화 시 pause, AbortController |

**인증 흐름 (challenge-response)**
```
FE                          BE                        Redis
 │── POST /auth/challenge ──▶│── SET challengeId TTL5m ▶│
 │◀── {challengeId, nonce} ──│
 │ (브라우저에서 개인키로 서명)
 │── POST /auth/verify ──────▶│── GET challengeId ───────▶│
 │                            │◀── challenge data ─────────│
 │                            │  서명 검증 (secp256k1)
 │◀── {accessToken} + cookie──│
```

### 3.2 BE ↔ JackpotChain Node: JSON-RPC + Webhook

| 방향 | 방식 | 예시 |
|------|------|------|
| BE → Node | JSON-RPC over HTTP (포트 8332) | getblockcount, sendrawtransaction |
| Node → BE | Webhook POST (포트 18080) | POST /internal/new-block |

**블록 인덱싱 흐름**
```
TUI Miner ─── P2P 8333 ──▶ Node ──▶ Webhook POST /internal/new-block
                                         │
                                         ▼
                                   BE: 블록 파싱 → PostgreSQL 저장
                                   (Block, Transaction, WalletActivity, LottoEntry 업데이트)
```

### 3.3 로또 Commit-Reveal 흐름

```
FE                     BE                     Node
 │                      │                      │
 │ POST /lotto/commit   │                      │
 │──────────────────────▶│                      │
 │ (signed version=3 TX) │                      │
 │                      │── sendrawtransaction ▶│
 │                      │                      │ TX → mempool
 │                      │                      │ Commit 블록 N에 포함
 │                      │                      │ N+18 블록 생성 시
 │                      │◀── Webhook new-block ─│
 │                      │  결과 결정 (N+3,6,9,12,15,18 블록해시)
 │                      │  읽기 모델 업데이트
 │ GET /lotto/entries/{hash}/result
 │──────────────────────▶│
 │◀── 결과 digit 0~15 ───│
 │
 │ GET /lotto/entries/{hash}/claim-context
 │──────────────────────▶│── listunspent (RPC) ▶│
 │◀── UTXO 정보 ─────────│
 │ (브라우저에서 version=5 TX 서명)
 │ POST /lotto/claim (signed TX)
 │──────────────────────▶│── sendrawtransaction ▶│
```

---

## 4. TX 버전 구조 (UTXO 모델)

| version | 종류 | 서명자 |
|---------|------|--------|
| 1 | 일반 전송 | FE 브라우저 |
| 2 | JACK → POT 교환 | BE (서버 지갑) |
| 3 | 로또 커밋 | FE 브라우저 |
| 5 | 로또 클레임 | FE 브라우저 |

> FE의 `txBuilder.ts`가 raw tx를 직렬화하고, BE는 그것을 그대로 Node에 relay한다.

---

## 5. 읽기 모델 동기화 전략

JackpotChain Node는 블록을 확정하면 BE에 Webhook을 보낸다.
BE는 이 Webhook으로 **PostgreSQL 읽기 모델**을 갱신한다:

```
Webhook → BlockchainReadModelSyncService
             ├── Block 저장/업데이트
             ├── Transaction 저장
             ├── WalletActivity 추가 (활동 로그)
             ├── LottoEntry 상태 업데이트 (COMMITTED → DECIDED)
             └── JackpotPool 잔액 갱신
```

> 스케줄러(`BlockchainSyncScheduler`)가 주기적으로 누락 블록도 보완한다.

---

## 6. 보안 원칙 (공부 포인트)

| 원칙 | 구현 | 왜? |
|------|------|-----|
| 개인키 서버 전송 금지 | IndexedDB 암호화 + 브라우저 서명 | 서버 침해 시 자산 보호 |
| Refresh token 해시 저장 | SHA-256 해시만 DB 저장 | 원문 유출 방지 |
| Challenge TTL | Redis 5분 만료 | Replay Attack 방지 |
| RPC 포트 외부 차단 | 내부 네트워크만 8332 | 직접 RPC 호출 차단 |
| CORS Allowlist | wildcard + credentials 조합 금지 | 교차 출처 공격 방지 |

---

## 7. 기술 스택 한눈에

| 레이어 | 기술 |
|--------|------|
| FE | React 18, TypeScript, Vite, Zustand, React Query, Axios |
| BE | Spring Boot 3.x, Java 17, JPA/Hibernate, Flyway |
| DB | PostgreSQL (읽기 모델), Redis (캐시/TTL), RabbitMQ (Outbox) |
| 블록체인 | Python 3.12, asyncio, PoW, UTXO |
| 인프라 | Docker Compose, Nginx, Jenkins, EC2 |
| 모니터링 | Prometheus, Grafana, Loki, Promtail, cAdvisor |

---

## 8. 학습 로드맵

각 파트별 상세 학습 파일:

| 파일 | 내용 |
|------|------|
| [be.md](./be.md) | Spring Boot 구조, JWT, Redis, RabbitMQ Outbox |
| [fe.md](./fe.md) | React Query, Polling, 브라우저 암호화, TX 빌더 |
| [blockchain.md](./blockchain.md) | PoW, UTXO, Commit-Reveal, JSON-RPC |
| [performance-test.md](./performance-test.md) | nGrinder/JMeter, HikariCP 튜닝, Cache-Aside, Outbox |
