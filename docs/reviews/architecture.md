# JackpotChain 아키텍처 설계 문서

> 작성일: 2026-03-18
> 프로젝트 목표: 블록체인 로또 이벤트 서비스를 직접 운영 가능한 형태로 배포하고, 관측성·장애대응·장애격리를 실제 설계와 구현으로 경험하는 것

---

## 목차

1. [프로젝트 한 줄 목표](#1-프로젝트-한-줄-목표)
2. [전체 시스템 아키텍처](#2-전체-시스템-아키텍처)
3. [컴포넌트 상세](#3-컴포넌트-상세)
4. [인프라 구성](#4-인프라-구성)
5. [CI/CD 파이프라인](#5-cicd-파이프라인)
6. [배포 전략 (Blue/Green)](#6-배포-전략-bluegreen)
7. [메시지 브로커 (RabbitMQ + Outbox)](#7-메시지-브로커-rabbitmq--outbox)
8. [캐시 전략 (Redis)](#8-캐시-전략-redis)
9. [장애 격리 (Circuit Breaker)](#9-장애-격리-circuit-breaker)
10. [모니터링 / 로깅 / 알림](#10-모니터링--로깅--알림)
11. [장애 시나리오 & 포스트모템](#11-장애-시나리오--포스트모템)
12. [초기 EC2 세팅 절차](#12-초기-ec2-세팅-절차)
13. [핵심 기술 가설 정리](#13-핵심-기술-가설-정리)

---

## 1. 프로젝트 한 줄 목표

> 100명 이상 트래픽을 받아도 **관찰 가능하고**, 장애가 나도 **빠르게 감지·격리·복구**할 수 있는 구조를 만드는 것

**핵심 사용자 흐름**

```
지갑 생성/연결 → JACK↔POT 교환 → Commit 참여 → Claim 확인 → 대시보드/탐색기 조회
```

---

## 2. 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Main EC2                                           │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐  Monitoring-  │
│  │  Prod-Net                                                   │  Net          │
│  │                                                             │               │
│  │  ┌──────────────────┐   ┌─────────────────────────────┐   │  ┌──────────┐ │
│  │  │ Spring API-GREEN │   │       (Redis)               │   │  │Prometheus│ │
│  │  │   (Inactive)     │   └─────────────────────────────┘   │  └────┬─────┘ │
│  │  └──────────────────┘                                      │       │       │
│  │                           ┌─────────────────────────────┐   │  ┌──────────┐ │
│  │  ┌──────────────────┐   │       (PostgreSQL)           │   │  │  Loki    │ │
│  │  │ Spring API-BLUE  │◄──┤└─────────────────────────────┘   │  └────┬─────┘ │
│  │  │   (Active)       │   │                                   │       │       │
│  │  └──────────────────┘   │  ┌─────────────────────────────┐ │  ┌──────────┐ │
│  │           │ JSON-RPC     │  │       (RabbitMQ)            │ │  │ Grafana  │ │
│  │           ▼              │  └─────────────────────────────┘ │  └──────────┘ │
│  │  ┌──────────────────┐   └─────────────────────────────┘   │               │
│  │  │ JackpotChain     │                                       │  ┌──────────┐ │
│  │  │ Node - PROD      │   ┌──────────────┐                   │  │ Promtail │ │
│  │  │ jack/P2P/RPC/mine│   │Prod Frontend │                   │  └──────────┘ │
│  │  └──────────────────┘   └──────────────┘                   │               │
│  └─────────────────────────────────────────────────────────────┘  ┌──────────┐ │
│                                                                    │ cAdvisor │ │
│  ┌─────────────────────────────────────────────────────────────┐  └──────────┘ │
│  │  Dev-Net                                                    │               │
│  │  Spring API-DEV │ Redis-DEV │ PostgreSQL-DEV │ RabbitMQ-DEV│               │
│  │  JackpotChain Node-DEV │ Dev Frontend                      │               │
│  └─────────────────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────┘

외부 진입점
┌─────────┐    HTTPS      ┌──────────────────────────────────────┐
│  User   │──────────────►│  Host Nginx                          │
│ Browser │               │  Reverse Proxy / TLS 종료 /          │
└─────────┘               │  Blue-Green Switch                   │
                          └──────────────────────────────────────┘
                                          │
                                          ▼
                               ┌─────────────────┐
                               │   Spring API    │
                               │  (Active Color) │
                               └─────────────────┘
```

**네트워크 분리 구조**

| 네트워크 | 구성 요소 | 목적 |
|----------|-----------|------|
| Prod-Net | Spring API (Blue/Green), Redis, PostgreSQL, RabbitMQ, JackpotChain Node | 실제 서비스 |
| Dev-Net | Spring API-DEV, Redis-DEV, PostgreSQL-DEV, RabbitMQ-DEV, Node-DEV | 개발/테스트 환경 |
| Monitoring-Net | Prometheus, Loki, Grafana, Promtail, cAdvisor | 모니터링 전용 |

---

## 3. 컴포넌트 상세

### 3.1 Frontend (React + TypeScript)

- **빌드**: Vite 6.0 + React 19 + TypeScript 5.7
- **상태관리**: Zustand
- **스타일**: Tailwind CSS v4
- **라우팅**: React Router v7

**페이지 구성**

| 페이지 | 경로 | 주요 기능 |
|--------|------|-----------|
| Dashboard | `/` | 블록 높이, 잭팟 풀, 네트워크 상태 조회 |
| Wallet | `/wallet` | 지갑 생성/연결, JACK↔POT 교환, 활동 이력 |
| Lotto | `/lotto` | Commit 참여, Claim 확인, 티어 랭킹 |
| Mining | `/mining` | 채굴 현황, 보상 정책, 채굴 가이드 |

**Prod 라우팅**: Host Nginx → `/` 로 서빙
**Dev 라우팅**: Host Nginx → `/dev` 로 서빙

### 3.2 Backend (Spring Boot 3.x / Java 21)

- **프레임워크**: Spring Boot 3.x, Gradle
- **DB**: PostgreSQL (JPA)
- **캐시**: Redis
- **메시지**: RabbitMQ (Outbox 패턴)
- **블록체인 통신**: JSON-RPC

**API 라우팅**

| 경로 | 대상 |
|------|------|
| `/api` | Spring API (Active Color) |
| `/dev/api` | Spring API-DEV |
| `/api → active-color` | Nginx upstream Blue/Green 스위칭 |

**외부 연동**

```
Spring API ──JSON-RPC──► JackpotChain Node
   - getblockcount
   - getlottoinfo
   - getjackpotpool
   - lottocommit
   - lottoclaim
   - lottocheckresult
```

### 3.3 JackpotChain Node (Python)

**역할**: 자체 PoW 블록체인 구현체

| 역할 | 설명 |
|------|------|
| Server Node (PROD) | EC2 상시 운영, P2P 블록 수신 (8333), RPC 제공 (8332), 이벤트 발행 |
| Server Node (DEV) | 개발 환경용, jtest 모드 |
| Mining Node | 로컬 PC에서 PoW 수행, 지갑 주소 등록 |

**핵심 모듈**

```
jackpotchain/
├── consensus/     # 체인 관리, PoW 채굴, 난이도 조정
├── validation/    # 블록/트랜잭션 검증
├── network/       # P2P 네트워킹 (8333)
├── rpc/           # JSON-RPC 서버 (8332)
├── wallet/        # 지갑 관리
├── gacha/         # 로또 추첨 로직
└── crypto/        # 암호화 함수
```

**Spring → Node 통신**: JSON-RPC (동기, Command/Query Plane)
**Node → Spring 통신**: Webhook (비동기, 새 블록 이벤트 알림)

### 3.4 Host Nginx

단일 외부 진입점으로 아래 기능을 담당한다.

- **Reverse Proxy**: 외부 요청 → 내부 서비스 라우팅
- **TLS 종료**: HTTPS 인증서 처리
- **Blue/Green Switch**: upstream 전환으로 무중단 배포
- **공통 처리**: access/error 로그, rate limiting, gzip, 헤더 정책

```nginx
upstream active_spring {
    server spring-blue:8080;   # 또는 spring-green:8080
}

server {
    listen 443 ssl;
    location /api { proxy_pass http://active_spring; }
    location /dev/api { proxy_pass http://spring-dev:8080; }
    location / { proxy_pass http://prod-frontend; }
    location /dev { proxy_pass http://dev-frontend; }
}
```

---

## 4. 인프라 구성

### 4.1 EC2 구성

| EC2 | 역할 | 구성 |
|-----|------|------|
| Main EC2 | 서비스 운영 | Nginx, Spring (Blue/Green), DB, MQ, Node, Monitoring |
| Jenkins EC2 | CI/CD | Jenkins, Docker |

### 4.2 도커 네트워크 분리

```
Main EC2
├── docker network: prod-net
│   ├── spring-blue (8080)
│   ├── spring-green (8081)
│   ├── redis
│   ├── postgresql
│   ├── rabbitmq
│   └── jackpotchain-node-prod
├── docker network: dev-net
│   ├── spring-dev (8082)
│   ├── redis-dev
│   ├── postgresql-dev
│   ├── rabbitmq-dev
│   └── jackpotchain-node-dev
└── docker network: monitoring-net
    ├── prometheus
    ├── loki
    ├── grafana
    ├── promtail
    └── cadvisor
```

### 4.3 볼륨 구성

| 볼륨 | 마운트 대상 | 비고 |
|------|-------------|------|
| node_data_dir PROD | JackpotChain PROD 노드 데이터 | 블록 체인 영속화 |
| node_data_dir DEV | JackpotChain DEV 노드 데이터 | 테스트 체인 |
| postgresql-data | PostgreSQL | 서비스 DB |
| prometheus-data | Prometheus | 메트릭 저장 |
| loki-data | Loki | 로그 저장 |

---

## 5. CI/CD 파이프라인

```
Developer
    │ git push
    ▼
Git Repository (develop / main)
    │ webhook / polling
    ▼
Jenkins EC2
    ├── build & push ──────────────► Docker Hub
    └── ssh deploy script
             │
             ├── prod compose pull/up ──► Main EC2 (Prod-Net)
             └── dev compose pull/up  ──► Main EC2 (Dev-Net)
```

**배포 흐름 (Blue/Green)**

1. Jenkins가 새 이미지 빌드 후 Docker Hub push
2. Main EC2에서 inactive color(예: Green) 컨테이너에 새 이미지 pull
3. Green 컨테이너 실행
4. Green health check 통과 확인
5. Smoke test 수행
6. 통과 시 Nginx upstream 전환 (Blue → Green)
7. `nginx -s reload`
8. 일정 시간 관찰
9. 문제 없으면 old Blue 종료 또는 standby 유지

**롤백 절차**

- Green health check 실패 → Nginx upstream 전환 없이 배포 중단
- 배포 후 문제 발생 → Nginx upstream을 이전 Blue로 즉시 재전환

---

## 6. 배포 전략 (Blue/Green)

### 개념

| 색상 | 상태 |
|------|------|
| Blue | 현재 운영 중인 기존 버전 |
| Green | 새로 배포될 버전 |

실제 트래픽은 한 쪽만 받으며, Nginx upstream 변경으로 순간 전환한다.

### Nginx Upstream 전환

```bash
# Blue → Green 전환
sed -i 's/spring-blue:8080/spring-green:8080/' /etc/nginx/conf.d/upstream.conf
nginx -s reload

# 롤백: Green → Blue
sed -i 's/spring-green:8080/spring-blue:8080/' /etc/nginx/conf.d/upstream.conf
nginx -s reload
```

### Health Check 기준

- `/actuator/health` 200 응답
- DB 연결 확인
- RabbitMQ 연결 확인
- 최초 3회 재시도 후 실패 시 배포 중단

---

## 7. 메시지 브로커 (RabbitMQ + Outbox)

### 7.1 RabbitMQ 도입 이유

기존 동기 호출의 문제:
- 상대 시스템이 느리면 내 API도 느려짐
- 상대 시스템이 죽으면 내 API도 실패
- 한 번에 몰리는 작업을 버퍼링하기 어려움

RabbitMQ 도입으로:
- 요청과 처리를 분리하여 나중에 처리 가능
- 재시도, 순서, 큐 적체량 관리 가능
- **Command/Query Plane**: RPC (동기) | **Event Plane**: MQ (비동기)

### 7.2 적용 범위

**Node → Spring 이벤트 (비동기 MQ)**

| 이벤트 | 설명 |
|--------|------|
| 새 블록 생성 | 블록 인덱싱, 집계 업데이트 |
| 피어 수 급감 | 네트워크 이상 알림 |
| mempool 급증 | 처리 지연 경고 |
| Claim 실패 | 재처리 또는 알림 |
| 재동기화 감지 | 체인 재조정 이벤트 |

**Spring 운영 이벤트 (비동기 MQ)**

| 이벤트 | 설명 |
|--------|------|
| RPC 실패 로그 적재 | 운영 분석 |
| 관리자 알림 생성 | 내부 대시보드 |
| 디스코드 장애 알림 | 즉시 운영자 대응 |
| 통계성 로그 비동기 적재 | 부하 분산 |

### 7.3 단계별 적용 계획

| 단계 | 내용 |
|------|------|
| 1차 | 운영 로그/이벤트용 큐 1개 |
| 2차 | 알림 큐, 통계 적재 큐 분리 |
| 3차 | DLQ + 재처리 정책 적용 |

### 7.4 Outbox 패턴

**문제**: DB 저장 후 RabbitMQ 발행 전 서버 다운 → 데이터-메시지 불일치

**해결**:

```
1. DB 트랜잭션 안에서:
   - 본 데이터 저장 (예: CommitTx)
   - outbox 테이블에 '발행해야 할 이벤트' 저장

2. 트랜잭션 커밋

3. 별도 Dispatcher가 outbox 폴링 후 RabbitMQ 발행

4. 발행 성공 시 outbox 레코드 processed 처리
```

**Outbox 테이블 구조**

```sql
CREATE TABLE outbox_events (
    id          UUID PRIMARY KEY,
    event_type  VARCHAR(100) NOT NULL,
    payload     JSONB        NOT NULL,
    status      VARCHAR(20)  DEFAULT 'PENDING',  -- PENDING / PROCESSED / FAILED
    created_at  TIMESTAMP    NOT NULL,
    processed_at TIMESTAMP
);
```

---

## 8. 캐시 전략 (Redis)

### 8.1 도입 이유

조회가 잦고 짧은 시간 동안 값이 반복 조회되는 데이터가 많다. DB/RPC 호출 빈도를 줄이고 응답 속도를 안정적으로 유지한다.

### 8.2 캐시 대상

| 데이터 | TTL | 무효화 조건 |
|--------|-----|-------------|
| 현재 블록 높이 | 짧게 (5~15초) | 새 블록 이벤트 |
| 최근 블록 목록 | 짧게 (15초) | 새 블록 이벤트 |
| 잭팟 풀 요약 | 중간 (1분) | Commit/Claim 발생 |
| 네트워크 상태 (피어 수) | 짧게 (15초) | Node 이벤트 |
| 오늘 Commit/Claim 수 | 중간 (5분) | 해당 이벤트 발생 |
| 현재 Claimable 수 | 중간 (1분) | Claim 발생 |
| 노드 상태 | 짧게 (30초) | Node 이벤트 |

### 8.3 캐시 전략 (Cache-Aside + TTL + 수동 무효화)

```
조회 요청
    │
    ▼
Redis 확인
    ├── HIT → Redis 값 반환
    └── MISS
          │
          ▼
       DB / RPC 조회
          │
          ▼
       Redis에 적재 (TTL 설정)
          │
          ▼
       응답 반환

이벤트 발생 시 (Commit/Claim 등):
→ 관련 캐시 키만 수동 eviction
```

### 8.4 중복 요청 방지 (Redis Lock)

```
Commit/Claim 요청 시:
    SET lock:commit:{userId} 1 EX 5 NX
    → NX 실패 시 429 Too Many Requests 반환
    → 처리 완료 후 락 해제
```

### 8.5 Fallback 전략

| 상황 | Fallback |
|------|---------|
| `getblockcount` RPC 실패 | Redis 마지막 성공값 반환 + "일시적 지연" 표시 |
| `getjackpotpool` RPC 실패 | Redis 마지막 성공값 반환 |
| Redis 자체 down | 캐시 miss 증가, DB/RPC 직접 조회 (degraded mode) |

---

## 9. 장애 격리 (Circuit Breaker)

### 9.1 도입 이유

JackpotChain Node는 외부 서비스와 동일하게 다뤄야 한다. Node가 느려지거나 응답을 못 하면 Spring까지 같이 멈추면 안 된다.

### 9.2 적용 대상

**Spring → JackpotChain Node RPC 구간 전체**

| RPC 메서드 | 유형 | 전략 |
|-----------|------|------|
| `getblockcount` | 조회 | 짧은 timeout, retry 1~2회, circuit breaker |
| `getlottoinfo` | 조회 | 짧은 timeout, retry 1~2회, circuit breaker |
| `getjackpotpool` | 조회 | 짧은 timeout, retry 1~2회, circuit breaker |
| `lottocommit` | 명령 | timeout 적용, retry 금지, idempotency 키 필수 |
| `lottoclaim` | 명령 | timeout 적용, retry 금지, idempotency 키 필수 |
| `lottocheckresult` | 조회 | 짧은 timeout, retry 1회 |

### 9.3 Circuit Breaker 상태 전이

```
        실패율 임계치 초과
Closed ──────────────────► Open
  ▲                          │
  │ 테스트 성공               │ 대기 시간 경과
  │                          ▼
  └───────────── Half-Open ◄─┘
                  (제한된 테스트 요청)
```

**적용 예시**

```yaml
resilience4j:
  circuitbreaker:
    instances:
      jackpotchain-rpc:
        slidingWindowSize: 20
        failureRateThreshold: 50       # 20건 중 50% 이상 실패 시 Open
        waitDurationInOpenState: 30s   # 30초 후 Half-Open
        permittedNumberOfCallsInHalfOpenState: 3
  retry:
    instances:
      jackpotchain-rpc-query:
        maxAttempts: 2
        waitDuration: 500ms
```

### 9.4 읽기 vs 쓰기 재시도 원칙

| 구분 | 재시도 | 이유 |
|------|--------|------|
| 조회성 RPC | 1~2회 허용 | 멱등하므로 안전 |
| 명령성 RPC (Commit/Claim) | 재시도 금지 | 중복 처리 위험, idempotency 키로 보호 |

---

## 10. 모니터링 / 로깅 / 알림

### 10.1 모니터링 스택

| 계층 | 도구 | 목적 |
|------|------|------|
| Metrics (수치) | Spring Boot Actuator + Prometheus + Grafana | 수치 기반 상태 파악 |
| Logs (맥락) | JSON 로그 + Promtail + Loki + Grafana | 사건의 흐름 추적 |
| Traces (경로) | Micrometer Tracing + OpenTelemetry Collector + Tempo | 요청 한 건의 전체 경로 |

### 10.2 수집 메트릭

| 메트릭 | 설명 |
|--------|------|
| `http_server_requests` | API 응답 시간, 에러율 |
| `lottery_commit_requests_total` | Commit 요청 수 |
| `lottery_claim_attempt_total` | Claim 시도 수 |
| `lottery_claim_success_total` | Claim 성공 수 |
| `blockchain_rpc_latency_ms` | RPC 응답 시간 |
| `block_sync_lag_blocks` | 블록 동기화 지연 |
| `outbox_pending_count` | Outbox 미발행 이벤트 수 |
| `reward_claim_lock_wait_ms` | Claim 락 대기 시간 |
| `cache_hit_ratio` | Redis 캐시 적중률 |
| `queue_depth` | RabbitMQ 큐 적체량 |

### 10.3 구조화 로그 (JSON)

모든 로그는 아래 키를 포함한다.

```json
{
  "traceId": "abc123",
  "spanId": "def456",
  "userId": "user-uuid",
  "ticketId": "ticket-uuid",
  "commitTxId": "tx-uuid",
  "claimTxId": "tx-uuid",
  "blockHeight": 12345,
  "eventType": "LOTTERY_COMMIT"
}
```

Nginx access/error 로그는 Promtail이 수집하여 Loki로 전송한다.

### 10.4 커스텀 Trace Span (최소 3개)

| Span 이름 | 측정 구간 |
|-----------|-----------|
| `lesson.complete` | 교육 완료 이벤트 처리 전체 |
| `blockchain.commit.rpc` | Spring → Node lottocommit RPC 구간 |
| `reward.claim.rpc` | Spring → Node lottoclaim RPC 구간 |

### 10.5 알림 규칙 (Grafana Alerting)

| 조건 | 임계치 | 알림 채널 |
|------|--------|-----------|
| 5분간 5xx 비율 | > 10% | Discord |
| p95 latency | > 800ms | Discord |
| RabbitMQ queue depth | > 100 | Discord |
| 최신 블록 높이 정지 | > 3분 | Discord |
| Claim 실패율 (5분) | > 5% | Discord |
| active color 전환 후 health | down | Discord |
| TLS 인증서 만료 | D-14 이내 | Discord |

### 10.6 비기능 성능 목표

| 항목 | 목표치 |
|------|--------|
| 페이지 로딩 | < 2초 |
| API 응답 | < 500ms |
| 블록 갱신 주기 | 15초 |
| TX 전파 | < 1초 |

---

## 11. 장애 시나리오 & 포스트모템

### 11.1 장애 시나리오

#### 시나리오 1: Python Node RPC Timeout

```
발생: JackpotChain Node 응답 지연/타임아웃
감지: blockchain_rpc_latency_ms 급증 알림
격리: Circuit Breaker Open → RPC 호출 차단
Fallback:
  - 조회성(getblockcount, getjackpotpool): Redis 캐시값 반환 + "일시적 지연" 표시
  - 명령성(commit/claim): "처리 중/재확인 필요" 상태로 관리
기대 결과: circuit open, API degraded response, alert 발생
```

#### 시나리오 2: RabbitMQ 중단

```
발생: RabbitMQ 컨테이너 다운
감지: queue_depth 0으로 급감 또는 연결 오류 로그
격리: Outbox 패턴으로 이벤트 DB에 보존
동작:
  - API 핵심 기능(Commit/Claim RPC)은 정상 동작
  - 운영 이벤트(알림, 통계) 처리만 지연
복구 후: Dispatcher가 outbox backlog 순차 재발행
기대 결과: outbox backlog 증가, API 일부 기능 degraded, 복구 후 재발행
```

#### 시나리오 3: Redis 다운

```
발생: Redis 컨테이너 다운
감지: cache_hit_ratio 급락, 에러 로그
격리:
  - 캐시 miss → DB/RPC 직접 조회 (Cache-Aside fallback)
  - Commit/Claim 락 로직 → DB unique constraint로 최종 보호
동작: 응답 속도 저하 (degraded), 서비스 중단 없음
기대 결과: 캐시 miss 증가, 락 로직 fallback, Claim은 DB unique로 최종 보호
```

#### 시나리오 4: 잘못된 Migration

```
발생: 신규 배포 시 DB migration 실패
감지: inactive color health check 실패
격리: Nginx upstream 전환 없이 배포 중단 (Blue/Green 보호)
동작: 현재 active color(Blue)는 영향 없이 계속 운영
복구: migration 수정 후 재배포
기대 결과: inactive color health fail, Nginx 전환 전 배포 중단
```

#### 시나리오 5: 중복 Claim 요청 폭주

```
발생: 동일 사용자가 Claim을 연속으로 다수 요청
1차 보호: Redis 분산 락 (SET lock:claim:{ticketId} NX EX 5)
2차 보호: DB unique constraint (ticket_id + user_id)
3차 보호: Idempotency 키 (요청 ID 기반 중복 처리 방지)
기대 결과: Redis lock + DB unique + idempotency로 1건만 성공
```

### 11.2 포스트모템 템플릿

```markdown
# 포스트모템: [장애 제목]

## 개요
- **발생 일시**: YYYY-MM-DD HH:MM (KST)
- **복구 일시**: YYYY-MM-DD HH:MM (KST)
- **총 장애 시간**: X분
- **심각도**: P1 / P2 / P3

## 타임라인

| 시각 | 사건 |
|------|------|
| HH:MM | 알림 발생 (내용) |
| HH:MM | 온콜 담당자 확인 |
| HH:MM | 원인 파악 |
| HH:MM | 임시 조치 적용 |
| HH:MM | 서비스 복구 확인 |

## 영향 범위
- **영향받은 기능**: (예: Claim API, 대시보드 조회)
- **영향받은 사용자 수**:
- **에러율 피크**:
- **매출/이벤트 손실**:

## 탐지 방식
- 알림 시스템이 먼저 감지 / 사용자 제보 / 운영자 발견
- 어떤 알림 규칙이 발동되었는가

## 근본 원인
- **직접 원인**:
- **근본 원인**:
- **기여 요인**:

## 임시 조치
1. (즉시 적용한 조치)
2.
3.

## 영구 조치
1. (재발 방지를 위한 코드/인프라 변경)
2.
3.

## 재발 방지
- [ ] 코드 수정 (담당자: , 기한: )
- [ ] 알림 규칙 추가/수정
- [ ] 문서 업데이트
- [ ] 운영 절차 개선

## 추가 모니터링
- 이 장애 이후 추가로 모니터링할 지표/로그
- 새로 추가할 알림 규칙

## 배운 점
- 잘된 것:
- 개선할 것:
- 의문점/후속 조사:
```

---

## 12. 초기 EC2 세팅 절차

새 EC2 인스턴스에서 아래 순서로 환경을 구성한다.

```bash
# 1) 패키지 상태 복구 및 최신화
sudo dpkg --configure -a
sudo apt update
sudo apt upgrade -y

# 2) 기본 유틸 설치
sudo apt install -y curl git vim ca-certificates gnupg lsb-release ufw

# 3) 타임존 설정 (한국 시간)
sudo timedatectl set-timezone Asia/Seoul

# 4) 방화벽 설정 (SSH → HTTP 순서 필수)
sudo ufw allow 22/tcp   # SSH 먼저 허용
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# sudo ufw allow 8080/tcp  # 외부 공개 필요 시만

# 5) UFW 활성화
sudo ufw enable

# 6) Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 7) 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker

# 8) Docker 자동 시작 설정
sudo systemctl enable docker
sudo systemctl start docker

# 9) 설치 확인
docker --version
docker compose version

# 10) 배포 디렉토리 생성
mkdir -p ~/app
```

---

## 13. 핵심 기술 가설 정리

| # | 가설 | 적용 기술 | 검증 지표 |
|---|------|-----------|-----------|
| 1 | 메시지 큐를 도입하면 장애가 전체로 번지는 속도를 늦출 수 있다 | RabbitMQ + Outbox | queue_depth, API 에러율 분리 측정 |
| 2 | Redis를 잘 쓰면 조회 체감 속도가 개선된다 | Cache-Aside + TTL | cache_hit_ratio, RPC 호출 빈도 감소 |
| 3 | 모니터링이 있으면 장애 대응 시간이 짧아진다 | Prometheus + Loki + Grafana | MTTD (감지 시간), MTTR (복구 시간) |
| 4 | Nginx Blue/Green 구조를 쓰면 배포 중단 시간을 줄일 수 있다 | Nginx upstream 전환 | 배포 중 다운타임 측정 |

### 완료 기준

- [ ] 주요 기술 선택마다 ADR 1개 이상 작성 (Redis 전략, MQ 도입 범위, RPC 재시도/타임아웃, Blue/Green 방식, 로그/모니터링 구조)
- [ ] 트러블슈팅 2건 이상 정리 (장애 상황 → 원인 추적 → 해결책 → 재발 방지)
- [ ] 성능/운영 지표 수집 (p95/p99, 에러율, RPC 평균/최대 응답시간, 캐시 적중률, 큐 적체량, 배포 소요 시간, 복구 시간)
- [ ] 장애 격리 시나리오 최소 2개 검증 (Node 지연 시 읽기 fallback, MQ 소비 실패 시 DLQ 이동, Blue/Green 배포 실패 시 롤백)
