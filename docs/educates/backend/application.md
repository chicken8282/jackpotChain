# 애플리케이션 구조 — 레이어 아키텍처, 인증, 동기화, 예외처리

> 작성일: 2026-03-26
> 대상: BE-ssatto (Spring Boot)

---

## 왜 이 설계인가 — 블록체인 백엔드의 특수성

일반적인 웹 서비스 백엔드와 JackpotChain BE의 근본적인 차이는 두 가지다.

첫째, **인증 방식이 다르다.** 일반 서비스는 서버가 비밀번호를 저장하고 검증한다. JackpotChain은 사용자가 개인키를 보유하고 있다는 사실 자체가 신원이다. 서버는 비밀번호를 알 수 없고, 알아서도 안 된다. 인증은 "이 사람이 이 주소의 개인키를 실제로 통제한다"는 사실을 암호학적으로 증명하는 과정이어야 한다.

둘째, **상태의 원천이 외부에 있다.** 지갑 잔액, 트랜잭션 기록, 로또 결과 — 이 모든 것의 원천은 JackpotChain 노드다. BE는 그 상태를 조회·캐싱하는 역할이며, 체인 상태 변경의 권한은 없다. 이 구조는 BE가 "체인 이벤트를 수신해 읽기 모델을 갱신하는 레이어"가 되어야 함을 의미한다.

이 두 제약이 레이어 아키텍처, 인증 흐름, 동기화 전략의 모든 결정을 만들었다.

---

## 레이어드 아키텍처 — Controller → Service → Repository + RPC Client

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
    ├── config/        ← Security, CORS, JWT filter
    ├── exception/     ← GlobalExceptionHandler, BusinessException
    ├── logging/       ← MDC 기반 구조화 로그
    ├── response/      ← ApiResponse, PageResponse
    └── util/          ← JwtUtil
```

각 레이어는 명확한 책임 경계를 가진다:

| 레이어 | 책임 | 금지 |
|--------|------|------|
| Controller | HTTP 입출력, 파라미터 바인딩, `@Valid` 검증 | 비즈니스 로직 |
| Service | 트랜잭션 경계, 비즈니스 규칙, 도메인 예외 발생 | 직접 HTTP 처리 |
| Repository | JPA 조회/저장, 쿼리 최적화 | 비즈니스 판단 |
| RPC Client | JackpotChain 노드 어댑터 | 비즈니스 판단, DB 접근 |

RPC Client를 별도 레이어로 격리한 이유는 **외부 시스템 의존성 역전**이다. 서비스 레이어는 `JackpotChainRpcClient` 인터페이스에만 의존한다. 노드의 API 스펙이 바뀌어도 `JackpotChainHttpRpcClient`만 수정하면 되고, 서비스 레이어는 변경하지 않아도 된다. 테스트 시에도 RPC Client를 Mock으로 교체할 수 있다.

---

## JWT + Challenge-Response 인증 — 왜 비밀번호가 아닌가

### 설계의 출발점

"이 지갑 주소가 내 것임을 증명하라" — 이 명제를 비밀번호로 구현하면 서버가 비밀번호를 저장해야 한다. 하지만 지갑의 비밀은 개인키다. 개인키를 서버에 보내는 것은 지갑을 서버에 맡기는 것과 같다.

해답은 **Challenge-Response 인증**이다. 서버가 문제(challenge)를 내고, 클라이언트가 개인키로 서명해서 답한다. 서버는 공개키로 서명을 검증한다. 개인키는 클라이언트 메모리에만 존재하고, 서버로 전송되지 않는다.

> **Challenge-Response 인증:** 서버가 임의의 난수(nonce)를 포함한 챌린지를 발급하고, 클라이언트가 비밀(개인키)로 응답에 서명한다. 서버는 공개키로 서명을 검증해 비밀 보유 여부를 확인한다. 비밀 자체를 전송하지 않아도 증명이 가능하다.

> **secp256k1:** 비트코인과 이더리움이 사용하는 타원 곡선 암호화 알고리즘. 개인키로 서명하고 공개키로 검증하는 ECDSA(타원 곡선 디지털 서명 알고리즘) 기반이다.

### 전체 인증 흐름

```
1. POST /v1/auth/challenge
   클라이언트 → 지갑 주소 전송
   서버 → nonce 생성, canonical message 조립, Redis에 TTL 5분으로 저장
   서버 → challengeId, nonce, message 반환

2. 클라이언트 (브라우저, IndexedDB에서 개인키 복호화)
   → challenge.message를 개인키로 secp256k1 서명

3. POST /v1/auth/verify
   클라이언트 → challengeId, address, publicKey, signature 전송
   서버:
     1) Redis에서 challenge 조회 (없으면 → 만료/재사용 예외)
     2) challenge.used == true 또는 만료 → 삭제 후 예외
     3) publicKey에서 주소 재유도 → request.address와 일치 확인
     4) WalletAuthCrypto.verifySignature() → secp256k1 서명 검증
     5) challenge.markUsed() → Redis 갱신 (단일 사용 보장)
     6) JWT access token 발급 (subject = walletAddress)
     7) opaque refresh token 생성 → SHA-256 해시 → DB 저장
   서버 → accessToken, sessionHandle, refreshToken(HttpOnly cookie) 반환
```

### AuthService 실제 코드

`verifyChallenge`의 핵심 부분:

```java
// 1. 챌린지 조회 및 만료/재사용 검사
AuthChallenge challenge = authChallengeRepository.findById(request.challengeId())
    .orElseThrow(AuthChallengeNotFoundException::new);

if (challenge.used() || challenge.isExpired(LocalDateTime.now())) {
    authChallengeRepository.delete(request.challengeId());
    throw new AuthChallengeNotFoundException();
}

// 2. 공개키 → 주소 재유도 → 일치 검증
String derivedAddress = walletAuthCrypto.deriveAddress(request.publicKey());
if (!request.address().equals(challenge.address()) || !request.address().equals(derivedAddress)) {
    throw new InvalidAuthSignatureException();
}

// 3. secp256k1 서명 검증
boolean signatureValid = walletAuthCrypto.verifySignature(
    challenge.message(), request.signature(), request.publicKey()
);
if (!signatureValid) {
    throw new InvalidAuthSignatureException();
}

// 4. 챌린지 사용 처리 + 토큰 발급
authChallengeRepository.save(challenge.markUsed());
String accessToken = jwtUtil.generateAccessToken(request.address());
String refreshToken = jwtUtil.generateRefreshToken();
String refreshTokenHash = jwtUtil.hashRefreshToken(refreshToken);
```

주소 재유도가 중요하다. 클라이언트가 주소 A를 선언하고 주소 B의 개인키로 서명하는 공격을 차단한다. `walletAuthCrypto.deriveAddress(publicKey)`는 `SHA256 → RIPEMD160 → Base58Check` 과정으로 공개키에서 주소를 재계산하고, 선언된 주소와 일치하는지 확인한다.

### WalletAuthCrypto — secp256k1 검증

```java
public boolean verifySignature(String message, String signatureHex, String publicKeyHex) {
    byte[] messageHash = sha256(message.getBytes(StandardCharsets.UTF_8));
    byte[] signature = parseHex(signatureHex);
    byte[] publicKey = parseHex(publicKeyHex);
    BigInteger[] signatureComponents = decodeDerSignature(signature);

    ECDSASigner verifier = new ECDSASigner();
    verifier.init(false, new ECPublicKeyParameters(
        SECNamedCurves.getByName("secp256k1").getCurve().decodePoint(publicKey),
        DOMAIN_PARAMETERS
    ));
    return verifier.verifySignature(messageHash, signatureComponents[0], signatureComponents[1]);
}
```

Bouncy Castle 라이브러리를 사용한다. DER 인코딩된 서명을 `(r, s)` 성분으로 파싱하고, secp256k1 곡선 파라미터로 초기화된 `ECDSASigner`가 검증한다. 이 구현이 JackpotChain 노드의 서명 검증 로직과 동일한 방식이어야 한다 — 클라이언트가 체인에 TX를 제출할 때도 동일한 secp256k1 서명을 사용하기 때문이다.

---

## Redis — Challenge 저장에 왜 Redis인가

> **Redis:** 인메모리 Key-Value 저장소. TTL(Time To Live) 기반 자동 만료, 원자적 연산, 초고속 조회가 특징이다.

Challenge를 PostgreSQL에 저장하지 않고 Redis에 저장하는 이유는 세 가지다:

**첫째, TTL 자동 만료다.** Challenge는 5분짜리 일회용 데이터다. PostgreSQL에 저장하면 만료된 챌린지를 주기적으로 정리하는 별도 배치 작업이 필요하다. Redis는 `setex` 명령으로 TTL을 지정하면 만료 시 자동 삭제된다.

```java
// RedisAuthChallengeRepository
Duration ttl = Duration.between(LocalDateTime.now(), challenge.expiresAt());
stringRedisTemplate.opsForValue().set(buildKey(challenge.challengeId()), value, ttl);
```

**둘째, 단일 사용 강제다.** `verifyChallenge`에서 챌린지 조회 후 즉시 `markUsed()`를 호출하고 저장한다. Redis의 단일 스레드 명령 실행 덕분에 동시에 두 요청이 같은 챌린지로 검증을 시도해도 첫 번째만 성공한다.

**셋째, Replay Attack 방지다.** 이미 사용된 챌린지로 재인증을 시도하면 `challenge.used() == true`이므로 즉시 거부된다.

> **Replay Attack:** 정상적인 인증 요청을 가로채서 동일한 요청을 재전송하는 공격. Challenge-Response에서 nonce와 단일 사용 제약으로 방지한다.

---

## JWT — Access Token + Refresh Token 설계

> **JWT (JSON Web Token):** `Header.Payload.Signature` 세 파트로 구성된 자가 서명 토큰. 서버가 토큰 상태를 별도로 저장하지 않고 서명만으로 유효성을 검증한다(stateless).

### Access Token (단기, stateless)

```java
public String generateAccessToken(String walletAddress) {
    Date now = new Date();
    Date expiry = new Date(now.getTime() + accessExpirationMs);  // 15분

    return Jwts.builder()
        .subject(walletAddress)
        .issuedAt(now)
        .expiration(expiry)
        .signWith(secretKey)
        .compact();
}
```

`subject`에 지갑 주소를 담는다. `JwtAuthenticationFilter`가 모든 요청에서 Bearer 토큰을 파싱해 `SecurityContext`에 `walletAddress`를 principal로 설정한다.

Access token은 **stateless**다. 서버는 발급된 토큰 목록을 저장하지 않는다. 서명만 검증하면 유효성을 알 수 있다. 이 덕분에 서버를 여러 인스턴스로 수평 확장해도 세션 공유가 필요 없다.

단점은 **즉시 무효화가 불가능**하다는 점이다. 15분 짜리 access token을 발급하면 만료 전에 계정을 차단해도 토큰은 계속 유효하다. 이 트레이드오프를 수용하기 위해 만료 시간을 짧게(15분) 설정한다.

### Refresh Token (장기, opaque, DB 저장)

Access token 만료 시마다 다시 로그인하면 UX가 나쁘다. Refresh token은 "다시 로그인하지 않고 새 access token을 발급받는" 메커니즘이다.

```java
public String generateRefreshToken() {
    byte[] bytes = new byte[32];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
}
```

Refresh token은 **opaque** — 내부에 의미있는 정보가 없는 순수 난수다. JWT와 달리 서버가 상태를 관리해야 한다.

### 왜 Refresh Token 원문을 DB에 저장하지 않는가

```java
public String hashRefreshToken(String refreshToken) {
    byte[] digest = MessageDigest.getInstance("SHA-256")
        .digest(refreshToken.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(digest);
}
```

DB에 저장되는 것은 `SHA-256(refreshToken)`이다. 원문이 저장되지 않는 이유:

- DB가 유출되어도 공격자는 refresh token 원문을 알 수 없다
- SHA-256은 단방향 해시라 원문을 복원할 수 없다
- 검증 시 클라이언트가 보낸 원문을 해시해서 DB의 해시와 비교한다

비밀번호를 bcrypt로 해시하는 것과 동일한 원리다.

### Refresh Token Rotation

```java
@Transactional
public AuthRefreshResponse refresh(AuthRefreshRequest request, String refreshToken) {
    AuthRefreshSession session = authRefreshSessionRepository
        .findBySessionHandle(request.sessionHandle())
        .orElseThrow(AuthRefreshSessionNotFoundException::new);

    String refreshTokenHash = jwtUtil.hashRefreshToken(refreshToken);
    if (!session.isActive(now) || !session.getRefreshTokenHash().equals(refreshTokenHash)) {
        session.revoke(now);  // 불일치 시 세션 강제 폐기
        authRefreshSessionRepository.save(session);
        throw new AuthRefreshSessionNotFoundException();
    }

    // 새 토큰 발급 + 기존 세션 rotate (새 row 생성 아님)
    String nextRefreshToken = jwtUtil.generateRefreshToken();
    String nextRefreshTokenHash = jwtUtil.hashRefreshToken(nextRefreshToken);
    session.rotate(nextRefreshTokenHash, now.plusNanos(refreshTokenExpirationMs * 1_000_000L));
    authRefreshSessionRepository.save(session);
```

Refresh token은 사용될 때마다 새 토큰으로 교체된다(Rotation). 이미 사용된 토큰으로 재시도하면 `hashRefreshToken(oldToken) != session.refreshTokenHash`이므로 세션이 즉시 폐기된다. 이 패턴은 탈취된 refresh token이 사용되는 순간 감지할 수 있게 한다 — 합법적 클라이언트가 새 토큰으로 갱신하면 탈취 토큰이 무효화된다.

### 왜 HttpOnly Cookie인가

> **HttpOnly Cookie:** JavaScript에서 접근할 수 없는 쿠키. `document.cookie`로 읽거나 XSS 공격으로 탈취할 수 없다.

Refresh token을 `localStorage`에 저장하면 XSS 취약점이 있을 때 공격자가 `localStorage.getItem('refreshToken')`으로 즉시 탈취할 수 있다. HttpOnly cookie는 브라우저만 알고 있어 JavaScript에서 접근할 수 없다. 쿠키는 브라우저가 자동으로 요청에 첨부하므로, BE는 `HttpServletRequest`에서 쿠키를 읽어 검증한다.

---

## Webhook + Scheduler 이중 동기화

### 왜 두 가지 방식이 모두 필요한가

JackpotChain 노드는 새 블록이 확정될 때 `POST /internal/new-block`으로 Webhook을 보낸다. 이것이 기본 동기화 경로다.

하지만 Webhook은 실패할 수 있다:
- 노드가 Webhook을 보내는 시점에 BE 서버가 재시작 중이면 누락된다
- 네트워크 일시 장애로 전달이 실패할 수 있다
- BE 처리 중 예외가 발생해 DB에 저장되지 않을 수 있다

`BlockchainSyncScheduler`는 이 누락을 보완한다. 주기적으로 현재 체인 높이와 DB의 최대 `block.height`를 비교하고, 차이가 있으면 누락된 블록을 RPC로 재조회해 처리한다.

```
JackpotChain Node
    │  새 블록 확정 시 (primary)
    ▼
POST /internal/new-block → BlockchainReadModelSyncService
    ├── block 테이블 INSERT
    ├── transaction 테이블 INSERT
    ├── wallet_activity 기록
    ├── lotto_entry 상태 UPDATE
    └── jackpot_pool 갱신

BlockchainSyncScheduler (fallback, 주기적 실행)
    └── RPC로 최신 블록 높이 조회 → DB 최대 높이와 비교 → 누락 시 재처리
```

`/internal/new-block`은 외부에 노출되지 않는다. Nginx 설정에서 이 경로는 블록 처리돼 외부 접근이 차단된다.

### BlockchainReadModelSyncService가 @Transactional이어야 하는 이유

```java
@Transactional
public void syncNewBlock(JackpotChainIndexedBlock block) {
    // block → transaction → wallet_activity → lotto_entry → jackpot_pool
    // 이 모든 작업이 하나의 트랜잭션
}
```

블록 저장에 성공했지만 `wallet_activity` 저장에 실패하면 읽기 모델이 불일치 상태가 된다. `@Transactional`로 전체를 하나의 단위로 묶어 전부 성공하거나 전부 롤백되게 한다. 롤백된 블록은 스케줄러가 다음 주기에 재처리한다.

---

## GlobalExceptionHandler + BusinessException + ErrorCode

### 왜 도메인 예외 계층이 필요한가

서비스 계층에서 `throw new RuntimeException("지갑을 찾을 수 없음")`이라고 던지면 컨트롤러는 이 예외를 잡아 HTTP 응답으로 변환하는 책임을 가져야 한다. 그러면 컨트롤러가 두꺼워지고, 예외 타입만 보고 HTTP 상태 코드를 결정하는 중복 로직이 생긴다.

`BusinessException` + `ErrorCode` 패턴은 이를 해결한다:

```java
// ErrorCode enum
AUTH_CHALLENGE_NOT_FOUND(HttpStatus.UNAUTHORIZED, "유효하지 않거나 만료된 인증 챌린지입니다."),
WALLET_NOT_FOUND(HttpStatus.NOT_FOUND, "지갑 정보를 찾을 수 없습니다."),
LOTTO_ENTRY_NOT_FOUND(HttpStatus.NOT_FOUND, "로또 참여 내역을 찾을 수 없습니다."),
BLOCKCHAIN_RPC_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "블록체인 RPC 호출에 실패했습니다.")
```

`ErrorCode`는 HTTP 상태와 메시지를 한 곳에서 관리한다. 서비스는 `throw new AuthChallengeNotFoundException()`만 하면 된다. `GlobalExceptionHandler`가 `BusinessException`을 잡아 `ErrorCode`에서 HTTP 상태와 메시지를 읽어 응답을 만든다:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException exception, ...) {
        ErrorCode errorCode = exception.getErrorCode();
        return ResponseEntity
            .status(errorCode.getHttpStatus())
            .body(ApiResponse.error(errorCode.getHttpStatus().value(), exception.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleException(Exception exception, ...) {
        // 스택 트레이스는 로그에만, 응답에는 제네릭 메시지
        log.error("unhandled exception occurred", exception);
        return ResponseEntity.status(500)
            .body(ApiResponse.error(500, ErrorCode.COMMON_INTERNAL_SERVER_ERROR.getMessage()));
    }
}
```

`Exception.class` 핸들러가 스택 트레이스를 클라이언트에 노출하지 않는 것이 중요하다. 서버 내부 구조가 외부에 드러나면 공격 표면이 넓어진다.

---

## MDC 구조화 로그 — 요청 추적

> **MDC (Mapped Diagnostic Context):** SLF4J의 스레드 로컬 저장소. 요청 처리 스레드에 key-value를 설정하면 해당 스레드의 모든 로그에 자동으로 포함된다.

> **구조화 로그(Structured Logging):** 자유 형식 텍스트 대신 JSON 같은 파싱 가능한 형식으로 로그를 기록하는 방식. Loki, Elasticsearch 같은 로그 집계 시스템에서 필드 기반 검색이 가능하다.

### 왜 MDC인가

요청 처리 중 `AuthService`, `WalletRepository`, `JwtUtil` 등 여러 컴포넌트에서 로그가 발생한다. 동시에 수백 개의 요청이 처리되면 로그가 뒤섞여 하나의 요청 흐름을 추적하기 어렵다.

MDC는 요청마다 고유 `traceId`를 부여하고, 해당 스레드의 모든 로그에 자동으로 포함시킨다. Grafana Loki에서 `traceId`로 필터링하면 특정 요청의 전체 처리 흐름을 한눈에 볼 수 있다.

### RequestLoggingFilter

```java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, ...) throws ... {
        String requestId = LoggingUtils.resolveRequestId(request.getHeader("X-Request-Id"));
        String traceId = LoggingUtils.newTraceId();

        try {
            MDC.put(LoggingFields.REQUEST_ID, requestId);
            MDC.put(LoggingFields.TRACE_ID, traceId);
            MDC.put(LoggingFields.METHOD, request.getMethod());
            MDC.put(LoggingFields.URI, request.getRequestURI());
            response.setHeader("X-Request-Id", requestId);
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(LoggingFields.REQUEST_ID);
            MDC.remove(LoggingFields.TRACE_ID);
            MDC.remove(LoggingFields.METHOD);
            MDC.remove(LoggingFields.URI);
        }
    }
}
```

`finally` 블록에서 MDC를 반드시 정리한다. 스프링의 스레드 풀은 스레드를 재사용한다. 정리하지 않으면 이전 요청의 `traceId`가 다음 요청에 남아 로그가 오염된다.

### MDC의 스레드 로컬 한계

MDC는 스레드 로컬 기반이다. 비동기 처리(`@Async`, `CompletableFuture`, WebFlux)로 다른 스레드에서 로그를 남기면 MDC 컨텍스트가 전파되지 않아 `traceId`가 비어 있다.

해결책은 두 가지다:
- 비동기 실행 시 MDC 스냅샷을 캡처해 새 스레드에 복사한다
- MDC 전파를 지원하는 `TaskDecorator`를 `ThreadPoolTaskExecutor`에 등록한다

현재 프로젝트는 대부분 동기 처리이므로 이 문제가 크지 않지만, `@Scheduled` 스케줄러에서 발생하는 로그는 요청 `traceId`가 없다는 점에 주의한다.

### 핵심 이벤트 로그

```java
BusinessEventLogger.info(
    LoggingEventType.AUTH_TOKEN_ISSUED,
    "wallet auth verified and tokens issued",
    LoggingUtils.fields(
        LoggingFields.WALLET_ADDRESS, request.address(),
        LoggingFields.CHALLENGE_ID, request.challengeId(),
        LoggingFields.SESSION_HANDLE, sessionHandle
    )
);
```

`AUTH_TOKEN_ISSUED`, `WALLET_REGISTERED`, `LOTTO_COMMIT_SUBMITTED`, `EXCHANGE_TRANSACTION_SUBMITTED`는 반드시 INFO로 기록한다. 단순 조회(`getDashboard`, `getWallets`)는 로그를 남기지 않고 메트릭으로 처리한다 — 모든 read를 로깅하면 로그 볼륨이 폭발한다.

---

## JwtAuthenticationFilter — stateless 인증 처리

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, ...) throws ... {
        String authorization = request.getHeader("Authorization");
        if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
            String accessToken = authorization.substring(7).trim();
            if (StringUtils.hasText(accessToken) && jwtUtil.isValidToken(accessToken)) {
                String walletAddress = jwtUtil.extractWalletAddress(accessToken);
                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(walletAddress, null, List.of());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }
}
```

`OncePerRequestFilter`를 확장해 요청당 정확히 한 번 실행을 보장한다. 토큰이 유효하면 `SecurityContext`에 authentication을 설정하고, 유효하지 않으면 아무것도 하지 않고 다음 필터로 넘긴다. 인증 실패의 최종 처리는 `JwtAuthenticationEntryPoint`가 담당한다.

보호된 엔드포인트에서 `@AuthenticationPrincipal`로 받은 `walletAddress`와 요청 파라미터의 주소를 서비스 레이어에서 비교해 `JWT subject == 요청 대상 지갑 주소`를 강제한다. "토큰이 유효하다"와 "이 지갑에 대한 작업을 수행할 권한이 있다"는 다른 검증이다.

---

## @Transactional 배치 전략

서비스 메서드의 `@Transactional` 사용 원칙:

```java
@Transactional(readOnly = true)  // 조회 전용
public WalletActivityCursorResponse getActivities(String address, ...) { ... }

@Transactional  // 쓰기 포함
public AuthVerifyResponse verifyChallenge(AuthVerifyRequest request) { ... }
```

`readOnly = true`는 두 가지 효과가 있다:
1. Hibernate가 변경 감지(Dirty Checking)를 수행하지 않아 성능이 개선된다
2. 읽기 전용 트랜잭션임을 명시해 실수로 쓰기 작업을 하지 않도록 제약한다

읽기 모델 동기화(`syncNewBlock`)는 반드시 `@Transactional`이어야 한다. block, transaction, wallet_activity, lotto_entry, jackpot_pool 업데이트가 원자적으로 처리되지 않으면 불일치 상태가 발생한다.

---

## 면접 Q&A

**Q1. 왜 Challenge-Response 인증인가? 비밀번호 인증과 비교해서 설명하라.**

비밀번호 인증은 서버가 비밀번호(또는 해시)를 저장해야 한다. 블록체인에서 사용자의 비밀은 개인키이며, 이를 서버에 저장하면 custodial(관리형) 지갑이 된다 — 사용자가 서버를 신뢰해야 한다. Challenge-Response는 서버가 nonce를 발급하고 클라이언트가 개인키로 서명해서 보낸다. 서버는 공개키로 서명을 검증할 뿐, 개인키를 절대 알지 못한다. 또한 nonce(챌린지)가 매번 다르므로 이전 서명을 캡처해 재전송하는 Replay Attack이 불가능하다.

**Q2. JWT stateless의 장단점과 이 프로젝트에서의 트레이드오프는?**

장점은 수평 확장이 쉽다는 점이다. 서버가 토큰 상태를 저장하지 않으므로 어느 인스턴스에서 검증해도 결과가 같다. 단점은 발급된 토큰을 즉시 무효화할 수 없다는 점이다. 사용자 계정을 정지해도 15분짜리 access token은 만료까지 유효하다. 이 프로젝트에서는 만료 시간을 15분으로 짧게 설정하고, 세션 폐기가 필요할 때는 refresh session을 `revoke`해서 새 access token 발급을 차단하는 방식으로 타협한다. 완전한 즉시 무효화가 필요하면 Redis 블랙리스트를 사용해야 하지만, stateless 장점을 일부 포기하게 된다.

**Q3. Refresh token rotation은 어떻게 토큰 탈취를 감지하는가?**

정상 흐름에서 클라이언트가 refresh token을 사용하면 서버는 새 토큰을 발급하고 DB의 해시를 갱신한다. 공격자가 탈취된 이전 토큰을 사용하려 하면 `hashRefreshToken(oldToken) != session.refreshTokenHash`이므로 불일치가 감지된다. 이때 서버는 세션을 즉시 `revoke`한다. 결과적으로 정상 사용자도 다시 로그인해야 하지만, 탈취된 토큰도 무효화된다. 두 토큰이 거의 동시에 사용되면 감지가 불확실할 수 있는 레이스 컨디션이 존재하지만, 실용적인 수준에서 허용한다.

**Q4. HttpOnly cookie는 왜 refresh token 보호에 충분한가? 한계는?**

HttpOnly cookie는 JavaScript에서 접근할 수 없어 XSS 공격으로 직접 탈취가 불가능하다. 합법적인 브라우저 요청에는 자동으로 첨부되므로 UX 손해도 없다. 한계는 CSRF(Cross-Site Request Forgery)다 — 다른 도메인에서 유도된 폼 제출로 cookie가 자동 첨부될 수 있다. 이를 `SameSite=Lax`(로컬) 또는 `SameSite=None; Secure`(운영)로 방어한다. `SameSite=None`은 반드시 HTTPS(Secure)와 함께 써야 한다 — 이 조합의 잘못된 설정은 서버 기동 단계에서 `AuthRefreshCookieProperties` 유효성 검사로 차단한다.

**Q5. Webhook 전달이 실패하면 어떻게 되는가?**

Webhook이 누락되면 해당 블록이 PostgreSQL 읽기 모델에 인덱싱되지 않는다. 즉각적인 영향은 `wallet_activity` 목록, 로또 결과 상태 업데이트, 잭팟 풀 캐시가 최신 상태가 아닌 것이다. 이를 `BlockchainSyncScheduler`가 보완한다 — 주기적으로 RPC로 현재 블록 높이를 조회하고 DB의 최대 높이와 비교해 누락된 블록을 재처리한다. 지갑 잔액은 항상 RPC로 직접 조회하므로 Webhook 누락의 영향을 받지 않는다.

**Q6. MDC thread-local 방식의 비동기 코드에서의 한계는?**

MDC는 `ThreadLocal` 기반이다. `@Async`나 `CompletableFuture.supplyAsync()`가 다른 스레드에서 실행되면 그 스레드에는 MDC 컨텍스트가 없다. 결과적으로 `traceId`가 null인 로그가 발생하고, Loki에서 요청 흐름을 추적할 수 없게 된다. 해결책은 `RequestLoggingFilter`에서 MDC 스냅샷(`MDC.getCopyOfContextMap()`)을 캡처하고, `Callable` 또는 `Runnable`을 wrapping해서 새 스레드에서 MDC를 복원하는 패턴이다. 스프링의 `TaskDecorator`를 `ThreadPoolTaskExecutor`에 등록하면 이를 자동화할 수 있다.

**Q7. Refresh token을 해시해서 저장하는 이유는 무엇인가? SHA-256이 bcrypt 대신 사용된 이유는?**

Refresh token 원문이 DB에 저장되면 DB 유출 시 공격자가 즉시 세션을 탈취할 수 있다. SHA-256 해시는 단방향이라 원문 복원이 불가능하다. 검증 시 클라이언트가 보낸 원문을 해시해서 DB 값과 비교한다. SHA-256을 bcrypt 대신 사용한 이유는 refresh token이 이미 충분히 긴 무작위 값(32바이트 = 256비트 엔트로피)이기 때문이다. bcrypt의 존재 이유는 "짧고 예측 가능한 비밀번호에 대한 무차별 공격"을 느리게 만들기 위해서다. 256비트 엔트로피를 가진 토큰은 무차별 공격 자체가 불가능하므로, 느린 해시 함수가 필요 없다. SHA-256은 빠르면서도 충분히 안전하다.
