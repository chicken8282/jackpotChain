# Dashboard 성능 개선 로그

테스트 조건: 200 VU (dashboard 100 + lotto_overview 50 + lotto_entries 50), 5분, limit=10

목표: p95 < 500ms, 실패율 < 1%

---

## Before (기준선)

**측정일:** 2026-03-27
**결과 파일:** `perf/results/baseline_read_20260327_011622.json`
**상태:** 개선 없음 (순정 코드)

| 시나리오 | n | avg | p95 | p99 | 실패율 | 목표 달성 |
|---------|---|-----|-----|-----|--------|---------|
| dashboard | 3,179 | 8,627ms | 9,847ms | 10,018ms | 0% | FAIL |
| lotto_overview | 3,636 | 3,149ms | 4,232ms | 4,681ms | 84.5% | FAIL |
| lotto_entries | 3,291 | 3,596ms | 6,790ms | 8,690ms | 95.1% | FAIL |

**근본 원인:**

1. `dashboard` 병목 — `getRecentBlocks()` 에서 RPC 직렬 23회 호출
   - `getBlockchainInfo` × 1
   - `getPeerInfo` × 1
   - `getMempoolInfo` × 1
   - `getBlockHash(height)` + `getBlock(hash)` × 10 블록 = 20회
   - 총 23회 직렬 RPC, 커넥션 풀 없이 매 요청마다 TCP 연결 신규 생성

2. `lotto_overview` / `lotto_entries` 500 에러 — dashboard 병목의 연쇄 피해
   - HikariPool 최대 10개 (`maximum-pool-size: 10`)
   - dashboard 100 VU가 쓰레드/DB 커넥션을 장시간 점유
   - lotto 요청이 커넥션을 3초 대기 후 타임아웃 → 500 반환
   - 로그: `HikariPool-1 - Connection is not available, request timed out after 3001ms (total=10, active=10, idle=0, waiting=49)`

---

## Phase 2 — 커넥션 풀 적용

**측정일:** 2026-03-27
**결과 파일:** `perf/results/baseline_read_20260327_215153.json`
**변경 내용:**
- `build.gradle`: `org.apache.httpcomponents.client5:httpclient5` 의존성 추가
- `JackpotChainHttpRpcClient.java`: `SimpleClientHttpRequestFactory` → `HttpComponentsClientHttpRequestFactory` (maxTotal=200, maxPerRoute=200)

| 시나리오 | n | avg | p95 | p99 | 실패율 | 목표 달성 |
|---------|---|-----|-----|-----|--------|---------|
| dashboard | 3,410 | 7,901ms | 9,206ms | 9,768ms | 0% | FAIL |
| lotto_overview | 3,649 | 3,137ms | 4,169ms | 4,633ms | 82.9% (HTTP 500) | FAIL |
| lotto_entries | 3,277 | 3,610ms | 6,569ms | 8,391ms | 94.6% (HTTP 500) | FAIL |

**Before 대비:**

| 시나리오 | Before p95 | After p95 | 개선 |
|---------|-----------|-----------|------|
| dashboard | 9,847ms | 9,206ms | -641ms (-6.5%) |
| lotto_overview | 4,232ms | 4,169ms | -63ms (-1.5%) |
| lotto_entries | 6,790ms | 6,569ms | -221ms (-3.3%) |

**분석:** 커넥션 풀만으로는 효과가 미미함.
TCP 연결 재사용으로 `http_req_blocked` 시간은 줄었으나,
근본 원인인 **직렬 RPC 23회** 자체가 사라지지 않아 dashboard 요청이 여전히 7~9초를 점유.
100 VU × 7~9초 = HikariPool 10개 커넥션이 여전히 고갈 → lotto 500 지속.

---

## Phase 3+4 — 블록 캐싱 + Dashboard 전체 캐싱 (동시 적용)

**측정일:** 2026-03-28
**결과 파일:** `perf/results/baseline_read_20260328_010604.json`
**변경 내용:**
- `global/config/CacheConfig.java` 신규 생성: `@EnableCaching`, `RedisCacheManager` 설정 (JavaTimeModule, DefaultTyping.EVERYTHING)
- `JackpotChainHttpRpcClient.java`: `getBlockHash()` → `@Cacheable("blockHash")` TTL 10분, `getBlock()` → `@Cacheable("block")` TTL 10분
- `BlockchainQueryService.java`: `getDashboard()` → `@Cacheable("dashboard")` TTL 3초

| 시나리오 | n | avg | p95 | p99 | 실패율 | 목표 달성 |
|---------|---|-----|-----|-----|--------|---------|
| dashboard | 29,516 | 16ms | 35ms | 112ms | 0% | **PASS** ✅ |
| lotto_overview | 3,977 | 2,787ms | 3,029ms | 3,053ms | 73.3% (HTTP 500) | FAIL |
| lotto_entries | 3,245 | 3,649ms | 5,389ms | 5,922ms | 79.2% (HTTP 500) | FAIL |

**Before 대비 dashboard:**

| 지표 | Before | Phase 2 | Phase 3+4 | 총 개선 |
|-----|--------|---------|-----------|--------|
| avg | 8,627ms | 7,901ms | **16ms** | -99.8% |
| p95 | 9,847ms | 9,206ms | **35ms** | -99.6% |
| p99 | 10,018ms | 9,768ms | **112ms** | -98.9% |
| 실패율 | 0% | 0% | **0%** | - |

**분석:**

- `dashboard` — **목표 달성 (p95 35ms < 500ms)**. 캐시 적중 시 RPC 완전 생략으로 avg 8,627ms → 16ms (540배 개선).
- `lotto_overview` / `lotto_entries` — dashboard가 DB 커넥션을 더 이상 점유하지 않음에도 여전히 500 발생. **원인이 바뀜**: dashboard 병목 해소 후에도 lotto VU 100개(50+50)가 HikariPool 10개를 초과 요청 → lotto 자체가 DB 커넥션 고갈의 주체가 됨. HikariPool 크기(`maximum-pool-size`) 증설 또는 lotto 쿼리 최적화 필요.

---

## 최종 요약

| 시나리오 | Before p95 | 최종 p95 | 개선율 | 목표 달성 |
|---------|-----------|---------|-------|---------|
| dashboard | 9,847ms | **35ms** | -99.6% | ✅ PASS |
| lotto_overview | 4,232ms | 3,029ms | -28.4% | FAIL (HikariPool) |
| lotto_entries | 6,790ms | 5,389ms | -20.6% | FAIL (HikariPool) |

**남은 과제:** lotto 시나리오의 HikariPool 고갈 → `maximum-pool-size` 증설 (10 → 50) 적용 후 재측정

---

## Phase 5 — HikariPool 증설 (maximum-pool-size 10 → 50)

**측정일:** 2026-03-28
**결과 파일:** `perf/results/baseline_read_20260328_181506.json`
**변경 내용:**
- `application-local.yml`: `hikari.maximum-pool-size: 10` → `50`

| 시나리오 | n | avg | p95 | p99 | 실패율 | 목표 달성 |
|---------|---|-----|-----|-----|--------|---------|
| dashboard | 29,037 | 29ms | 106ms | 598ms | 0% | **PASS** ✅ |
| lotto_overview | 14,438 | 37ms | 134ms | 644ms | 0% | **PASS** ✅ |
| lotto_entries | 14,002 | 69ms | 280ms | 951ms | 0% | **PASS** ✅ |

**분석:** HikariPool 커넥션 수를 늘려 lotto VU 100개가 동시에 DB에 접근할 수 있게 됨. 전 시나리오 목표 달성.

---

## 최종 요약 (전체 개선 효과 — Baseline 대비)

| 시나리오 | Before p95 | 최종 p95 | 개선율 | 목표 달성 |
|---------|-----------|---------|-------|---------|
| dashboard | 9,847ms | **106ms** | -98.9% | ✅ PASS |
| lotto_overview | 4,232ms | **134ms** | -96.8% | ✅ PASS |
| lotto_entries | 6,790ms | **280ms** | -95.9% | ✅ PASS |

**적용된 변경 파일:**
- `BE-ssatto/build.gradle` — Apache HttpClient 5 의존성 추가
- `BE-ssatto/src/main/java/.../rpc/JackpotChainHttpRpcClient.java` — 커넥션 풀 + 블록 캐시
- `BE-ssatto/src/main/java/.../service/BlockchainQueryService.java` — dashboard 캐시
- `BE-ssatto/src/main/java/.../global/config/CacheConfig.java` — RedisCacheManager 설정
- `BE-ssatto/src/main/resources/application-local.yml` — HikariPool 증설

---

## Stress Test — 단계적 VU 증가 (200 → 500 → 1000)

**측정일:** 2026-03-28
**결과 파일:** `perf/results/stress_read_20260328_204108.json`
**부하 패턴:** ramping-vus, 총 11분
**VU 비율:** dashboard 50% / lotto_overview 25% / lotto_entries 25%

### 단계별 결과

**200VU 구간 (0~3분 — Baseline 수준)**

| 시나리오 | n | avg | p95 | p99 | 실패율 | 목표 달성 |
|---------|---|-----|-----|-----|--------|---------|
| dashboard | 14,949 | 6ms | 17ms | 44ms | 0% | ✅ PASS |
| lotto_overview | 7,444 | 10ms | 24ms | 58ms | 0% | ✅ PASS |
| lotto_entries | 7,344 | 22ms | 50ms | 191ms | 0% | ✅ PASS |

**500VU 구간 (3~6분 — 중간 피크)**

| 시나리오 | n | avg | p95 | p99 | 실패율 | 목표 달성 |
|---------|---|-----|-----|-----|--------|---------|
| dashboard | 40,247 | 7ms | 24ms | 90ms | 0% | ✅ PASS |
| lotto_overview | 19,997 | 14ms | 55ms | 164ms | 0% | ✅ PASS |
| lotto_entries | 19,650 | 32ms | 128ms | 303ms | 0% | ✅ PASS |

**1000VU 구간 (6~11분 — 최대 피크)**

| 시나리오 | n | avg | p95 | p99 | 실패율 | 목표 달성 |
|---------|---|-----|-----|-----|--------|---------|
| dashboard | 41,325 | 1,363ms | 4,925ms | 4,962ms | 0% | ❌ FAIL |
| lotto_overview | 17,012 | 1,879ms | 5,393ms | 7,938ms | 13.6% | ❌ FAIL |
| lotto_entries | 15,541 | 2,155ms | 8,178ms | 8,267ms | 21.3% | ❌ FAIL |

### 한계점 (Breaking Point)

**1000VU (dashboard 500 + lotto 500)** 구간에서 시스템이 무너짐.

- **dashboard**: 캐시 히트는 유지되나, 동시 500 VU 처리 과정에서 Redis/JVM 스레드 경합으로 p95 4,925ms
- **lotto**: HikariPool 50개로도 500 VU 동시 DB 접근을 감당하지 못함 → 실패율 13~21%
- **500VU 이하**에서는 전 시나리오 p95 < 500ms, 실패율 0% 유지 — **실질적 안전 운영 한계: 500 VU**
