# JackpotChain 성능 개선 계획

> 작성일: 2026-03-26
> Baseline 결과: `perf/results/baseline_read_20260326_123600.json`
> 측정 명령어: `bash perf/run.sh read http://localhost:13000`

---

## 전제: 테스트 동작을 위한 의존성 체인

lotto 엔드포인트가 정상 응답하려면 아래 순서가 모두 선행되어야 한다.

```
1. 지갑 등록 (POST /v1/wallet)
        ↓
2. 온보딩 보상 지급 (1 POT → blockchain TX 생성)
        ↓
3. 블록 채굴 확정 (TX가 블록에 포함되어야 POT 잔액 반영)
        ↓
4. 인증 (challenge → ECDSA 서명 → verify → JWT accessToken 발급)
        ↓
5. JWT를 Authorization 헤더에 포함해 lotto 요청
   GET /api/v1/lotto?address=...
   GET /api/v1/lotto/entries?address=...
```

**JWT access token TTL = 15분** (`jwt.access-expiration: 900000ms`)
→ 4단계 완료 후 15분 이내에 테스트를 실행해야 한다.

**`prepare_wallets.py`의 한계**:
- 이미 등록된 지갑 주소는 건너뜀 (증분 추가 모드)
- **기존 50개 지갑의 토큰은 갱신하지 않음**
- 재실행해도 기존 지갑의 `accessToken`은 그대로 (만료 상태 유지)

→ 토큰 재발급 전용 스크립트 `refresh_tokens.py`가 필요 (Step 0에서 신규 작성)

---

## Baseline 결과 요약

| 시나리오 | VU | avg | p90 | p95 | p99 | HTTP 실패율 | 실패 원인 | 목표 |
|---------|-----|-----|-----|-----|-----|------------|---------|------|
| dashboard | 100 | 6,617ms | 7,374ms | **7,689ms** | 8,142ms | 0% | 없음 (느리지만 성공) | p95 < 500ms ❌ |
| lotto_overview | 50 | 7ms | 11ms | 14ms | 26ms | **100%** | **401 Unauthorized (JWT 만료)** | 실패율 < 1% ❌ |
| lotto_entries | 50 | 7ms | 11ms | 14ms | 28ms | **100%** | **401 Unauthorized (JWT 만료)** | 실패율 < 1% ❌ |

### 병목 분석

**dashboard 7,689ms 원인** — 요청 1건당 RPC 23번 직렬 호출
```
getBlockchainInfo()          → RPC 1회
getPeerInfo()                → RPC 1회
getMempoolTransactionCount() → RPC 1회
getRecentBlocks(limit=10):
  getBlockHash(height) × 10  → RPC 10회
  getBlock(hash)       × 10  → RPC 10회
                         합계: 23회 (직렬, 캐시 없음)
```

**lotto_overview 잠재 병목** — 캐시 미스 시 RPC 3회 직렬 호출
```
getBalances(address)   → RPC 1회 (주소별 잔액)
getJackpotPool()       → RPC 1회 (풀 상태)
getLottoInfo()         → RPC 1회 (로또 정보)
```
현재는 JWT 만료로 측정 불가. 토큰 재발급 후 Step 1부터 실제 측정.

**RPC 클라이언트 공통 문제** — TCP 커넥션 풀 없음
```java
// JackpotChainHttpRpcClient.java 54줄
SimpleClientHttpRequestFactory  // 요청마다 새 TCP 소켓 생성/소멸
```

---

## 개선 단계 계획

---

### Step 0 — 토큰 재발급 스크립트 작성 (테스트 선행 조건)

**문제**: `prepare_wallets.py`는 기존 지갑 토큰을 갱신하지 않아 테스트 시 모든 lotto 요청이 401

**해결**: `test-wallets.json`에 저장된 `privateKeyHex` / `publicKeyHex`로 재인증하는 스크립트 신규 작성

**신규 작성 파일**: `perf/setup/refresh_tokens.py`

**동작 흐름**:
```python
# 1. test-wallets.json 로드
wallets = json.loads(Path("perf/fixtures/test-wallets.json").read_text())

# 2. 각 지갑마다 재인증
for w in wallets:
    priv = bytes.fromhex(w["privateKeyHex"])
    pub  = bytes.fromhex(w["publicKeyHex"])
    # POST /v1/auth/challenge → POST /v1/auth/verify
    new_token = get_access_token(base_url, w["address"], priv, pub)
    w["accessToken"] = new_token  # 갱신

# 3. test-wallets.json 덮어쓰기 저장
Path("perf/fixtures/test-wallets.json").write_text(json.dumps(wallets, indent=2))
```

**실행 명령어**:
```bash
# 테스트 직전에 항상 실행 (TTL 15분이므로 테스트 완료 전까지 유효)
python perf/setup/refresh_tokens.py --base-url http://localhost:8080
```

**기대효과**:
- lotto_overview / lotto_entries: 401 → 200
- 실패율 100% → 0% (성능 개선 없이 테스트 자체가 정상화됨)
- lotto_overview p95 예상: 수십~수백 ms (RPC 3회 기반)

**측정**:
```bash
python perf/setup/refresh_tokens.py --base-url http://localhost:8080
bash perf/run.sh read http://localhost:13000
# 결과 파일을 step0_after_{ts}.json 으로 rename
```

---

### Step 1 — HikariCP 커넥션 풀 확장

**문제**:
```yaml
# application-local.yml 현재값
hikari:
  maximum-pool-size: 10       # 200 VU 동시 접근 시 부족
  connection-timeout: 3000    # 3초 대기 후 타임아웃
```
lotto_overview, lotto_entries는 DB 기반 조회.
200 VU가 동시에 접근하면 커넥션 10개 소진 후 대기 → 타임아웃 발생 가능.

**수정 파일**: `BE-ssatto/src/main/resources/application-local.yml`

**수정 위치**: 9~14줄

```yaml
# 변경 전
hikari:
  maximum-pool-size: 10
  minimum-idle: 2
  connection-timeout: 3000
  idle-timeout: 600000
  max-lifetime: 1800000

# 변경 후
hikari:
  maximum-pool-size: 30       # 200 VU × 로또/지갑 DB 접근 비율 고려
  minimum-idle: 5
  connection-timeout: 5000    # 타임아웃 여유 확보
  idle-timeout: 600000
  max-lifetime: 1800000
```

**기대효과**:
- lotto p95 안정화 (커넥션 대기 제거)
- dashboard에는 직접 효과 없음 (RPC 기반, DB 미사용)

**측정**:
```bash
# 앱 재시작 → 토큰 재발급 → 테스트
python perf/setup/refresh_tokens.py --base-url http://localhost:8080
bash perf/run.sh read http://localhost:13000
# → step1_after_{ts}.json
```

---

### Step 2 — RPC HTTP 커넥션 풀 적용

**문제**:
`SimpleClientHttpRequestFactory` = 요청마다 TCP 소켓 새로 생성/소멸.
dashboard 100 VU × 23 RPC = 초당 수백 개의 TCP 연결 → OS 소켓 자원 고갈.
lotto_overview 50 VU × 3 RPC = 추가 부하.

**수정 파일 1**: `BE-ssatto/build.gradle`

```groovy
// dependencies 블록 내 추가
implementation 'org.apache.httpcomponents.client5:httpclient5:5.3.1'
```

**수정 파일 2**: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`

수정 위치: import 블록 + 생성자 54~65줄

```java
// 제거
import org.springframework.http.client.SimpleClientHttpRequestFactory;

// 추가
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;

// 생성자 내 교체 (현재 54~55줄)
// Before:
SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
requestFactory.setConnectTimeout(properties.getConnectTimeoutMs());
requestFactory.setReadTimeout(properties.getReadTimeoutMs());

// After:
PoolingHttpClientConnectionManager cm = new PoolingHttpClientConnectionManager();
cm.setMaxTotal(300);            // 전체 최대 커넥션
cm.setDefaultMaxPerRoute(300);  // 노드 1개 대상이므로 전체와 동일
var httpClient = HttpClients.custom().setConnectionManager(cm).build();
HttpComponentsClientHttpRequestFactory requestFactory =
    new HttpComponentsClientHttpRequestFactory(httpClient);
requestFactory.setConnectTimeout(properties.getConnectTimeoutMs());
requestFactory.setConnectionRequestTimeout(properties.getConnectTimeoutMs());
// Spring 6.x: setReadTimeout 대신 RequestConfig로 소켓 타임아웃 설정
```

**기대효과**:
- TCP 연결 재사용 → RPC 호출당 연결 오버헤드 수십 ms 제거
- dashboard p95 예상: 7,689ms → 3,000~5,000ms (RPC 횟수는 유지)
- lotto_overview p95 예상: 소폭 개선

**측정**:
```bash
python perf/setup/refresh_tokens.py --base-url http://localhost:8080
bash perf/run.sh read http://localhost:13000
# → step2_after_{ts}.json
```

---

### Step 3 — Redis 캐싱 적용 (핵심 개선)

**문제**:
- 확정된 블록(`getBlock`, `getBlockHash`)은 **불변 데이터** → 매 요청마다 재조회 불필요
- `getJackpotPool()`, `getLottoInfo()`도 블록 단위로 변경 → 짧은 TTL 캐시 적용 가능
- 현재 `@EnableCaching` 없음, CacheConfig 없음 (Redis 인프라는 존재)

**현재 상태 확인**:
- `spring-boot-starter-data-redis` 의존성 있음 ✅
- `CacheConfig.java` 없음 → 신규 생성 필요
- `JackpotChainBlock` record → `Serializable` 구현 여부 확인 필요

**수정 파일 1 (신규)**: `BE-ssatto/src/main/java/ssatto/BE_ssatto/global/config/CacheConfig.java`

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        GenericJackson2JsonRedisSerializer serializer =
            new GenericJackson2JsonRedisSerializer();

        // 불변 블록 데이터: TTL 10분
        RedisCacheConfiguration blockConfig = RedisCacheConfiguration
            .defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(10))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(serializer));

        // 로또/풀 상태: 블록 생성 주기 고려 TTL 5초
        RedisCacheConfiguration lottoConfig = RedisCacheConfiguration
            .defaultCacheConfig()
            .entryTtl(Duration.ofSeconds(5))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(serializer));

        // dashboard 전체 응답: TTL 3초
        RedisCacheConfiguration dashboardConfig = RedisCacheConfiguration
            .defaultCacheConfig()
            .entryTtl(Duration.ofSeconds(3))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(serializer));

        return RedisCacheManager.builder(connectionFactory)
            .withCacheConfiguration("blockHash", blockConfig)
            .withCacheConfiguration("block", blockConfig)
            .withCacheConfiguration("jackpotPool", lottoConfig)
            .withCacheConfiguration("lottoInfo", lottoConfig)
            .withCacheConfiguration("dashboard", dashboardConfig)
            .build();
    }
}
```

**수정 파일 2**: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainHttpRpcClient.java`

```java
// getBlockHash() 위에 추가
@Cacheable(value = "blockHash", key = "#height")
@Override
public String getBlockHash(long height) { ... }

// getBlock() 위에 추가
@Cacheable(value = "block", key = "#blockHash")
@Override
public JackpotChainBlock getBlock(String blockHash) { ... }

// getJackpotPool() 위에 추가
@Cacheable(value = "jackpotPool", key = "'global'")
@Override
public JackpotChainJackpotPool getJackpotPool() { ... }

// getLottoInfo() 위에 추가
@Cacheable(value = "lottoInfo", key = "'global'")
@Override
public JackpotChainLottoInfo getLottoInfo() { ... }
```

**수정 파일 3**: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/service/BlockchainQueryService.java`

```java
// getDashboard() 위에 추가
@Cacheable(value = "dashboard", key = "#limit")
public BlockchainDashboardResponse getDashboard(int limit) { ... }
```

**수정 파일 4**: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/rpc/JackpotChainBlock.java`
(Redis JSON 직렬화를 위해 필요할 수 있음)
```java
// record에 implements Serializable 추가 또는
// GenericJackson2JsonRedisSerializer가 record를 처리할 수 있는지 확인
public record JackpotChainBlock(...) implements Serializable { }
```

**기대효과**:
- dashboard: 캐시 히트 시 RPC 0회 → **p95 7,689ms → 10~50ms 예상**
- lotto_overview: `getJackpotPool` / `getLottoInfo` 캐시 히트 시 RPC 1회(`getBalances`만)로 감소
- 노드 RPC 부하 90%+ 감소

**측정**:
```bash
python perf/setup/refresh_tokens.py --base-url http://localhost:8080
bash perf/run.sh read http://localhost:13000
# → step3_after_{ts}.json
```

---

### Step 4 — (선택) RPC 병렬 호출

**조건**: Step 3 이후에도 dashboard p95 > 500ms인 경우에만 진행

**문제**:
캐시 콜드 스타트(첫 요청 or TTL 만료) 시 `getRecentBlocks()`의 블록 10개를 여전히 직렬 조회.

**수정 파일**: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/blockchain/service/BlockchainQueryService.java`

수정 위치: `getRecentBlocks()` 메서드 (94~115줄)

```java
// Before: for 루프 직렬
for (long height = currentHeight; height >= startHeight; height--) {
    String blockHash = jackpotChainRpcClient.getBlockHash(height);
    JackpotChainBlock block = jackpotChainRpcClient.getBlock(blockHash);
    ...
}

// After: CompletableFuture 병렬
List<CompletableFuture<BlockchainDashboardBlockResponse>> futures =
    LongStream.rangeClosed(startHeight, currentHeight)
        .boxed()
        .map(height -> CompletableFuture.supplyAsync(() -> {
            String hash = jackpotChainRpcClient.getBlockHash(height);
            JackpotChainBlock block = jackpotChainRpcClient.getBlock(hash);
            return new BlockchainDashboardBlockResponse(...);
        }))
        .toList();

List<BlockchainDashboardBlockResponse> blocks =
    futures.stream()
        .map(CompletableFuture::join)
        .sorted(Comparator.comparingLong(BlockchainDashboardBlockResponse::height).reversed())
        .toList();
```

**기대효과**:
- 캐시 미스 시: 직렬 20 RPC → 병렬 (1+1+10동시) = 응답시간 대폭 단축
- Step 3만으로 p95 < 500ms 달성 시 이 단계 생략 가능

**측정**:
```bash
python perf/setup/refresh_tokens.py --base-url http://localhost:8080
bash perf/run.sh read http://localhost:13000
# → step4_after_{ts}.json
```

---

## 단계별 실행 체크리스트

### 매 측정 전 공통 절차
```bash
# 1. 앱 재시작 (JVM warm-up 초기화)
docker-compose -f docker-compose.local.yml restart be

# 2. 스택 정상 확인
curl http://localhost:13000/api/v1/blockchain/dashboard?limit=10

# 3. 토큰 재발급 (JWT 15분 TTL — 테스트 직전 필수)
python perf/setup/refresh_tokens.py --base-url http://localhost:8080

# 4. 테스트 실행 (15분 이내 완료)
bash perf/run.sh read http://localhost:13000
```

---

## 단계별 성능 비교표

각 Step 완료 후 결과를 직접 기입:

| 단계 | 결과 파일 | dashboard p95 | lotto_overview p95 | lotto_entries p95 | 전체 실패율 | 목표 달성 |
|------|---------|:------------:|:-----------------:|:----------------:|:---------:|:--------:|
| Baseline | baseline_read_20260326_123600.json | 7,689ms | 14ms (401) | 14ms (401) | 88.2% | ❌ |
| Step 0 (토큰 재발급) | step0_after_{ts}.json | - | - | - | - | - |
| Step 1 (HikariCP) | step1_after_{ts}.json | - | - | - | - | - |
| Step 2 (커넥션 풀) | step2_after_{ts}.json | - | - | - | - | - |
| Step 3 (Redis 캐시) | step3_after_{ts}.json | - | - | - | - | - |
| Step 4 (병렬 RPC) | step4_after_{ts}.json | - | - | - | - | - |

**목표**: dashboard p95 < 500ms, lotto p95 < 500ms, 전체 실패율 < 1%

---

## 파일 수정 위치 요약

| Step | 수정/생성 파일 | 유형 | 핵심 변경 내용 |
|------|-------------|------|-------------|
| Step 0 | `perf/setup/refresh_tokens.py` | 신규 생성 | 기존 지갑 JWT 재발급 |
| Step 1 | `BE-ssatto/src/main/resources/application-local.yml` | 값 변경 | HikariCP pool 10→30 |
| Step 2 | `BE-ssatto/build.gradle` | 의존성 추가 | httpclient5 추가 |
| Step 2 | `.../rpc/JackpotChainHttpRpcClient.java` | 클래스 수정 | SimpleClientHttpRequestFactory → HttpComponentsClientHttpRequestFactory |
| Step 3 | `.../global/config/CacheConfig.java` | 신규 생성 | @EnableCaching + TTL별 캐시 설정 |
| Step 3 | `.../blockchain/service/BlockchainQueryService.java` | 어노테이션 추가 | `@Cacheable("dashboard")` |
| Step 3 | `.../rpc/JackpotChainHttpRpcClient.java` | 어노테이션 추가 | `@Cacheable` on getBlock, getBlockHash, getJackpotPool, getLottoInfo |
| Step 3 | `.../rpc/JackpotChainBlock.java` | 인터페이스 추가 | `implements Serializable` (필요 시) |
| Step 4 | `.../blockchain/service/BlockchainQueryService.java` | 로직 변경 | getRecentBlocks() 병렬화 |
