# 백엔드 학습 — Spring Boot (BE-ssatto)

> 작성일: 2026-03-24
> 목적: 프로젝트 BE 구조 이해 + 성능 테스트 사전 지식

---

## 1. 레이어 구조

```
com.ssatto.BE_ssatto
├── domain/
│   ├── auth/          ← 인증 (challenge, JWT, refresh)
│   ├── blockchain/    ← 블록 읽기 모델, RPC client, Scheduler
│   ├── exchange/      ← JACK↔POT 교환
│   ├── lotto/         ← 로또 Commit/Claim/Result
│   ├── mining/        ← 블록 채굴 목록 조회
│   └── wallet/        ← 지갑 등록, 활동 내역, UTXO
└── global/
    ├── config/        ← Security, CORS, JWT filter, RPC 설정
    ├── exception/     ← GlobalExceptionHandler, BusinessException
    ├── logging/       ← MDC 기반 구조화 로그
    ├── response/      ← ApiResponse, PageResponse
    └── util/          ← JwtUtil
```

**레이어 원칙**
- Controller: HTTP 입출력만, 비즈니스 로직 없음
- Service: 트랜잭션 경계, 비즈니스 규칙
- Repository: JPA 조회만, 비즈니스 없음
- RPC Client: JackpotChain 어댑터 (외부 시스템 격리)

---

## 2. 인증 흐름 — JWT + Challenge-Response

### 왜 이 방식인가?

일반 로그인은 서버가 비밀번호를 검증한다.
JackpotChain은 **개인키 소유 증명**이 인증이다.
→ 서버가 nonce를 발급하고, 클라이언트가 개인키로 서명해서 돌려보내면
→ 서버는 공개키로 서명을 검증한다.

### 흐름 코드 위치

```
AuthController.java
  └── AuthService.java
        ├── issueChallenge()  → Redis SET challengeId TTL 5분
        └── verifyChallenge()
              ├── Redis GET challengeId (존재 확인 + 즉시 삭제 = 단일 사용)
              ├── WalletAuthCrypto.verifySignature()  ← secp256k1 검증
              ├── JwtUtil.generateAccessToken()
              └── opaque refresh token → SHA-256 해시 → DB 저장
```

### 학습 개념

| 개념 | 설명 |
|------|------|
| JWT (Json Web Token) | Header.Payload.Signature 구조. access token은 stateless |
| HttpOnly Cookie | JS 접근 불가 → XSS로 refresh token 탈취 불가 |
| Challenge-Response | Replay Attack 방지 (nonce + TTL + 단일 사용) |
| secp256k1 | 비트코인이 사용하는 타원 곡선. 공개키로 서명 검증 |
| SHA-256 | refresh token 원문 저장 금지 → 해시만 DB에 |

### 공부할 것

- [ ] JWT 구조와 서명 알고리즘 (HS256 vs RS256)
- [ ] JwtAuthenticationFilter 동작 — OncePerRequestFilter
- [ ] Redis TTL 기반 캐시와 분산 환경에서의 challenge 저장
- [ ] `WalletAuthCrypto.verifySignature()` — bouncycastle secp256k1 검증 방식

---

## 3. 읽기 모델 동기화 — Webhook + Scheduler

### 구조

```
JackpotChain Node
    │  새 블록 확정 시
    ▼
POST /internal/new-block  (외부 노출 없음, Nginx에서 차단)
    │
    ▼
BlockchainReadModelSyncService
    ├── Block 저장
    ├── Transaction 저장
    ├── WalletActivity 기록
    ├── LottoEntry 상태 업데이트
    └── JackpotPool 잔액 갱신

BlockchainSyncScheduler  ← 보완 스케줄러
    └── 주기적 블록 높이 확인 → 누락 블록 재처리
```

### 읽기 모델이란?

CQRS에서 Write 모델(블록체인)과 Read 모델(PostgreSQL)을 분리.
BE는 블록체인 상태를 **PostgreSQL로 비정규화**해서 빠른 조회를 제공한다.

### 공부할 것

- [ ] CQRS (Command Query Responsibility Segregation) 기본 개념
- [ ] Outbox 패턴 — Webhook 처리 실패 시 메시지 유실 방지
  - RabbitMQ를 통해 재처리 보장
  - `outbox pending count` 모니터링 지표
- [ ] @Scheduled — 스프링 스케줄러 동작 방식, 분산 환경 주의사항
- [ ] Flyway 마이그레이션 — 스키마 버전 관리

---

## 4. RPC Client — JackpotChain 연동

### 구조

```java
interface JackpotChainRpcClient {
    int getBlockCount();
    JackpotChainBlockchainInfo getBlockchainInfo();
    JackpotChainLottoInfo getLottoInfo(String address);
    JackpotChainJackpotPool getJackpotPool();
    List<JackpotChainUnspentOutput> listUnspent(String address);
    String sendRawTransaction(String hexTx);
    // ...
}
```

- `JackpotChainHttpRpcClient`: HTTP POST → Node 8332 포트
- 요청/응답: JSON-RPC 2.0 형식

```json
{
  "jsonrpc": "2.0",
  "method": "getblockcount",
  "params": [],
  "id": 1
}
```

### 성능 관련 주목 포인트

RPC 호출은 **동기 HTTP**다. Node 응답이 느리면 BE 스레드가 블로킹된다.
→ 성능 테스트에서 RPC latency가 핵심 지표

### 공부할 것

- [ ] RestTemplate vs WebClient — 동기/비동기 차이
- [ ] JSON-RPC 2.0 스펙
- [ ] Redis Cache-Aside 패턴 — `@Cacheable` + TTL 전략
  - getblockchaininfo, getjackpotpool 같이 자주 호출되는 RPC 캐싱
  - 새 블록 Webhook 수신 시 캐시 evict

---

## 5. 응답 / 예외 구조

### 공통 응답

```java
// ApiResponse.java
{ "code": 200, "message": "OK", "data": { ... } }
```

### 예외 처리

```
BusinessException (도메인 예외)
    └── ErrorCode (enum) — code, message, httpStatus 포함

GlobalExceptionHandler
    ├── BusinessException → 4xx
    ├── MethodArgumentNotValidException → 400
    └── Exception → 500
```

### 공부할 것

- [ ] @RestControllerAdvice + @ExceptionHandler 동작 방식
- [ ] @Valid + ConstraintViolation — Bean Validation
- [ ] HTTP 상태 코드 vs 비즈니스 에러 코드 분리 설계

---

## 6. 구조화 로그 (MDC)

```
RequestLoggingFilter → MDC.put(traceId, requestId, uri, method)
    │
    ▼
각 서비스에서 BusinessEventLogger.log(eventType, ...)
    │
    ▼
JSON 구조화 로그 → Promtail → Loki → Grafana에서 조회
```

**핵심 eventType**

| eventType | 발생 위치 |
|-----------|----------|
| AUTH_TOKEN_ISSUED | 인증 성공 후 |
| WALLET_REGISTERED | 지갑 등록 후 |
| LOTTO_COMMIT_SUBMITTED | 로또 커밋 relay 후 |
| EXCHANGE_TRANSACTION_SUBMITTED | 교환 TX relay 후 |
| JACKPOTCHAIN_TRANSACTION_SUBMITTED | 블록체인 TX 제출 후 |

### 공부할 것

- [ ] SLF4J MDC (Mapped Diagnostic Context) — 스레드 로컬 컨텍스트
- [ ] Logback JSON 인코더 설정 (`logback-spring.xml`)
- [ ] Loki 로그 라벨링 전략

---

## 7. HikariCP — 연결 풀 (성능 테스트 핵심)

PostgreSQL 연결은 HikariCP가 관리한다.
부하 테스트 시 `HikariCP pending connection count`가 급증하면 병목.

**주요 설정값 (공부 포인트)**

| 설정 | 의미 | 기본값 |
|------|------|--------|
| maximumPoolSize | 최대 연결 수 | 10 |
| minimumIdle | 최소 유지 연결 | maximumPoolSize와 동일 |
| connectionTimeout | 연결 대기 제한 | 30s |
| idleTimeout | 유휴 연결 해제 시간 | 600s |

**튜닝 방향**
- VU(가상 유저) 수 × 평균 DB 점유 시간 ≈ 적정 pool size
- 공식: `pool size = Tn × (Cm - 1) + 1` (HikariCP 권장)

### 공부할 것

- [ ] HikariCP 원리와 connection pool 계산
- [ ] `spring.datasource.hikari.*` 설정
- [ ] `hikaricp_pending_connections` 메트릭 Grafana 시각화

---

## 8. 성능 테스트 대상 API 미리 보기

`plan.md` Phase 6 기준:

| API | VU | 시간 | 예상 병목 |
|-----|----|------|----------|
| GET /blockchain/dashboard | 100 | 5분 | RPC 조회, HikariCP |
| GET /lotto/entries?address=X | 50 | 5분 | DB 페이지네이션 |
| GET /lotto?address=X | 50 | 5분 | RPC + DB 조합 |
| POST /lotto/commit | 20 | 5분 | RPC sendrawtx, 동시성 |

> 상세 내용 → [performance-test.md](./performance-test.md)
