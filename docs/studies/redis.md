# Redis 학습 — 캐시 전략 · TTL · 분산 락

> 작성일: 2026-03-25
> 기준: docker-compose.local.yml, application-local.yml, RedisAuthChallengeRepository, BlockchainQueryService 실제 코드

---

## 1. 왜 Redis가 필요한가

현재 JackpotChain 백엔드는 모든 조회 요청이 **RPC 또는 DB를 직접 호출**한다.

```
GET /api/v1/blockchain/dashboard
    → getBlockchainInfo() RPC
    → getPeerInfo() RPC
    → getBlockHash() × N RPC   (최근 블록 10개 = 최소 20회 RPC)
    → getBlock() × N RPC
```

대시보드 1회 조회에 RPC 22회 이상이 발생한다.
같은 정보를 여러 사용자가 동시에 요청하거나, 5초마다 폴링하면 Node가 같은 RPC를 반복 처리한다.

| 상황 | 문제 |
|------|------|
| 메인 대시보드 폴링 (5초 간격) | 동시 접속자 10명이면 Node에 초당 2회 × 22 = 44회 RPC |
| 블록 높이 조회 | 블록은 평균 수십 초에 한 번 생성되는데 매 요청마다 RPC |
| 잭팟 풀 조회 | 풀 잔액은 블록 생성 전까지 변하지 않는데 매번 조회 |
| Commit/Claim 연속 클릭 | 서명된 TX를 두 번 제출하면 두 번 노드에 올라감 |

**핵심**: 짧은 시간 동안 변하지 않는 데이터를 매번 새로 조회하는 것은 낭비다.
Redis는 이 데이터를 메모리에 저장해 다음 요청이 오면 RPC나 DB 없이 바로 돌려준다.

---

## 2. Redis란 무엇인가

**Re**mote **Di**ctionary **S**erver. 메모리 기반 키-값 저장소다.

```
애플리케이션 ──get(key)──▶  Redis (메모리)  →  있으면 즉시 반환 (< 1ms)
                                          →  없으면 miss → DB/RPC 조회 후 set(key, value, ttl)
```

**핵심 특징 3가지**

| 특징 | 의미 |
|------|------|
| **In-Memory** | 모든 데이터가 메모리에 상주 → 디스크 I/O 없음 → 마이크로초 응답 |
| **TTL (Time To Live)** | 키마다 만료 시간 설정 → 일정 시간 후 자동 삭제 → 별도 만료 스케줄러 불필요 |
| **원자적 연산** | 단일 명령이 원자적으로 실행 → `SET NX`(키가 없을 때만 세팅) 같은 락 구현 가능 |

**포트**: 6379 (기본값)

---

## 3. Redis 데이터 타입 — 어떤 타입을 언제 쓰는가

Redis는 단순 키-값 외에 여러 자료구조를 지원한다.

### 3-1. String — 가장 기본

```
SET  dashboard:blockchain  "{\"height\":12345,...}"  EX 5
GET  dashboard:blockchain
```

- 모든 값을 JSON 직렬화해서 저장
- 캐시 대부분이 이 타입으로 구현됨
- `EX N`으로 TTL 초 단위 설정

**이 프로젝트 적용**: 대시보드, 잭팟 풀, 로또 개요 캐시

---

### 3-2. Hash — 필드별 부분 갱신이 필요할 때

```
HSET  stats:admin  today_commits  42  today_claims  7
HGET  stats:admin  today_commits
HINCRBY  stats:admin  today_commits  1   ← 원자적 증가
```

- 하나의 키 안에 여러 필드를 저장
- 필드 단위로 읽고 쓸 수 있음 → 전체를 다시 직렬화할 필요 없음

**이 프로젝트 적용**: 관리자 대시보드 집계 카운터 (오늘 Commit/Claim 수)

---

### 3-3. SET NX — 분산 락

```
SET  lock:commit:jack1abc...  1  NX  EX 10
     (키)                    (값) (없을 때만) (10초 TTL)
```

- `NX`: 키가 **없을 때만** 세팅 성공 → 성공한 쪽이 락 획득
- 실패한 쪽은 이미 락이 있다는 뜻 → 중복 요청 거부
- TTL로 락 자동 해제 → 서버 크래시 시 데드락 방지

**이 프로젝트 적용**: Commit/Claim 연속 클릭 방지

---

## 4. 캐시 전략 — 어떻게 읽고 쓸 것인가

캐시 전략은 "데이터를 어느 타이밍에, 누가, 어디에 쓰는가"에 따라 나뉜다.

### 4-1. Cache-Aside (지연 로딩)

```
조회 요청
    │
    ▼
Redis 조회 ──▶ 있음(Hit) → 즉시 반환
    │
   없음(Miss)
    │
    ▼
DB/RPC 조회
    │
    ▼
Redis에 저장 (TTL 설정)
    │
    ▼
응답 반환
```

```java
public BlockchainDashboardResponse getDashboard(int limit) {
    String cacheKey = "dashboard:blockchain:" + limit;

    // 1. 캐시 확인
    String cached = redisTemplate.opsForValue().get(cacheKey);
    if (cached != null) {
        return objectMapper.readValue(cached, BlockchainDashboardResponse.class);
    }

    // 2. 캐시 미스 → RPC 조회
    BlockchainDashboardResponse response = fetchFromRpc(limit);

    // 3. 캐시에 저장 (5초 TTL)
    redisTemplate.opsForValue().set(cacheKey,
        objectMapper.writeValueAsString(response),
        Duration.ofSeconds(5));

    return response;
}
```

**특징**
- 애플리케이션이 직접 캐시를 관리
- 처음 조회 시 항상 Miss → 그 이후 TTL까지 Hit
- 가장 단순하고 범용적 → **이 프로젝트의 기본 전략**

---

### 4-2. Write-Through (쓰기 관통)

```
쓰기 요청 → DB/RPC 저장
              └→ 동시에 Redis에도 저장
```

- DB 쓰기와 캐시 쓰기를 동시에 수행
- 캐시는 항상 최신 상태 유지
- 단점: 캐시에 없는 데이터도 모두 저장 → 불필요한 캐시 사용

**이 프로젝트 적용 여부**: 현재 불필요.
`BlockchainQueryService`는 RPC를 통해 읽기만 하고, 블록 데이터는 Node에서 직접 관리한다.
DB에 쓰는 시점(스케줄러 동기화)과 사용자 조회 시점이 분리되어 있어 적용 대상이 제한적이다.

---

### 4-3. Write-Behind (쓰기 지연)

```
쓰기 요청 → Redis에 먼저 저장 → 비동기로 나중에 DB에 반영
```

- 응답 시간이 매우 빠름
- 단점: Redis 장애 시 데이터 유실 가능
- 적용 복잡도 높음

**이 프로젝트 적용 여부**: 미적용. 이 프로젝트에서 Redis 장애 시 데이터가 유실되면 안 되는 쓰기는 없다.
쓰기는 Node RPC를 통해 블록체인에 직접 기록되므로 Write-Behind 레이어가 끼어들 여지가 없다.

---

### 4-4. Read-Through

```
조회 요청 → Redis에 위임 → Redis가 Miss 시 DB를 직접 조회 → Redis에 저장 → 반환
```

- 캐시 미스 처리를 Redis가 담당 (애플리케이션이 아닌)
- Spring에서는 추가 캐시 라이브러리(Redis + CacheLoader 설정) 필요
- 단순한 Cache-Aside보다 구성이 복잡함

**이 프로젝트 적용 여부**: 미적용. Spring의 `@Cacheable`이 사실상 Read-Through와 동일하게 동작한다. 별도 구성 불필요.

---

### 4-5. 전략 비교 요약

| 전략 | 캐시 채우는 시점 | 일관성 | 구현 복잡도 | 이 프로젝트 적용 |
|------|----------------|--------|------------|---------------|
| Cache-Aside | 조회 시 Miss 발생 때 | TTL만큼 지연 가능 | 낮음 | **기본 전략** |
| Write-Through | DB 쓰기와 동시 | 높음 | 중간 | 미적용 |
| Write-Behind | DB 쓰기보다 먼저 | 낮음 (지연) | 높음 | 미적용 |
| Read-Through | 조회 시 Miss 발생 때 | TTL만큼 지연 가능 | 중간 | `@Cacheable`로 흡수 |

---

## 5. 캐시 무효화 전략 — 언제 캐시를 지울 것인가

캐시는 데이터가 바뀌었을 때 낡은 값(stale data)을 돌려주면 안 된다.
무효화 전략은 "캐시를 언제 지울 것인가"를 결정한다.

### 5-1. TTL 기반 만료 (Time-To-Live)

캐시가 저장될 때 설정한 시간이 지나면 Redis가 자동으로 삭제한다.

```
SET  dashboard:blockchain  "..."  EX 5   ← 5초 후 자동 삭제
```

**장점**: 코드 추가 없이 자동 무효화, 구현 단순
**단점**: TTL 동안은 낡은 데이터 제공 가능

**어떤 TTL을 얼마나 설정할 것인가**

| 데이터 | 변화 주기 | 적용 TTL | 근거 |
|--------|---------|---------|------|
| 블록 높이 (`height`) | 블록 생성 간격 (수십 초 이상) | 5초 | 사용자가 5초 지연 허용 가능 |
| 피어 수 (`connections`) | 분 단위 변화 | 10초 | 실시간성 낮음 |
| 최근 블록 목록 | 블록 생성 시 변화 | 5초 | 대시보드와 동일 |
| 잭팟 풀 (`poolBalanceJack`) | 블록 생성 시 변화 | 10초 | 풀은 블록마다 조금씩 변화 |
| 로또 개요 (`totalEntries`) | Commit 발생 시 변화 | 30초 | 집계 수치는 실시간 불필요 |
| 관리자 통계 (오늘 Commit 수) | Commit 발생 시 변화 | 60초 | 관리자 화면은 지연 허용 |
| 교환 정보 (`jack_per_pot`) | 거의 변하지 않음 | 5분 | 교환 규칙은 운영자가 직접 변경 |

**stale data를 어디까지 허용할 것인가**

- 블록 높이가 5초 늦게 보인다 → 허용
- 잭팟 풀 잔액이 10초 늦게 보인다 → 허용
- Commit 직후 자신의 참여 내역이 보이지 않는다 → **불허** → 수동 무효화 필요

---

### 5-2. 수동 무효화 (Explicit Eviction)

특정 이벤트 발생 시 관련 캐시 키를 명시적으로 삭제한다.

```java
// LottoService.commit() — Commit 성공 후 캐시 무효화
public String commit(LottoCommitRequest request) {
    String txId = jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());

    // Commit 발생 → 로또 개요, 관리자 통계 캐시 무효화
    redisTemplate.delete("lotto:overview:" + request.fromAddress());
    redisTemplate.delete("stats:admin");

    return txId;
}
```

**Spring `@CacheEvict` 사용 시**

```java
@CacheEvict(value = "lotto-overview", key = "#request.fromAddress()")
public String commit(LottoCommitRequest request) {
    return jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
}
```

**무효화 대상 이벤트**

| 이벤트 | 무효화할 캐시 |
|--------|------------|
| Commit 성공 | `lotto:overview:{address}`, `stats:admin` |
| Claim 성공 | `lotto:overview:{address}`, `stats:admin` |
| 블록 동기화 완료 (스케줄러) | `dashboard:blockchain`, `lotto:overview` |

---

### 5-3. 캐시 스탬피드 방지

TTL이 만료된 직후, 동시에 여러 요청이 몰리면 모두 Miss가 되어 동시에 RPC를 호출한다.
이를 **Cache Stampede**(캐시 스탬피드, 또는 Thundering Herd)라고 한다.

```
t=0:  Redis에 캐시 저장 (TTL 5초)
t=5:  TTL 만료 → 동시 요청 10개 → 전부 Miss → 동시 RPC 10회 호출
t=5+: 10개가 각자 캐시 갱신 → 9번은 중복 갱신
```

**이 프로젝트의 현실적 대응**
이 프로젝트 규모에서는 스탬피드 위험이 낮다(동시 접속자 수십 명 이하).
단순하게 시작하고, Grafana에서 Cache Miss Rate가 높다고 판단될 때 적용한다.

완전한 해결책은 분산 락으로 한 요청만 RPC를 수행하게 하는 것이다.
```java
// 스탬피드 방지 예시 (참고용)
String lockKey = "lock:cache:dashboard";
Boolean acquired = redisTemplate.opsForValue().setIfAbsent(lockKey, "1", Duration.ofSeconds(3));
if (Boolean.TRUE.equals(acquired)) {
    try {
        // 이 요청만 RPC 수행 후 캐시 갱신
        refreshDashboardCache();
    } finally {
        redisTemplate.delete(lockKey);
    }
} else {
    // 락 획득 실패 → 잠시 대기 후 캐시 재조회 (이미 갱신됐을 것)
    Thread.sleep(100);
    return getCachedDashboard();
}
```

---

## 6. 분산 락 — Redis를 락으로 쓰는 이유

### 6-1. 왜 락이 필요한가

사용자가 Commit 버튼을 빠르게 두 번 클릭하면 두 개의 HTTP 요청이 거의 동시에 서버에 도달한다.

```
요청 A: sendRawTransaction(signedTxHex) → Node에 제출 → txId 반환
요청 B: sendRawTransaction(signedTxHex) → Node에 제출 → txId 반환 or 오류
```

같은 `signedTxHex`를 두 번 제출하면 Node가 두 번째 요청을 거부한다.
하지만 거부 응답을 사용자에게 에러로 표시하거나 예외 처리를 복잡하게 만드는 것보다,
**서버에서 미리 중복 요청을 막는 것이 더 깔끔하다.**

### 6-2. JVM 내부 락 vs Redis 락

| 항목 | `synchronized` / `ReentrantLock` | Redis SET NX |
|------|----------------------------------|-------------|
| 적용 범위 | 단일 JVM 인스턴스 | 여러 서버 인스턴스 |
| Blue/Green 배포 | Blue에서 락을 잡아도 Green은 모름 | 공유 Redis에서 동일한 락 |
| 서버 재시작 | 락 사라짐 | TTL 기반 자동 만료 |

이 프로젝트는 Blue/Green 배포 구조다.
두 인스턴스가 동시에 뜰 수 있으므로 Redis 분산 락을 사용해야 한다.

### 6-3. Redis 락 구현

```java
// CommitLockService.java
@Component
@RequiredArgsConstructor
public class CommitLockService {

    private static final String LOCK_PREFIX = "lock:commit:";
    private static final Duration LOCK_TTL = Duration.ofSeconds(10);

    private final StringRedisTemplate redisTemplate;

    /**
     * 지갑 주소별 Commit 락을 획득한다.
     * 이미 진행 중인 요청이 있으면 false를 반환한다.
     */
    public boolean tryAcquire(String walletAddress) {
        String key = LOCK_PREFIX + walletAddress;
        // SET key 1 NX EX 10: 키가 없을 때만 세팅 + 10초 TTL
        Boolean acquired = redisTemplate.opsForValue()
            .setIfAbsent(key, "1", LOCK_TTL);
        return Boolean.TRUE.equals(acquired);
    }

    /**
     * Commit 처리 완료 후 락을 해제한다.
     */
    public void release(String walletAddress) {
        redisTemplate.delete(LOCK_PREFIX + walletAddress);
    }
}
```

```java
// LottoService.commit() — 락 적용
public String commit(LottoCommitRequest request) {
    String address = request.fromAddress();

    if (!commitLockService.tryAcquire(address)) {
        throw new BusinessException(ErrorCode.LOTTO_COMMIT_IN_PROGRESS);
    }

    try {
        return jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
    } finally {
        commitLockService.release(address);
    }
}
```

**핵심**: `NX`(없을 때만 성공) + `EX`(자동 만료) 조합으로 구현한다.
락 해제를 `finally`에서 보장하고, TTL은 서버 크래시 시 자동 해제 안전망이다.

---

## 7. 현재 Redis 사용 현황 — 이미 쓰고 있는 것

이 프로젝트는 인증(Auth) 영역에서 이미 Redis를 쓰고 있다.

### 7-1. `RedisAuthChallengeRepository` — 인증 챌린지 저장소

```java
// 키 패턴: auth:challenge:{challengeId}
private static final String KEY_PREFIX = "auth:challenge:";

// 저장: 챌린지 TTL까지만 보관
redisTemplate.opsForValue().set(buildKey(challenge.challengeId()), value, ttl);

// 조회 + 만료 체크
Optional<AuthChallenge> findById(String challengeId);

// 삭제: 인증 완료 시 즉시 삭제
redisTemplate.delete(buildKey(challengeId));
```

이것은 캐시가 아니라 **임시 데이터 저장소**로 사용하는 패턴이다.

**왜 DB가 아닌 Redis인가**
인증 챌린지는 5분(300초) 동안만 유효한 일회성 데이터다.
DB에 저장하면 만료된 챌린지를 주기적으로 삭제하는 스케줄러가 필요하다.
Redis는 TTL로 자동 삭제되므로 만료 관리가 필요 없다.

---

## 8. 다른 선택지와 비교 — 왜 Redis인가

### 8-1. 선택지 비교표

| 항목 | Redis | 로컬 캐시 (Caffeine) | Memcached | EhCache |
|------|-------|---------------------|-----------|---------|
| 데이터 위치 | 별도 프로세스 (네트워크) | JVM 힙 메모리 | 별도 프로세스 | JVM 힙 메모리 |
| 분산 환경 | **공유 가능** | 각 서버가 독립적 | 공유 가능 | 분산 설정 복잡 |
| 분산 락 | **SET NX로 구현** | 불가 | 불가 | 불가 |
| TTL 관리 | 기본 지원 | 기본 지원 | 기본 지원 | 기본 지원 |
| 데이터 타입 | String/Hash/List/Set/ZSet | Java 객체 | String만 | Java 객체 |
| 영속성 | RDB/AOF 옵션 | 없음 | 없음 | 없음 |
| 운영 복잡도 | 중간 (별도 프로세스) | 없음 | 중간 | 낮음 |
| Spring 통합 | spring-data-redis | Caffeine + spring-cache | 직접 설정 | 자동 설정 |

### 8-2. Caffeine(로컬 캐시)을 선택하지 않은 이유

Caffeine은 JVM 힙에 데이터를 저장하는 프로세스 내부 캐시다.
응답 속도가 Redis보다 빠르지만(네트워크 왕복 없음), 두 가지 치명적 문제가 있다.

**문제 1: Blue/Green 배포에서 캐시 불일치**
```
Blue 서버: 로컬 캐시에 dashboard = {height: 100}
Green 서버: 로컬 캐시에 dashboard = {height: 101} (새로 배포, 캐시 없음)

사용자 A → Blue → height: 100
사용자 B → Green → height: 101 (같은 시간인데 다른 응답)
```

Redis는 두 서버가 공유하므로 동일한 캐시를 본다.

**문제 2: 분산 락 불가**
Caffeine에는 `SET NX` 같은 원자적 교차-서버 락 기능이 없다.
Commit 중복 방지를 JVM 내부 락(`synchronized`)으로 구현하면 다른 서버 인스턴스에서 들어오는 요청을 막을 수 없다.

### 8-3. Memcached를 선택하지 않은 이유

Memcached는 String 타입만 지원한다.
Redis의 Hash(`HINCRBY`)로 카운터를 원자적으로 증가시키는 기능이 없다.
또한 분산 락(`SET NX`)이나 List/Set 같은 자료구조가 없어 확장성이 낮다.
Spring Data 통합도 Redis가 훨씬 풍부하다.

---

## 9. 이 프로젝트의 구체적 적용 설계

### 9-1. 캐시 키 네이밍 규칙

```
{도메인}:{구분}:{파라미터}

예:
dashboard:blockchain:10       → 대시보드, 최근 블록 10개
lotto:overview:{address}      → 지갑별 로또 개요
lotto:jackpotpool             → 잭팟 풀 (전체 공유)
stats:admin                   → 관리자 통계
lock:commit:{address}         → Commit 분산 락
lock:claim:{address}          → Claim 분산 락
auth:challenge:{challengeId}  → 인증 챌린지 (기존 사용 중)
```

### 9-2. Spring `@Cacheable` 설정 (Cache-Aside 선언적 적용)

```java
// CacheConfig.java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        Map<String, RedisCacheConfiguration> configs = new HashMap<>();

        // 대시보드: 5초 TTL
        configs.put("dashboard-blockchain",
            defaultCacheConfig().entryTtl(Duration.ofSeconds(5)));

        // 잭팟 풀: 10초 TTL
        configs.put("lotto-jackpotpool",
            defaultCacheConfig().entryTtl(Duration.ofSeconds(10)));

        // 로또 개요: 30초 TTL
        configs.put("lotto-overview",
            defaultCacheConfig().entryTtl(Duration.ofSeconds(30)));

        // 관리자 통계: 60초 TTL
        configs.put("stats-admin",
            defaultCacheConfig().entryTtl(Duration.ofSeconds(60)));

        // 교환 정보: 5분 TTL
        configs.put("exchange-info",
            defaultCacheConfig().entryTtl(Duration.ofMinutes(5)));

        return RedisCacheManager.builder(connectionFactory)
            .withInitialCacheConfigurations(configs)
            .build();
    }

    private RedisCacheConfiguration defaultCacheConfig() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .serializeValuesWith(
                RedisSerializationContext.SerializationPair.fromSerializer(
                    new GenericJackson2JsonRedisSerializer()));
    }
}
```

```java
// BlockchainQueryService.java — @Cacheable 적용
@Service
public class BlockchainQueryService {

    // 5초 캐시. 같은 파라미터 limit으로 재호출 시 Redis에서 반환
    @Cacheable(value = "dashboard-blockchain", key = "#limit")
    public BlockchainDashboardResponse getDashboard(int limit) {
        // RPC 22회 호출 → 최초 1회만 실제 호출, 이후 5초간 캐시 반환
        ...
    }
}
```

```java
// LottoService.java — @Cacheable + @CacheEvict 적용
@Service
public class LottoService {

    @Cacheable(value = "lotto-overview", key = "#address")
    public LottoOverviewResponse getOverview(String address) {
        // RPC 3회 + DB 2회 → 30초 캐시
        ...
    }

    @CacheEvict(value = "lotto-overview", key = "#request.fromAddress()")
    public String commit(LottoCommitRequest request) {
        // Commit 성공 후 해당 주소의 로또 개요 캐시 무효화
        return jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
    }

    @CacheEvict(value = "lotto-overview", key = "#request.fromAddress()")
    public String claim(LottoClaimRequest request) {
        // Claim 성공 후 해당 주소의 로또 개요 캐시 무효화
        return jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
    }
}
```

### 9-3. 전체 캐시 흐름

```
GET /api/v1/blockchain/dashboard
    │
    │  @Cacheable("dashboard-blockchain")
    ▼
Redis 조회 "dashboard-blockchain::10"
    ├─ Hit (TTL 내) ──────────────────────────────▶ 즉시 반환 (< 1ms)
    │
    └─ Miss
          │
          ▼
    RPC 22회 실행 (약 100~500ms)
          │
          ▼
    Redis 저장 (TTL 5초)
          │
          ▼
    응답 반환


POST /api/v1/lotto/commit
    │
    │  CommitLockService.tryAcquire(address)
    ▼
Redis SET NX "lock:commit:{address}" 1 EX 10
    ├─ 실패 → 이미 진행 중 → 409 CONFLICT 반환
    │
    └─ 성공
          │
          ▼
    sendRawTransaction() → Node RPC
          │
          ▼
    @CacheEvict "lotto-overview::{address}"
    Redis DELETE "lotto-overview::{address}"
          │
          ▼
    CommitLockService.release(address)
    Redis DELETE "lock:commit:{address}"
          │
          ▼
    txId 반환
```

---

## 10. 이 프로젝트에서 얻을 수 있는 결과

### 10-1. RPC 호출 횟수 감소

대시보드 TTL 5초 기준, 동시 접속자 10명이 5초마다 폴링한다고 가정하면:

| 구분 | Before | After |
|------|--------|-------|
| 5초 동안 대시보드 조회 횟수 | 10회 | 10회 |
| Node에 실제 발생하는 RPC 호출 | 10 × 22 = 220회 | **1 × 22 = 22회** |
| 절감률 | — | **90% 감소** |

### 10-2. 응답 시간 개선

| 경로 | 응답 시간 |
|------|---------|
| Cache Miss 시 (최초 1회) | 100 ~ 500ms (RPC 22회) |
| Cache Hit 시 (이후 5초간) | **< 5ms** (Redis 조회) |

### 10-3. Commit/Claim 중복 방지

분산 락 적용 후:
- 같은 지갑에서 Commit이 진행 중이면 즉시 409 반환
- Node에 같은 TX가 두 번 제출되는 상황 원천 차단
- Blue/Green 배포 중에도 보장

### 10-4. Micrometer를 통한 캐시 적중률 측정

Spring Cache + Redis 사용 시 Micrometer가 자동으로 캐시 메트릭을 수집한다.

```promql
# 캐시 적중률 (Grafana PromQL)
rate(cache_gets_total{result="hit"}[5m])
/
rate(cache_gets_total[5m]) * 100
```

→ Grafana에서 TTL 설정이 적절한지 실시간 확인 가능

---

## 11. 자주 헷갈리는 것들

**Q. 캐시와 락은 다른 개념인가?**
전혀 다르다. 캐시는 "자주 쓰는 데이터를 빠르게 돌려주는 버퍼"고, 락은 "동시에 한 요청만 처리하기 위한 제어 장치"다. 둘 다 Redis를 사용하지만 목적과 키 설계, TTL 전략이 완전히 다르다. 락과 캐시를 같은 키 네임스페이스에 섞지 않는 게 중요하다.

**Q. TTL을 길게 하면 항상 좋은가?**
아니다. TTL이 길수록 빠르지만, 데이터가 오래된 값(stale)을 보여줄 확률이 높아진다. "이 데이터가 N초 동안 틀려도 사용자에게 문제가 없는가?"를 기준으로 설정한다. 블록 높이는 5초 틀려도 괜찮지만, 사용자 자신의 Commit 결과가 틀리면 안 된다.

**Q. `@Cacheable`과 `StringRedisTemplate` 직접 사용의 차이는?**
`@Cacheable`은 선언적으로 캐시를 적용한다. 메서드 로직을 바꾸지 않아도 되고, 직렬화/역직렬화를 Spring이 처리한다. `StringRedisTemplate`은 저수준으로 Redis를 직접 제어할 때 쓴다. 인증 챌린지처럼 TTL 계산이 동적이거나 락처럼 `SET NX` 같은 특수 명령이 필요할 때는 `StringRedisTemplate`을 쓴다.

**Q. Redis가 죽으면 어떻게 되는가?**
이 프로젝트에서 Redis가 죽으면 캐시는 전부 Miss가 되어 RPC/DB를 직접 호출한다. 성능은 저하되지만 기능은 정상 동작한다. 단, 분산 락이 작동하지 않으면 Commit 중복 방지가 불가능해진다. `spring.cache.redis.enable-statistics: false` 외에 Redis 다운 시 캐시 미스로 처리하는 기본 동작은 `spring.data.redis.timeout` 설정으로 빠른 실패(fast-fail)를 보장해야 한다.

**Q. 같은 캐시를 여러 메서드에서 무효화해야 할 때?**
`@CacheEvict(allEntries = true)`로 특정 캐시의 모든 키를 삭제하거나, `@Caching(evict = {...})`로 여러 캐시를 한 번에 무효화한다.
```java
@Caching(evict = {
    @CacheEvict(value = "lotto-overview", key = "#request.fromAddress()"),
    @CacheEvict(value = "stats-admin", allEntries = true)
})
public String commit(LottoCommitRequest request) { ... }
```

---

## 12. 포트 및 인프라 정리

| 서비스 | 포트 | 용도 |
|--------|------|------|
| Redis | 6379 (내부) / 16379 (로컬 호스트) | Spring Boot ↔ Redis |

**설정 위치**
```yaml
# application-local.yml
spring:
  data:
    redis:
      host: ${SPRING_DATA_REDIS_HOST:localhost}
      port: ${SPRING_DATA_REDIS_PORT:6379}
```

**Redis CLI로 확인**
```bash
# 컨테이너 내부 접속
docker exec -it jc-redis-local redis-cli

# 현재 저장된 키 조회
KEYS *

# 특정 키 값 확인
GET "dashboard-blockchain::10"

# TTL 확인
TTL "dashboard-blockchain::10"

# 분산 락 상태 확인
EXISTS "lock:commit:jack1abc..."
```

---

## 13. 이 문서와 연결된 파일들

| 파일 | 역할 |
|------|------|
| `docker-compose.local.yml` | Redis 컨테이너 설정 (포트 16379:6379) |
| `BE-ssatto/src/main/resources/application-local.yml` | Redis 연결 설정 |
| `BE-ssatto/src/main/java/.../auth/repository/RedisAuthChallengeRepository.java` | 인증 챌린지 Redis 저장소 (기존 사용 중) |
| `BE-ssatto/src/main/java/.../blockchain/service/BlockchainQueryService.java` | 대시보드 조회 — 캐시 적용 대상 |
| `BE-ssatto/src/main/java/.../lotto/service/LottoService.java` | 로또 개요, Commit/Claim — 캐시 + 락 적용 대상 |
| `monitoring/grafana/provisioning/dashboards/spring-overview.json` | Micrometer 캐시 적중률 패널 추가 가능 |
