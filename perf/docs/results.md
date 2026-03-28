# JackpotChain 성능 개선 결과 보고서

> 테스트 조건: 200 VU (dashboard 100 + lotto_overview 50 + lotto_entries 50), 5분, limit=10
> 목표: 전 시나리오 p95 < 500ms, 실패율 < 1%

---

## 최종 결과 요약

| 시나리오 | Before p95 | After p95 | 개선율 | 목표 |
|---------|-----------|---------|-------|------|
| dashboard | 9,847ms | **106ms** | -98.9% | ✅ PASS |
| lotto_overview | 4,232ms | **134ms** | -96.8% | ✅ PASS |
| lotto_entries | 6,790ms | **280ms** | -95.9% | ✅ PASS |

---

## Phase 1 — 기준선 측정: "얼마나 느린가?"

**결과 파일:** `perf/results/baseline_read_20260327_011622.json`

코드 수정 없이 순정 상태에서 측정했다.

| 시나리오 | avg | p95 | p99 | 실패율 |
|---------|-----|-----|-----|--------|
| dashboard | 8,627ms | 9,847ms | 10,018ms | 0% |
| lotto_overview | 3,149ms | 4,232ms | 4,681ms | 84.5% |
| lotto_entries | 3,596ms | 6,790ms | 8,690ms | 95.1% |

### 무슨 일이 벌어지고 있었나

**dashboard가 요청 한 건에 9초씩 걸리는 이유:**

`GET /api/v1/blockchain/dashboard` 한 번의 요청이 블록체인 노드에 RPC를 무려 23번 직렬로 호출하고 있었다.

```
요청 1건 = RPC 23회 직렬 호출
─────────────────────────────────────────
getBlockchainInfo()           × 1회
getPeerInfo()                 × 1회
getMempoolTransactionCount()  × 1회
getBlockHash(height)          × 10회  ← 최근 10개 블록 각각
getBlock(hash)                × 10회  ← 블록 해시로 상세 조회
─────────────────────────────────────────
합계: 23회, 모두 직렬, 캐시 없음
```

RPC 1회에 수십~수백 ms가 걸리니 23번이면 당연히 수 초가 쌓인다.

**lotto가 84~95% 실패하는 이유:**

dashboard가 느린 것이 lotto까지 망치고 있었다. 서버는 DB 커넥션 풀(`HikariPool`)을 10개만 가지고 있었는데, dashboard 100 VU가 각각 9초씩 DB 커넥션을 물고 늘어지니 lotto 요청이 커넥션을 얻으려고 3초를 기다리다 타임아웃이 나서 HTTP 500을 반환했다.

```
실제 서버 로그:
HikariPool-1 - Connection is not available,
request timed out after 3001ms
(total=10, active=10, idle=0, waiting=49)
```

---

## Phase 2 — RPC HTTP 커넥션 풀 적용: "TCP 재사용"

**결과 파일:** `perf/results/baseline_read_20260327_215153.json`

### 문제

RPC 클라이언트가 `SimpleClientHttpRequestFactory`를 쓰고 있었다. 이 클래스는 RPC를 호출할 때마다 **새로운 TCP 소켓을 만들고 닫는다.** dashboard 100 VU × 23 RPC = 초당 수천 개의 TCP 소켓이 생성/소멸되고 있었다.

### 수정한 파일

**[1] `BE-ssatto/build.gradle`** — Apache HttpClient 5 의존성 추가

```groovy
// 추가
implementation 'org.apache.httpcomponents.client5:httpclient5:5.3.1'
```

**[2] `BE-ssatto/src/main/java/.../rpc/JackpotChainHttpRpcClient.java`** — 커넥션 풀 적용

생성자에서 HTTP 클라이언트를 만드는 방식을 교체했다.

```java
// Before: 요청마다 새 소켓 생성
SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();

// After: 소켓을 최대 200개까지 재사용하는 풀 구성
CloseableHttpClient httpClient = HttpClients.custom()
    .setConnectionManager(PoolingHttpClientConnectionManagerBuilder.create()
        .setMaxConnTotal(200)
        .setMaxConnPerRoute(200)
        .build())
    .setDefaultRequestConfig(RequestConfig.custom()
        .setConnectTimeout(Timeout.ofMilliseconds(properties.getConnectTimeoutMs()))
        .setResponseTimeout(Timeout.ofMilliseconds(properties.getReadTimeoutMs()))
        .build())
    .build();
HttpComponentsClientHttpRequestFactory requestFactory =
    new HttpComponentsClientHttpRequestFactory(httpClient);
```

### 결과

| 시나리오 | Before p95 | Phase 2 p95 | 개선 |
|---------|-----------|------------|------|
| dashboard | 9,847ms | 9,206ms | -641ms (-6.5%) |
| lotto_overview | 4,232ms | 4,169ms | -63ms (-1.5%) |
| lotto_entries | 6,790ms | 6,569ms | -221ms (-3.3%) |

### 분석

기대보다 효과가 미미했다. TCP 소켓 재사용으로 연결 오버헤드는 줄었지만, **근본 원인인 "직렬 RPC 23회" 자체는 그대로**였기 때문이다. dashboard가 여전히 9초를 점유하니 lotto 500 에러도 계속됐다.

---

## Phase 3 — 확정 블록 데이터 Redis 캐싱: "이미 아는 것은 다시 묻지 않는다"

**결과 파일:** `perf/results/baseline_read_20260328_010604.json` (Phase 4와 동시 측정)

### 문제

`getBlockHash(height)`, `getBlock(hash)` — 이 두 함수가 dashboard 23번 RPC 중 20번을 차지한다.

그런데 블록체인의 블록은 **한 번 확정되면 절대 변하지 않는다.** 높이 1000번 블록의 해시와 내용은 영원히 동일하다. 그런데도 100 VU가 매 요청마다 노드에 똑같은 질문을 반복하고 있었다.

### 수정한 파일

**[1] `BE-ssatto/src/main/java/.../global/config/CacheConfig.java`** — 신규 생성

Redis 캐시 설정 파일이 아예 없었다. Redis 인프라는 있었지만 캐시로는 사용하지 않고 있던 것이다.

```java
@EnableCaching          // Spring 캐시 기능 활성화
@Configuration
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // Java 8 날짜 타입(LocalDateTime 등) 직렬화 지원
        ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .activateDefaultTyping(   // 역직렬화 시 타입 정보 보존
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.EVERYTHING,
                JsonTypeInfo.As.PROPERTY
            );

        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
            .serializeKeysWith(...)
            .serializeValuesWith(...);

        return RedisCacheManager.builder(connectionFactory)
            .withInitialCacheConfigurations(Map.of(
                "blockHash", base.entryTtl(Duration.ofMinutes(10)),  // 블록 해시: 불변 → 10분
                "block",     base.entryTtl(Duration.ofMinutes(10)),  // 블록 내용: 불변 → 10분
                "dashboard", base.entryTtl(Duration.ofSeconds(3))    // (Phase 4에서 사용)
            ))
            .build();
    }
}
```

**[2] `BE-ssatto/src/main/java/.../rpc/JackpotChainHttpRpcClient.java`** — `@Cacheable` 어노테이션 추가

```java
@Cacheable(value = "blockHash", key = "#height")
@Override
public String getBlockHash(long height) { ... }
// → 같은 height로 두 번째 요청부터는 RPC 호출 없이 Redis에서 즉시 반환

@Cacheable(value = "block", key = "#blockHash")
@Override
public JackpotChainBlock getBlock(String blockHash) { ... }
// → 같은 블록 해시로 두 번째 요청부터는 RPC 호출 없이 Redis에서 즉시 반환
```

---

## Phase 4 — Dashboard 응답 전체 캐싱: "RPC 0회"

**결과 파일:** `perf/results/baseline_read_20260328_010604.json` (Phase 3과 동시 측정)

### 문제

Phase 3으로 블록 데이터를 캐시해도, dashboard 요청은 여전히 `getBlockchainInfo`, `getPeerInfo`, `getMempoolTransactionCount` 3번의 RPC는 매번 날리고 있었다. 또한 TTL 3초 이내 같은 `limit` 값으로 오는 요청은 결과가 동일하다.

### 수정한 파일

**`BE-ssatto/src/main/java/.../service/BlockchainQueryService.java`** — `@Cacheable` 추가

```java
@Cacheable(value = "dashboard", key = "#limit")   // 추가된 한 줄
public BlockchainDashboardResponse getDashboard(int limit) {
    JackpotChainBlockchainInfo blockchainInfo = jackpotChainRpcClient.getBlockchainInfo();
    List<JackpotChainPeerInfo> peerInfos = jackpotChainRpcClient.getPeerInfo();
    int mempoolTransactionCount = jackpotChainRpcClient.getMempoolTransactionCount();
    List<BlockchainDashboardBlockResponse> blocks = getRecentBlocks(...);
    return new BlockchainDashboardResponse(...);
}
```

TTL 3초로 설정했다. 즉 **3초에 1번만 RPC를 실제로 호출하고**, 그 사이 100 VU가 요청을 아무리 많이 보내도 Redis에서 즉시 응답한다.

### Phase 3+4 합산 결과

| 시나리오 | p95 | 실패율 | 목표 |
|---------|-----|--------|------|
| dashboard | **35ms** | 0% | ✅ PASS |
| lotto_overview | 3,029ms | 73.3% | FAIL |
| lotto_entries | 5,389ms | 79.2% | FAIL |

dashboard는 9,847ms → **35ms** (약 **280배** 개선)로 목표를 달성했다.

그러나 lotto는 여전히 500 에러가 나고 있었다. 원인이 바뀐 것이다. 이제 dashboard가 DB 커넥션을 점유하지 않으니, **lotto VU 100개(50+50) 자체가 HikariPool 10개를 초과 요청**하는 것이 문제가 됐다.

---

## Phase 5 — HikariPool 증설: "병목이 이동했다"

**결과 파일:** `perf/results/baseline_read_20260328_181506.json`

### 문제

Phase 3+4 이후 lotto 요청의 500 에러 원인이 달라졌다. 이전에는 dashboard 때문에 커넥션이 모자랐지만, 이제는 **lotto 자신들이 DB 커넥션을 고갈시키고 있었다.**

- lotto_overview 50 VU + lotto_entries 50 VU = 동시 DB 요청 100개
- HikariPool 최대 커넥션 10개
- 90개가 대기 → 3초 타임아웃 → HTTP 500

### 수정한 파일

**`BE-ssatto/src/main/resources/application-local.yml`** — 풀 크기 조정

```yaml
# Before
hikari:
  maximum-pool-size: 10

# After
hikari:
  maximum-pool-size: 50
```

한 줄 변경으로 동시에 처리할 수 있는 DB 요청 수를 5배 늘렸다.

### 최종 결과

| 시나리오 | avg | p95 | p99 | 실패율 | 목표 |
|---------|-----|-----|-----|--------|------|
| dashboard | 29ms | **106ms** | 598ms | 0% | ✅ PASS |
| lotto_overview | 37ms | **134ms** | 644ms | 0% | ✅ PASS |
| lotto_entries | 69ms | **280ms** | 951ms | 0% | ✅ PASS |

**전 시나리오 목표 달성.**

---

## 변경된 파일 전체 목록

| 파일 | 변경 유형 | 핵심 내용 |
|------|---------|---------|
| `BE-ssatto/build.gradle` | 의존성 추가 | `httpclient5:5.3.1` |
| `BE-ssatto/src/main/resources/application-local.yml` | 값 변경 | HikariPool `maximum-pool-size: 10 → 50` |
| `.../rpc/JackpotChainHttpRpcClient.java` | 클래스 수정 | `SimpleClientHttpRequestFactory` → `HttpComponentsClientHttpRequestFactory` (커넥션 풀 200개) + `@Cacheable` on `getBlockHash`, `getBlock` |
| `.../service/BlockchainQueryService.java` | 어노테이션 추가 | `@Cacheable("dashboard")` TTL 3초 |
| `.../global/config/CacheConfig.java` | 신규 생성 | `@EnableCaching`, TTL별 `RedisCacheManager` 설정 |

---

## 개선 흐름 한눈에 보기

```
Phase 1  기준선
         dashboard p95: 9,847ms ← 요청당 RPC 23회 직렬, TCP 소켓 매번 신규 생성
         lotto    실패율: 84~95% ← HikariPool 10개를 dashboard가 모두 점유
              ↓
Phase 2  RPC HTTP 커넥션 풀 적용 (SimpleClientHttpRequestFactory → Apache HttpClient 5)
         dashboard p95: 9,206ms  (-6.5%)  ← TCP 재사용됐지만 23회 호출은 그대로
         lotto    실패율: 82~94%           ← 개선 미미
              ↓
Phase 3  확정 블록 데이터 Redis 캐시 (blockHash, block TTL 10분)
Phase 4  Dashboard 전체 응답 Redis 캐시 (dashboard TTL 3초)
         dashboard p95: 35ms     (-99.6%) ← 캐시 히트 시 RPC 0회
         lotto    실패율: 73~79%           ← dashboard 병목 해소, 이제 lotto 자신이 문제
              ↓
Phase 5  HikariPool 증설 (maximum-pool-size: 10 → 50)
         dashboard p95: 106ms    ✅ PASS
         lotto_overview p95: 134ms ✅ PASS
         lotto_entries  p95: 280ms ✅ PASS
```
