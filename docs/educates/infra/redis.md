# Redis — JackpotChain 캐시 전략과 임시 저장소

> 작성일: 2026-03-26
> 기준: `docker-compose.local.yml`, `docker-compose.prod.yml`, `application.yml`, `RedisAuthChallengeRepository.java`

---

## 1. 왜 Redis인가 — 문제부터 시작하기

JackpotChain 백엔드의 대시보드 API를 보면 단일 요청 하나가 RPC를 22회 이상 호출한다.

```
GET /api/v1/blockchain/dashboard
    → getBlockchainInfo()    (1회)
    → getPeerInfo()          (1회)
    → getBlockHash() × 10   (10회)
    → getBlock()     × 10   (10회)
    합계: 22회 RPC
```

블록은 수십 초에 한 번 생성된다. 5초마다 폴링하는 사용자 10명이 있으면 초당 44회 RPC가 Node에 쏟아진다. 블록이 생성되지도 않았는데 같은 데이터를 22번 다시 가져오는 것은 명백한 낭비다.

**해결의 핵심**: 짧은 시간 동안 변하지 않는 데이터를 메모리에 보관해 두고, 다음 요청이 오면 RPC 없이 즉시 돌려준다.

이것이 Redis가 이 프로젝트에 들어온 이유다.

> **In-Memory Store:** 모든 데이터를 RAM에 저장하는 키-값 저장소. 디스크 I/O가 없으므로 응답 시간이 마이크로초(μs) ~ 1ms 수준이다. 반면 PostgreSQL 쿼리는 수 ms, RPC는 수십 ms가 기본이다.

---

## 2. Memcached도 있는데 왜 Redis인가

후보는 세 가지였다: Redis, Memcached, 로컬 캐시(Caffeine).

### Memcached를 선택하지 않은 이유

Memcached는 String 타입만 지원한다. 이 프로젝트에는 두 가지 추가 요구사항이 있다.

첫째, 관리자 통계 카운터를 원자적으로 증가시켜야 한다. Redis의 `HINCRBY` 명령은 Hash 타입의 특정 필드를 원자적으로 증가시킨다. Memcached에는 이 기능이 없다.

둘째, Blue/Green 배포 환경에서 Commit 중복 방지 락이 필요하다. Redis의 `SET NX`(없을 때만 세팅)는 원자적 분산 락을 구현한다. Memcached에는 원자적 `add` 명령이 있지만 TTL 관리와 Spring 통합이 훨씬 빈약하다.

### 로컬 캐시(Caffeine)를 선택하지 않은 이유

Caffeine은 네트워크 왕복 없이 JVM 힙에서 바로 읽으므로 Redis보다 빠르다. 그러나 Blue/Green 배포 구조에서 치명적 문제가 생긴다.

```
Blue 서버:  로컬 캐시 → dashboard = {height: 100}
Green 서버: 로컬 캐시 → dashboard = {height: 101} (캐시 워밍 전)

사용자 A → Nginx가 Blue로 라우팅 → height: 100
사용자 B → Nginx가 Green으로 라우팅 → height: 101
(같은 시각, 같은 API, 다른 응답)
```

`docker-compose.prod.yml`에는 `spring-blue`(포트 8090)와 `spring-green`(포트 8092)가 공존한다. 두 인스턴스가 Redis 하나를 공유하면 이 불일치 문제가 사라진다.

분산 락도 마찬가지다. `synchronized`는 단일 JVM에만 유효하다. 서로 다른 인스턴스에서 들어오는 중복 Commit 요청은 막을 수 없다.

### Redis의 핵심 장점 3가지

| 특징 | 의미 | 이 프로젝트의 이유 |
|------|------|------------------|
| In-Memory | 디스크 I/O 없음 → μs 응답 | RPC 22회를 캐시 1회로 대체 |
| TTL 네이티브 | 키마다 만료 시간 설정, 자동 삭제 | 만료 스케줄러 불필요 |
| 원자적 연산 | SET NX, HINCRBY 등 단일 명령이 원자적 | 분산 락, 중복 방지 |

---

## 3. 두 가지 사용 패턴

이 프로젝트에서 Redis는 두 가지 방식으로 쓰인다.

### 3-1. Challenge Store — 인증 챌린지 임시 저장

`RedisAuthChallengeRepository.java`가 이미 운영 중인 패턴이다.

```java
// 키 패턴: auth:challenge:{challengeId}
private static final String KEY_PREFIX = "auth:challenge:";

// 저장: 챌린지 만료 시간까지만 보관
Duration ttl = Duration.between(LocalDateTime.now(), challenge.expiresAt());
stringRedisTemplate.opsForValue().set(buildKey(challenge.challengeId()), value, ttl);

// 조회: 없으면 Optional.empty()
String value = stringRedisTemplate.opsForValue().get(buildKey(challengeId));

// 삭제: 인증 완료 즉시 제거 (단 1회 사용 보장)
stringRedisTemplate.delete(buildKey(challengeId));
```

`application.yml`에 설정된 TTL은 300초(5분)다.

```yaml
auth:
  challenge-ttl-seconds: 300
```

**왜 DB가 아닌 Redis인가**: 인증 챌린지는 5분짜리 일회성 데이터다. PostgreSQL에 저장하면 만료된 챌린지를 주기적으로 삭제하는 스케줄러가 필요하다. Redis의 TTL은 이 관리 부담을 없앤다.

**왜 단 1회만 사용해야 하는가**: 챌린지를 재사용할 수 있으면 공격자가 캡처한 챌린지-서명 쌍을 다시 제출해 인증을 통과할 수 있다. 이것이 **재생 공격(Replay Attack)**이다.

> **재생 공격(Replay Attack):** 이전에 유효했던 요청을 캡처해 그대로 재전송하는 공격. 서버가 "이미 사용된 챌린지"를 기억하지 않으면, 과거에 성공한 인증 요청을 그대로 재전송해 인증을 우회할 수 있다. `delete(challengeId)` 호출로 챌린지를 즉시 폐기하면 동일한 챌린지로 두 번째 요청이 들어왔을 때 Redis에 아무것도 없어 인증이 실패한다.

### 3-2. Cache-Aside — RPC 응답 캐싱

대시보드, 잭팟 풀 같은 RPC 조회 결과를 캐시하는 패턴이다.

> **Cache-Aside 패턴:** 애플리케이션이 직접 캐시를 관리하는 전략. 조회 요청이 오면 먼저 캐시를 확인하고(Hit이면 즉시 반환), 없으면(Miss) 원본 소스에서 가져온 뒤 캐시에 저장한다. 캐시가 원본과 별개로 동작하므로 캐시가 없어도 서비스는 느려질 뿐 중단되지 않는다(Graceful Degradation).

```
조회 요청
    │
    ▼
Redis 확인 ──▶ Hit  → 즉시 반환 (< 1ms)
    │
   Miss
    │
    ▼
RPC 22회 호출 → 응답 조합
    │
    ▼
Redis에 저장 (TTL 설정)
    │
    ▼
응답 반환
```

`BlockchainQueryService.getDashboard()`는 현재 캐시 없이 매번 RPC를 호출한다. Cache-Aside를 적용하면 다음과 같이 바뀐다.

```java
// Cache-Aside 적용 예시
public BlockchainDashboardResponse getDashboard(int limit) {
    String cacheKey = "dashboard:blockchain:" + limit;

    // 1. 캐시 확인
    String cached = redisTemplate.opsForValue().get(cacheKey);
    if (cached != null) {
        return objectMapper.readValue(cached, BlockchainDashboardResponse.class);
    }

    // 2. 캐시 미스 → RPC 22회 호출
    BlockchainDashboardResponse response = fetchFromRpc(limit);

    // 3. 결과를 Redis에 5초 TTL로 저장
    redisTemplate.opsForValue().set(
        cacheKey,
        objectMapper.writeValueAsString(response),
        Duration.ofSeconds(5)
    );

    return response;
}
```

Spring의 `@Cacheable` 어노테이션을 쓰면 이 패턴을 선언적으로 표현할 수 있다.

```java
@Cacheable(value = "dashboard-blockchain", key = "#limit")
public BlockchainDashboardResponse getDashboard(int limit) {
    // 캐시 미스 시에만 실행됨
    return fetchFromRpc(limit);
}
```

---

## 4. TTL 전략 — 왜 데이터마다 다른가

TTL을 하나로 통일하지 않는 이유는 데이터마다 "얼마나 낡아도 허용할 수 있는가"가 다르기 때문이다.

| 데이터 | 변화 주기 | 적용 TTL | 근거 |
|--------|---------|---------|------|
| 블록 높이, 최근 블록 목록 | 블록 생성 간격 (수십 초) | 5초 | 사용자가 5초 지연 허용 가능 |
| 피어 수, 잭팟 풀 잔액 | 블록 생성마다 소폭 변화 | 10초 | 실시간성 낮음, 블록 생성보다 짧은 TTL |
| 로또 개요 (totalEntries) | Commit 발생 시 | 30초 | 집계 수치는 실시간 불필요 |
| 관리자 통계 (오늘 Commit 수) | Commit 발생 시 | 60초 | 관리자 화면은 지연 허용 |
| 교환 정보 (jack_per_pot) | 거의 변하지 않음 | 5분 | 운영자가 직접 변경하는 설정값 |
| 인증 챌린지 | 1회 사용 후 즉시 폐기 | 300초 (상한) | 발급 후 5분 내 서명하지 않으면 만료 |

TTL이 너무 짧으면: 캐시 미스가 자주 발생해 RPC 부하가 줄지 않는다.
TTL이 너무 길면: 블록이 새로 생성됐어도 낡은 데이터를 계속 제공한다(stale data).

**TTL만으로 해결이 안 되는 케이스**: Commit 직후 사용자가 자신의 참여 내역을 바로 볼 수 있어야 한다. 30초 TTL을 기다릴 수 없으므로 `@CacheEvict`로 Commit 성공 즉시 해당 캐시를 삭제한다.

```java
@CacheEvict(value = "lotto-overview", key = "#request.fromAddress()")
public String commit(LottoCommitRequest request) {
    return jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
}
```

---

## 5. 프로덕션 Redis 설정

`docker-compose.prod.yml`의 Redis 서비스 설정이다.

```yaml
redis:
  image: redis:7-alpine
  container_name: jc-redis-prod
  restart: unless-stopped
  networks:
    - prod-net
  command: >
    redis-server
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
  volumes:
    - redis-prod-data:/data
  healthcheck:
    test: ["CMD-SHELL", "redis-cli -a ${REDIS_PASSWORD} ping | grep PONG"]
    interval: 10s
    timeout: 3s
    retries: 3
```

**`--requirepass`**: 패스워드 없이는 접속 불가. 내부 Docker 네트워크(`prod-net`)에서만 접근 가능하지만 추가 방어선이다.

**`--maxmemory 256mb`**: Redis가 사용할 수 있는 메모리 상한. 이를 넘으면 아래 정책에 따라 키를 제거한다.

**`--maxmemory-policy allkeys-lru`**: 메모리 상한에 도달하면 가장 오래 사용되지 않은 키(LRU: Least Recently Used)를 먼저 제거한다.

> **LRU(Least Recently Used) 정책:** 캐시 공간이 부족할 때 가장 오랫동안 조회되지 않은 항목을 제거하는 알고리즘. 자주 쓰이는 데이터는 살아남고, 드물게 쓰이는 데이터가 먼저 밀려나므로 실제 사용 패턴에 잘 맞는다. `allkeys-lru`는 TTL 설정 여부에 관계없이 모든 키를 대상으로 LRU를 적용한다.

로컬 환경(`docker-compose.local.yml`)에서는 `command`가 없어 패스워드와 메모리 제한 없이 기본값으로 실행된다.

---

## 6. Redis 단일 스레드 모델 — 왜 빠른가

Redis는 기본적으로 단일 스레드로 명령을 처리한다. 직관적으로 멀티 스레드가 더 빠를 것 같지만 Redis가 빠른 이유는 다른 데 있다.

모든 데이터가 메모리에 있으므로 연산 자체가 극히 짧다. CPU 연산 시간이 나노초 단위이기 때문에 스레드 전환 오버헤드나 락 경쟁이 오히려 더 비싸다. 단일 스레드는 이 경쟁 자체를 제거한다.

또한 Redis는 네트워크 I/O를 이벤트 루프(epoll/kqueue) 방식으로 처리해 수천 개의 연결을 블로킹 없이 다룬다.

실제 병목은 CPU가 아니라 네트워크 대역폭이다. 초당 100만 건의 단순 GET/SET 처리에 단일 코어로도 충분하다.

> **이벤트 루프(Event Loop):** I/O 완료를 기다리는 대신, I/O가 준비됐다는 OS 알림을 받아 처리하는 비동기 패턴. Node.js와 같은 원리다. 각 연결마다 스레드를 만드는 방식보다 스레드 수와 메모리를 줄일 수 있다.

---

## 7. Cache Stampede 문제

> **Cache Stampede(캐시 스탬피드):** TTL이 만료된 직후 동시에 여러 요청이 쏟아지면 모두 캐시 미스가 되어 동시에 백엔드(RPC/DB)를 호출하는 현상. Thundering Herd라고도 한다.

```
t=0: Redis에 캐시 저장 (TTL 5초)
t=5: TTL 만료 → 동시 요청 10개 → 전부 Miss
       → 10개 요청이 모두 동시에 RPC 22회씩 호출
       → 10 × 22 = 220회 RPC가 Node에 폭발
t=5+: 10개가 각자 캐시를 갱신 → 9번은 중복 갱신
```

완전한 해결책은 Redis 분산 락으로 한 요청만 RPC를 수행하게 만드는 것이다.

```java
String lockKey = "lock:cache:dashboard";
Boolean acquired = redisTemplate.opsForValue()
    .setIfAbsent(lockKey, "1", Duration.ofSeconds(3));

if (Boolean.TRUE.equals(acquired)) {
    try {
        refreshDashboardCache(); // 이 요청만 RPC 수행
    } finally {
        redisTemplate.delete(lockKey);
    }
} else {
    // 락 획득 실패 → 잠시 대기 후 재조회 (이미 다른 요청이 갱신 중)
    Thread.sleep(100);
    return getCachedDashboard();
}
```

이 프로젝트의 현실적 규모(동시 접속자 수십 명)에서는 스탬피드가 빈번하지 않다. 단순하게 시작하고 Grafana에서 Cache Miss Rate가 높게 관측될 때 적용한다.

---

## 8. Redis 영속성 트레이드오프

Redis는 두 가지 영속성 옵션을 제공한다.

> **RDB (Redis Database Backup):** 주기적으로 메모리 전체를 디스크에 스냅샷으로 저장하는 방식. 파일 크기가 작고 복구가 빠르지만, 마지막 스냅샷 이후의 데이터는 유실된다.

> **AOF (Append-Only File):** 모든 쓰기 명령을 로그 파일에 순서대로 기록하는 방식. 장애 직전까지의 데이터를 복구할 수 있지만 파일이 커지고 재시작 시 리플레이 시간이 길다.

이 프로젝트는 **영속성이 불필요**하다. Redis가 저장하는 데이터는 두 종류뿐이다.

- 캐시 데이터: Redis가 재시작되면 캐시 미스가 발생하고 RPC가 다시 채운다. 느려질 뿐 데이터가 유실되지 않는다.
- 인증 챌린지: 5분짜리 일회성 토큰이다. 재시작 시 진행 중이던 로그인 세션이 끊기지만 사용자가 다시 로그인하면 된다.

영속성을 활성화하면 디스크 I/O가 생겨 응답 시간이 올라가고, 스냅샷 과정에서 메모리를 두 배로 쓸 수 있다. 이 프로젝트에서 얻는 이익이 없으므로 기본값(RDB만 최소 활성화)을 그대로 쓴다.

---

## 9. Redis를 쓰면 안 되는 상황

Redis가 만능은 아니다. 아래 케이스에는 적합하지 않다.

| 상황 | 이유 |
|------|------|
| 영속해야 하는 비즈니스 데이터 | 메모리 한계, 장애 시 유실 위험 |
| 수십 MB 이상의 대용량 값 | 메모리 고갈, 직렬화/역직렬화 오버헤드 |
| 복잡한 조건 검색, JOIN | Redis에는 SQL이 없다. 단순 키 조회만 가능 |
| 강한 일관성이 필요한 트랜잭션 | Redis 트랜잭션(MULTI/EXEC)은 DB 수준의 ACID를 보장하지 않는다 |

지갑 잔액, 트랜잭션 내역 같은 데이터는 PostgreSQL에 있어야 한다. Redis는 "빠른 임시 저장소"로만 사용한다.

---

## 면접 Q&A

**Q1. Cache-Aside, Write-Through, Write-Behind의 차이를 설명하고, 이 프로젝트에서 Cache-Aside를 선택한 이유는?**

Cache-Aside는 애플리케이션이 직접 캐시를 관리한다. 조회 시 미스가 나면 원본에서 읽어 캐시에 저장한다. 쓰기 시에는 DB만 업데이트하고 캐시는 TTL로 자연히 만료되거나 `@CacheEvict`로 명시적으로 제거한다.

Write-Through는 쓰기 시 DB와 캐시를 동시에 업데이트한다. 캐시가 항상 최신 상태지만, 조회되지도 않는 데이터까지 캐시에 올라가 메모리를 낭비한다.

Write-Behind는 쓰기를 캐시에만 먼저 하고 DB 반영은 비동기로 지연한다. 응답이 빠르지만 캐시 장애 시 데이터가 유실된다.

이 프로젝트에서 Cache-Aside를 선택한 이유는 세 가지다. 첫째, 캐싱 대상이 모두 읽기 전용 RPC 조회다. 쓰기 경로가 없으므로 Write-Through/Write-Behind가 끼어들 여지가 없다. 둘째, 캐시 미스가 나도 RPC를 호출하면 그만이므로 Graceful Degradation이 자연스럽다. 셋째, 구현이 가장 단순하다.

---

**Q2. Cache Stampede는 어떤 문제이고 어떻게 해결하는가?**

TTL이 만료된 직후 동시에 N개의 요청이 쏟아지면 모두 캐시 미스가 되어 N개가 동시에 RPC를 호출한다. 대시보드 TTL 5초, 동시 요청 10개라면 10 × 22 = 220회 RPC가 순간 폭발한다.

해결책은 Redis 분산 락을 활용해 첫 번째 요청만 RPC를 수행하게 하는 것이다. `SET lock:cache:dashboard 1 NX EX 3`으로 락을 잡은 요청만 RPC를 실행하고, 락 획득에 실패한 요청은 100ms 대기 후 캐시를 재조회한다(이미 갱신됐을 것이다).

다른 방법으로 Probabilistic Early Expiration이 있다. TTL이 남았어도 확률적으로 미리 갱신하는 방식이다. 구현이 복잡하므로 이 프로젝트 규모에서는 분산 락 방식을 우선 고려한다.

---

**Q3. 인증 챌린지를 단 1회만 쓰는 이유는? Redis의 delete가 원자성을 보장하는가?**

챌린지를 재사용 가능하게 두면 재생 공격(Replay Attack)에 취약해진다. 공격자가 정상 사용자의 챌린지-서명 교환을 네트워크에서 캡처한 뒤 동일한 요청을 재전송하면 서버는 유효한 서명으로 판단해 인증을 통과시킨다. `delete(challengeId)`로 인증 성공 즉시 챌린지를 폐기하면 같은 챌린지로 두 번째 요청이 들어와도 Redis에 아무것도 없어 인증이 실패한다.

Redis의 단일 명령은 원자적으로 실행된다. 그러나 `findById` 후 `delete`의 두 명령 조합은 원자적이지 않다. 이 사이에 두 번째 요청이 `findById`를 수행할 수 있다. 완전한 단일 사용 보장을 위해서는 `GETDEL` 명령(Redis 6.2+) 또는 Lua 스크립트로 조회와 삭제를 원자적으로 묶어야 한다. 현재 구현은 챌린지가 이미 만료 체크를 포함하고, 인증 성공 후 삭제하므로 실용적 수준에서는 안전하다.

---

**Q4. Redis의 eviction 정책은 어떤 것들이 있고, 이 프로젝트에서 `allkeys-lru`를 선택한 이유는?**

Redis의 주요 eviction 정책은 다음과 같다.

- `noeviction`: 메모리 초과 시 에러 반환. 데이터를 절대 잃으면 안 될 때.
- `allkeys-lru`: TTL 여부에 관계없이 전체 키 중 LRU 제거.
- `volatile-lru`: TTL이 설정된 키 중 LRU 제거. TTL 없는 키는 절대 제거 안 함.
- `allkeys-random`: 무작위 제거.
- `volatile-ttl`: TTL이 가장 짧게 남은 키 먼저 제거.

이 프로젝트에서 `allkeys-lru`를 선택한 이유는, Redis에 저장되는 모든 데이터(캐시, 챌린지, 락)가 휘발성이기 때문이다. 메모리가 차면 가장 오래 쓰이지 않은 캐시부터 제거해 공간을 확보하는 것이 가장 자연스럽다. `volatile-lru`를 쓰면 TTL 없는 키(예: 분산 락)는 메모리에서 절대 제거되지 않아 메모리 누수가 될 수 있다.

---

**Q5. Redis가 다운되면 어떻게 되는가? 이 프로젝트는 어떻게 대응하는가?**

Cache-Aside 패턴의 장점은 Graceful Degradation이다. Redis가 없으면 캐시 미스가 계속 발생해 모든 요청이 RPC를 직접 호출한다. 서비스는 느려지지만 중단되지 않는다.

단, 인증 챌린지는 Redis에 저장되므로 Redis 다운 시 신규 로그인이 불가하다. 이미 로그인된 사용자는 JWT로 계속 사용할 수 있다. 분산 락도 Redis가 없으면 동작하지 않아 중복 Commit 방지가 실패할 수 있다. 이 경우 Node 레벨에서 이미 제출된 TX를 거부하므로 이중 지출은 막힌다.

`docker-compose.prod.yml`에서 backend 서비스는 `condition: service_healthy`로 Redis 헬스체크 통과 후에 기동한다. 따라서 시작 시점에 Redis 없이 뜨는 경우는 없다. 운영 중 Redis 재시작은 `restart: unless-stopped` 정책으로 자동 복구된다.

---

**Q6. TTL이 너무 짧으면, 너무 길면 각각 어떤 문제가 생기는가?**

TTL이 너무 짧으면 캐시가 거의 항상 만료 상태라 Cache Miss가 빈번하다. 캐시를 둔 의미가 없고, RPC 부하는 줄지 않는다. 또한 TTL 만료가 빈번할수록 Cache Stampede 위험이 높아진다.

TTL이 너무 길면 실제 데이터가 변했는데도 낡은 데이터(stale data)를 오랫동안 제공한다. 예를 들어 TTL을 10분으로 잡으면 새 블록이 생성된 지 10분이 지나도 이전 블록 높이를 보여준다. 사용자 신뢰를 잃는다.

적절한 TTL은 "이 데이터가 얼마나 자주 바뀌는가"와 "사용자가 얼마나 오래된 데이터를 허용하는가"의 균형점이다. 블록 높이는 5초(사용자가 실시간에 민감), 교환 비율은 5분(거의 변하지 않음)으로 차등 설정한 이유다.

---

**Q7. Redis 단일 스레드인데 다수의 동시 연결을 어떻게 처리하는가? 병목이 어디서 생기는가?**

Redis는 네트워크 I/O를 비동기 이벤트 루프(epoll/kqueue)로 처리한다. 수천 개의 TCP 연결을 하나의 스레드로 다루며, 각 연결에서 읽기/쓰기 가능 이벤트가 발생하면 즉시 처리한다.

명령 처리 자체는 메모리 연산이라 나노초 단위다. 단일 스레드로도 초당 100만 건 이상의 단순 GET/SET을 처리할 수 있다.

병목은 CPU가 아니라 네트워크 대역폭과 명령 크기다. 값이 크면(수 MB) 직렬화/역직렬화와 네트워크 전송이 병목이 된다. 또한 `KEYS *` 같은 O(N) 명령은 전체 키를 순회하는 동안 다른 명령을 처리하지 못해 블로킹된다. 프로덕션에서는 `SCAN`으로 대체해야 한다.
