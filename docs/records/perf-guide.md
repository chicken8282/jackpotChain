# JackpotChain 성능 측정 가이드

이 문서는 k6 기반 성능 테스트 환경 구축부터 fixture 준비, 테스트 실행, 결과 분석, 개선 작업까지 전 과정을 재현하기 위한 가이드입니다.

---

## 전체 흐름 개요

```
[1단계] 환경 준비
  사전 조건 확인 (k6, Python, 로컬 스택)
        ↓
[2단계] 테스트용 지갑 생성
  prepare_wallets.py → test-wallets.json
        ↓
[3단계] 블록 채굴 확정 대기 (온보딩 보상 TX)
        ↓
[4단계] JWT 토큰 만료 전 테스트 실행
  bash perf/run.sh read [BASE_URL]
        ↓
[5단계] 결과 분석
  jq로 메트릭 추출 또는 Grafana에서 확인
        ↓
[6단계] 코드 개선 → 재측정 반복
```

---

## 테스트 시나리오 구성

### baseline_read (기본 부하 테스트)

| 시나리오 | 엔드포인트 | VU | 시간 | 인증 |
|---------|----------|-----|-----|-----|
| dashboard | `GET /api/v1/blockchain/dashboard?limit=10` | 100 | 5분 | 불필요 |
| lotto_overview | `GET /api/v1/lotto?address=...` | 50 | 5분 | JWT 필요 |
| lotto_entries | `GET /api/v1/lotto/entries?address=...&size=20` | 50 | 5분 | JWT 필요 |

**합격 기준:** 전 시나리오 p95 < 500ms, 실패율 < 1%

### stress_read (스트레스 테스트)

VU를 단계적으로 올리는 ramping 테스트. 총 11분.

| 구간 | dashboard VU | lotto VU (각) | 시간 |
|-----|------------|-------------|-----|
| 워밍업 | 100 | 50 | 3분 |
| 증가 | 250 | 125 | 3분 |
| 피크 | 500 | 250 | 3분 |
| 쿨다운 | 0 | 0 | 1분 |

**실행:** `bash perf/run.sh stress [BASE_URL]`

### baseline_commit (쓰기 부하 테스트)

| 시나리오 | 엔드포인트 | VU | 반복 |
|---------|----------|-----|-----|
| lotto_commit | `POST /api/v1/lotto/commit` | 20 | fixtures 수만큼 1회씩 |

> commit TX는 블록체인 특성상 1회만 유효. `prepare_commit_txs.py`로 사전 생성 필요.

---

## 1단계: 환경 준비

### Python 패키지 설치

```bash
pip install ecdsa requests
```

### k6 설치 (로컬 머신)

**macOS:**
```bash
brew install k6
```

**k6 미설치 시:** `run.sh`가 자동으로 Docker로 실행합니다. Docker만 있으면 됩니다.

### 로컬 스택 기동 확인

```bash
# 로컬 스택 상태 확인
docker compose -f docker-compose.local.yml ps

# Spring Boot 정상 응답 확인
curl http://localhost:8080/api/v1/blockchain/dashboard?limit=1
```

> `docker-compose.local.yml` 기준 Spring Boot 포트: **8080**, Nginx 포트: **13000**

---

## 2단계: 테스트용 지갑 생성

**실행 위치:** repo root

```bash
# 50개 지갑 생성 (로컬)
python perf/setup/prepare_wallets.py \
  --count 50 \
  --base-url http://localhost:8080

# 결과 확인
cat perf/fixtures/test-wallets.json | python3 -m json.tool | head -20
```

**스크립트 동작:**
1. secp256k1 키페어 생성 → JackpotChain 주소 파생
2. `POST /v1/wallet` 등록 (이미 등록된 주소는 건너뜀)
3. `POST /v1/auth/challenge` → `POST /v1/auth/verify` → accessToken 발급
4. `perf/fixtures/test-wallets.json` 저장

**저장 포맷:**
```json
[
  {
    "address": "JXxx...",
    "privateKeyHex": "...",
    "publicKeyHex": "...",
    "accessToken": "eyJ..."
  }
]
```

> **주의:** accessToken TTL = 15분. 생성 후 15분 이내에 테스트를 완료해야 합니다.
> 만료 시 재발급 방법은 [4단계 선행 절차](#매-측정-전-공통-절차) 참조.

---

## 3단계: 블록 채굴 확정 대기

지갑 등록 시 온보딩 보상(1 POT) TX가 생성됩니다. 이 TX가 블록에 포함되어야 lotto 요청이 정상 동작합니다.

```bash
# 현재 블록 높이 확인
curl -s http://localhost:8080/api/v1/blockchain/dashboard?limit=1 | python3 -m json.tool | grep height

# 약 10~30초 후 높이가 올라갔는지 재확인
curl -s http://localhost:8080/api/v1/blockchain/dashboard?limit=1 | python3 -m json.tool | grep height
```

높이가 올라갔으면 TX가 확정된 것입니다.

---

## 4단계: 테스트 실행

### 매 측정 전 공통 절차

```bash
# 1. 앱 재시작 (JVM warm-up 초기화, 캐시 비움)
docker compose -f docker-compose.local.yml restart be

# 2. 스택 정상 확인
curl http://localhost:8080/api/v1/blockchain/dashboard?limit=10

# 3. 토큰 재발급 (JWT 15분 TTL — 테스트 직전 필수)
#    test-wallets.json에서 기존 지갑의 accessToken을 갱신
python perf/setup/prepare_wallets.py \
  --count 0 \
  --base-url http://localhost:8080
# → count=0이면 새 지갑 생성 없이 기존 지갑 토큰만 갱신됩니다.
#   또는 같은 지갑 수로 재실행해도 중복은 스킵하고 토큰만 갱신됩니다.
```

> **토큰 재발급 이후 15분 이내에 테스트를 완료**해야 합니다.

### 읽기 부하 테스트 (Baseline)

```bash
# 로컬 (Nginx 포트 13000 사용)
bash perf/run.sh read http://localhost:13000

# Dev 서버
bash perf/run.sh read http://dev.ssatto777.site

# Prod 서버
bash perf/run.sh read http://ssatto777.site
```

### 스트레스 테스트

```bash
bash perf/run.sh stress http://localhost:13000
```

### commit 부하 테스트 (사전 TX 생성 필요)

```bash
# 1. commit TX 사전 생성 (로컬 dev 전용 — grantlocaljack RPC 사용)
python perf/setup/prepare_commit_txs.py \
  --base-url http://localhost:8080 \
  --node-rpc-url http://localhost:8776 \
  --jack-per-wallet 200 \
  --commits-per-wallet 1

# 2. commit 테스트 실행
bash perf/run.sh commit http://localhost:13000
```

**`prepare_commit_txs.py` 동작 순서:**
1. 각 지갑에 `grantlocaljack` RPC로 JACK 지급
2. 블록 확정 대기 (최대 3분)
3. JACK → POT 교환 TX 빌드 + 제출
4. 블록 확정 대기
5. POT UTXO로 lotto commit TX 빌드 (서명 포함)
6. `perf/fixtures/commit-payloads.json` 저장

---

## 5단계: 결과 분석

### CLI에서 즉시 확인

```bash
# 가장 최근 결과 파일 확인
ls -t perf/results/ | head -5

# p95, p99, avg 추출
cat perf/results/baseline_read_YYYYMMDD_HHMMSS.json \
  | jq '.metrics.http_req_duration'

# 시나리오별 p95
cat perf/results/baseline_read_YYYYMMDD_HHMMSS.json | jq '
  .metrics
  | to_entries[]
  | select(.key | startswith("http_req_duration"))
  | {key: .key, p95: .value.values["p(95)"]}
'

# 실패율 확인
cat perf/results/baseline_read_YYYYMMDD_HHMMSS.json \
  | jq '.metrics.http_req_failed'
```

### Grafana에서 실시간 확인 (Prometheus 연동 시)

`perf/run.sh`에 환경변수를 설정하면 k6 메트릭이 Prometheus로 직접 전송됩니다.

```bash
# Prometheus remote write 활성화
export K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write
bash perf/run.sh read http://localhost:13000
```

그라파나 접속: `http://localhost:3002` → k6 메트릭 대시보드에서 실시간 확인 가능.

---

## 6단계: 성능 개선 작업 (실제 적용된 내용)

### 실제 개선 결과 요약

| 시나리오 | Baseline p95 | 최종 p95 | 개선율 |
|---------|------------|---------|------|
| dashboard | 9,847ms | **106ms** | -98.9% |
| lotto_overview | 4,232ms | **134ms** | -96.8% |
| lotto_entries | 6,790ms | **280ms** | -95.9% |

---

### Phase 2 — RPC HTTP 커넥션 풀 적용

**문제:** `SimpleClientHttpRequestFactory`는 RPC 호출마다 TCP 소켓을 새로 생성/소멸.
dashboard 100 VU × 23 RPC = 초당 수천 개의 소켓 생성.

**수정 파일 1:** `BE-ssatto/build.gradle`
```groovy
implementation 'org.apache.httpcomponents.client5:httpclient5:5.3.1'
```

**수정 파일 2:** `BE-ssatto/src/main/java/.../rpc/JackpotChainHttpRpcClient.java`
```java
// Before
SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();

// After
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

**효과:** dashboard p95 9,847ms → 9,206ms (-6.5%). TCP 재사용은 됐으나 직렬 RPC 23회가 유지되어 효과 미미.

---

### Phase 3 — 확정 블록 데이터 Redis 캐싱

**문제:** `getBlockHash(height)`, `getBlock(hash)`가 23 RPC 중 20회를 차지.
블록은 한 번 확정되면 불변이므로 매 요청마다 재조회 불필요.

**수정 파일 1 (신규):** `BE-ssatto/src/main/java/.../global/config/CacheConfig.java`
```java
@EnableCaching
@Configuration
public class CacheConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.EVERYTHING,
                JsonTypeInfo.As.PROPERTY
            );

        GenericJackson2JsonRedisSerializer serializer =
            new GenericJackson2JsonRedisSerializer(objectMapper);

        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(serializer));

        return RedisCacheManager.builder(connectionFactory)
            .withInitialCacheConfigurations(Map.of(
                "blockHash", base.entryTtl(Duration.ofMinutes(10)),
                "block",     base.entryTtl(Duration.ofMinutes(10)),
                "dashboard", base.entryTtl(Duration.ofSeconds(3))
            ))
            .build();
    }
}
```

**수정 파일 2:** `BE-ssatto/src/main/java/.../rpc/JackpotChainHttpRpcClient.java`
```java
@Cacheable(value = "blockHash", key = "#height")
@Override
public String getBlockHash(long height) { ... }

@Cacheable(value = "block", key = "#blockHash")
@Override
public JackpotChainBlock getBlock(String blockHash) { ... }
```

---

### Phase 4 — Dashboard 전체 응답 Redis 캐싱

**문제:** Phase 3 이후에도 `getBlockchainInfo`, `getPeerInfo`, `getMempoolTransactionCount` 3회 RPC는 매 요청마다 호출.
TTL 3초 이내 같은 `limit` 값 요청은 결과 동일.

**수정 파일:** `BE-ssatto/src/main/java/.../service/BlockchainQueryService.java`
```java
@Cacheable(value = "dashboard", key = "#limit")   // 이 한 줄 추가
public BlockchainDashboardResponse getDashboard(int limit) {
    ...
}
```

**Phase 3+4 합산 효과:** dashboard p95 9,847ms → **35ms** (280배 개선).

---

### Phase 5 — HikariPool 증설

**문제:** Phase 3+4로 dashboard 병목 해소 후, 이번에는 lotto VU 100개(50+50)가
HikariPool 10개를 초과 요청 → 타임아웃 → HTTP 500.

```
실제 로그:
HikariPool-1 - Connection is not available,
request timed out after 3001ms (total=10, active=10, idle=0, waiting=49)
```

**수정 파일:** `BE-ssatto/src/main/resources/application-local.yml`
```yaml
# Before
hikari:
  maximum-pool-size: 10

# After
hikari:
  maximum-pool-size: 50
```

**효과:** 전 시나리오 p95 < 500ms 달성.

---

## 수정 파일 전체 목록

| 파일 | 변경 유형 | 내용 |
|------|---------|------|
| `BE-ssatto/build.gradle` | 의존성 추가 | `httpclient5:5.3.1` |
| `BE-ssatto/src/main/resources/application-local.yml` | 값 변경 | `maximum-pool-size: 10 → 50` |
| `.../rpc/JackpotChainHttpRpcClient.java` | 수정 | 커넥션 풀 200개 + `@Cacheable` on `getBlockHash`, `getBlock` |
| `.../service/BlockchainQueryService.java` | 어노테이션 추가 | `@Cacheable("dashboard")` TTL 3초 |
| `.../global/config/CacheConfig.java` | 신규 생성 | `@EnableCaching`, TTL별 `RedisCacheManager` |

---

## 트러블슈팅

### lotto 요청이 401로 실패하는 경우

JWT 만료(TTL 15분). 테스트 직전 토큰을 재발급합니다.

```bash
python perf/setup/prepare_wallets.py \
  --count 50 \
  --base-url http://localhost:8080
```

### k6 Docker 실행 시 BASE_URL에 localhost를 쓰면 안 됨

`run.sh`가 자동으로 `localhost → host.docker.internal`로 교체합니다. 별도 수정 불필요.

### `commit-payloads.json 없음` 에러

```bash
python perf/setup/prepare_commit_txs.py \
  --base-url http://localhost:8080 \
  --node-rpc-url http://localhost:8776
```

### `blockchain 모듈 임포트 실패` 에러

`prepare_commit_txs.py`는 repo root에서 실행해야 합니다.

```bash
cd S14P21E202   # repo root
python perf/setup/prepare_commit_txs.py ...
```

---

## 파일 구조

```
perf/
├── run.sh                          # 테스트 실행 래퍼 (k6 직접/Docker 자동 선택)
├── k6/
│   ├── baseline_read.js            # 읽기 부하 (200 VU, 5분)
│   ├── stress_read.js              # 스트레스 (ramping, 최대 1000 VU, 11분)
│   └── baseline_commit.js          # commit 쓰기 (20 VU, shared-iterations)
├── setup/
│   ├── prepare_wallets.py          # 테스트 지갑 생성 + JWT 발급
│   └── prepare_commit_txs.py       # commit TX 사전 빌드 (로컬 전용)
├── fixtures/
│   ├── test-wallets.json           # 생성된 지갑 목록 (address, key, token)
│   └── commit-payloads.json        # 사전 빌드된 commit TX 목록
├── results/                        # 테스트 결과 JSON (타임스탬프별)
│   └── baseline_read_YYYYMMDD_HHMMSS.json
└── docs/
    ├── plan.md                     # 개선 계획 (단계별 예상 효과 포함)
    ├── performance-improvement-log.md  # 단계별 실측 결과 로그
    └── results.md                  # 최종 결과 보고서 (내러티브 형식)
```
