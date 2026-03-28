# JackpotChain 성능 테스트 보고서

> 작성일: 2026-03-28
> 테스트 환경: Docker Compose (로컬), k6 부하 테스트

---

## 어떤 기능을 왜 테스트 대상으로 골랐는가

**대상 API:**
- `GET /api/v1/blockchain/dashboard?limit=10` (dashboard)
- `GET /api/v1/lotto?address=...` (lotto_overview)
- `GET /api/v1/lotto/entries?address=...` (lotto_entries)

**선정 이유:**
- dashboard는 메인 화면에서 폴링 방식으로 주기적으로 호출되는 핵심 API로, 사용자 경험에 직결됨
- lotto_overview / lotto_entries는 인증된 사용자가 자신의 잔액과 복권 참여 내역을 조회하는 API로, 지갑 기능의 핵심 경로임
- 세 API가 동시에 부하를 받는 구조에서 서로 간의 간섭이 발생하는지 확인이 필요했음

**단위 테스트 / 통합 테스트 적용 여부:**
- 이번 개선은 캐시 레이어 삽입과 인프라 설정 변경이 핵심이었으므로, 기능 정합성은 실제 Docker 환경에서의 통합 테스트로 검증함
- k6 시나리오 자체가 인증 → 조회 전 과정을 커버하는 E2E 통합 테스트 역할을 함

**외부 API 검증 방법:**
- JackpotChain 노드 RPC(`getBlockHash`, `getBlock`, `getBlockchainInfo` 등)는 캐시 도입 전후로 응답 내용이 동일한지 dashboard 응답 JSON을 직접 비교하여 검증함
- 캐시 TTL 3초 동안 같은 응답이 반환되고, TTL 만료 후 갱신되는 것을 수동 확인함

**실패 케이스 확인 방법:**
- k6 `http_req_failed` 메트릭으로 HTTP 4xx/5xx 비율을 측정함
- 실패 발생 시 Docker 로그(`docker logs jc-backend-local`)에서 `HikariPool` 타임아웃 및 RPC 에러 메시지를 확인함

**회귀 방지를 위해 남긴 것:**
- `perf/run.sh` — 동일 조건(200 VU, 5분)으로 언제든 재현 가능한 k6 스크립트
- `perf/results/` — 각 Phase별 raw JSON 결과 파일 보존
- `perf/docs/performance-improvement-log.md` — Phase별 수치와 분석 기록
- `perf/docs/results.md` — 스토리 기반 코드 수정 이력

---

## 1. 대상 기능

| 항목 | 내용 |
|------|------|
| API | `GET /api/v1/blockchain/dashboard?limit=10` |
| | `GET /api/v1/lotto?address=...` |
| | `GET /api/v1/lotto/entries?address=...` |
| 부하 구성 | dashboard 100 VU + lotto_overview 50 VU + lotto_entries 50 VU, 5분 지속 |
| 인프라 | Spring Boot 3.x, PostgreSQL, Redis, JackpotChain 노드 (Docker Compose 로컬) |

---

## 2. 문제 정의

**dashboard — 응답이 느리다 + 중복 호출이 발생한다**

- p95 응답시간 9,847ms로 목표(500ms)의 약 20배
- 요청 1건당 블록체인 노드 RPC를 23회 직렬 호출
- 매 요청마다 TCP 소켓을 새로 생성하고 버림 (커넥션 풀 없음)
- 이미 확정된 블록 데이터(불변)를 매번 다시 조회 (캐시 없음)

**lotto_overview / lotto_entries — 에러율이 높다**

- 실패율 84~95% (HTTP 500)
- lotto 자체의 문제가 아니라 dashboard가 DB 커넥션을 장시간 점유하는 연쇄 피해
- HikariPool 최대 10개인 상태에서 dashboard 100 VU가 9초씩 커넥션을 묶어두니 lotto 요청이 3초 대기 후 타임아웃

---

## 3. 측정 지표

**부하 테스트 도구:** k6 (`perf/run.sh read`)

**측정한 지표:**

| 지표 | 측정 방법 |
|------|---------|
| p50 / p95 / p99 응답시간 | k6 `http_req_duration` (시나리오별 태그 분리) |
| RPS | k6 `iterations` / 총 실행시간 |
| 에러율 | k6 `http_req_failed` (HTTP 4xx/5xx) |
| 에러 원인 | `tags.status` 값별 카운트 분석 |

**기준선 수치:**

| 시나리오 | n | avg | p95 | p99 | 에러율 |
|---------|---|-----|-----|-----|--------|
| dashboard | 3,179 | 8,627ms | 9,847ms | 10,018ms | 0% |
| lotto_overview | 3,636 | 3,149ms | 4,232ms | 4,681ms | 84.5% |
| lotto_entries | 3,291 | 3,596ms | 6,790ms | 8,690ms | 95.1% |

---

## 4. 원인 분석

### dashboard 9초의 원인 — 외부 API 병목 + 중복 요청

```
요청 1건 = RPC 23회 직렬 호출
─────────────────────────────────────────
getBlockchainInfo()           × 1
getPeerInfo()                 × 1
getMempoolTransactionCount()  × 1
getBlockHash(height)          × 10   ← 최근 10개 블록 각각
getBlock(hash)                × 10   ← 블록 해시로 상세 조회
─────────────────────────────────────────
합계: 23회, 모두 직렬, 캐시 없음
```

- `getBlockHash`, `getBlock` 대상 블록은 이미 확정된 불변 데이터임에도 매 요청마다 재조회
- `SimpleClientHttpRequestFactory` 사용으로 RPC 호출마다 TCP 소켓 신규 생성/소멸
- 100 VU × 9초 점유 = 초당 약 11건만 처리 가능

### lotto 500의 원인 — 락 경쟁 (HikariPool)

```
실제 서버 로그:
HikariPool-1 - Connection is not available,
request timed out after 3001ms
(total=10, active=10, idle=0, waiting=49)
```

- HikariPool `maximum-pool-size: 10` 설정
- dashboard 100 VU가 각 9초씩 커넥션을 점유 → 10개 커넥션 전부 소진
- lotto 요청이 커넥션 대기 3초 후 타임아웃 → HTTP 500

---

## 5. 시도한 방법

### 방법 1 — RPC HTTP 커넥션 풀 적용 (Phase 2)

`SimpleClientHttpRequestFactory` → `HttpComponentsClientHttpRequestFactory` (Apache HttpClient 5)로 교체해 TCP 커넥션을 풀링했다.

```
결과: dashboard p95 9,847ms → 9,206ms (-6.5%)
판단: 효과 미미. TCP 재사용 오버헤드는 줄었으나 23회 직렬 호출 자체가 유지되어 근본 해결 불가.
```

### 방법 2 — 확정 블록 데이터 Redis 캐싱 (Phase 3)

`getBlockHash(height)`, `getBlock(hash)`에 `@Cacheable` 적용 (TTL 10분).
블록은 확정 후 불변이므로 Redis에 저장해두면 이후 동일 height/hash 요청은 RPC 없이 즉시 반환된다.

```
결과: RPC 20회 → 캐시 히트 시 0회로 감소
```

### 방법 3 — Dashboard 응답 전체 캐싱 (Phase 4)

`getDashboard(int limit)` 메서드 자체에 `@Cacheable("dashboard")` 적용 (TTL 3초).
3초 내 같은 `limit`으로 오는 모든 요청을 Redis 한 번의 조회로 처리한다.

```
결과: dashboard p95 9,847ms → 35ms (-99.6%), 에러율 0% 유지
```

이 시점에서 dashboard는 목표를 달성했으나, lotto 500 에러의 원인이 바뀌었다.
dashboard 병목 해소 후 lotto VU 100개 자체가 HikariPool 10개를 초과 요청하는 것이 새로운 병목이 됨.

### 방법 4 — HikariPool 증설 (Phase 5)

`application-local.yml`의 `maximum-pool-size: 10 → 50`으로 변경.

```
결과: lotto_overview p95 4,232ms → 134ms, 에러율 0% 달성
```

---

## 6. 최종 적용

| 수정 파일 | 변경 내용 |
|---------|---------|
| `BE-ssatto/build.gradle` | `httpclient5:5.3.1` 의존성 추가 |
| `BE-ssatto/src/main/resources/application-local.yml` | HikariPool `maximum-pool-size: 10 → 50` |
| `.../rpc/JackpotChainHttpRpcClient.java` | `SimpleClientHttpRequestFactory` → `HttpComponentsClientHttpRequestFactory` (maxConnTotal=200) + `@Cacheable` on `getBlockHash` (TTL 10분), `getBlock` (TTL 10분) |
| `.../service/BlockchainQueryService.java` | `getDashboard()`에 `@Cacheable("dashboard")` (TTL 3초) 추가 |
| `.../global/config/CacheConfig.java` | 신규 생성 — `@EnableCaching`, `RedisCacheManager` TTL별 설정 (JavaTimeModule, DefaultTyping.EVERYTHING으로 Java 시간 타입 직렬화 문제 해결) |

---

## 7. 결과

### 전/후 수치 비교

| 시나리오 | Before avg | After avg | Before p95 | After p95 | Before 에러율 | After 에러율 | 목표 달성 |
|---------|-----------|---------|-----------|---------|------------|------------|---------|
| dashboard | 8,627ms | **29ms** | 9,847ms | **106ms** | 0% | 0% | ✅ PASS |
| lotto_overview | 3,149ms | **37ms** | 4,232ms | **134ms** | 84.5% | 0% | ✅ PASS |
| lotto_entries | 3,596ms | **69ms** | 6,790ms | **280ms** | 95.1% | 0% | ✅ PASS |

### Phase별 p95 추이

| Phase | dashboard p95 | lotto_overview p95 | lotto_entries p95 | 비고 |
|-------|-------------|------------------|-----------------|------|
| Before | 9,847ms | 4,232ms | 6,790ms | 순정 코드 |
| Phase 2 | 9,206ms | 4,169ms | 6,569ms | TCP 커넥션 풀 |
| Phase 3+4 | **35ms** | 3,029ms | 5,389ms | 블록 캐시 + dashboard 캐시 |
| Phase 5 | **106ms** | **134ms** | **280ms** | HikariPool 증설 |

> Phase 3+4에서 dashboard p95가 35ms → Phase 5에서 106ms로 오른 것은 Redis 캐시가 플러시된 상태에서 재측정했기 때문. 운영 상태(캐시 워밍 후)에서는 35ms 수준을 유지함.

### TPS

| 구간 | total iterations | 측정 시간 | TPS |
|------|----------------|---------|-----|
| Before | ~10,106 | 5분 | ~34/s |
| 최종 | 57,477 | 5분 | **191/s** |

---

## 8. 남은 과제

### 한계

**캐시 콜드 스타트:**
- Redis 재시작 또는 TTL 만료 직후 첫 요청은 여전히 RPC 23회를 직렬 호출함
- 현재 구조에서 dashboard p99가 598ms로 목표(500ms)를 소폭 초과하는 원인이 이 콜드 스타트임

**lotto p99:**
- lotto_overview p99 644ms, lotto_entries p99 951ms로 p99 기준으로는 목표 미달
- 동시 요청이 몰릴 때 HikariPool 50개도 일시 고갈 가능성 존재

**캐시 무효화 전략 미비:**
- 블록 캐시는 TTL 10분이라 새 블록이 생성돼도 최대 10분간 이전 데이터를 반환할 수 있음
- 현재는 블록체인의 블록 생성 주기와 limit=10(최근 10개 블록)이라는 특성상 실용적 문제는 없으나, 명시적 eviction 전략이 없음

### 다음 개선안

**1. 캐시 콜드 스타트 제거 — 블록 조회 병렬화**
- `getRecentBlocks()` 내부의 `getBlockHash` → `getBlock` 10쌍을 `CompletableFuture`로 병렬 실행
- 콜드 스타트 시 직렬 20회 RPC → 병렬 2 depth(hash 10개 동시 → block 10개 동시)로 단축
- p99 500ms 이내 달성 가능

**2. HikariPool 추가 튜닝**
- `maximum-pool-size: 50`은 로컬 환경 기준. 운영 DB 서버 `max_connections` 확인 후 조정 필요
- `minimum-idle`, `connection-timeout` 값도 실측 기반으로 재설정 권장

**3. 캐시 워밍 (Cache Warming)**
- 서버 시작 시 최근 N개 블록을 미리 Redis에 로드하는 워밍 로직 추가
- `@PostConstruct` 또는 ApplicationReadyEvent로 구현 가능
