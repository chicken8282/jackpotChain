/**
 * JackpotChain 읽기 부하 테스트 (Phase 6-1 Baseline)
 *
 * 시나리오:
 *   dashboard     — GET /blockchain/dashboard       100 VU × 5분
 *   lotto_overview — GET /lotto?address=...          50 VU × 5분
 *   lotto_entries  — GET /lotto/entries?address=...  50 VU × 5분
 *
 * 사용법:
 *   # Docker (권장)
 *   docker run --rm -i \
 *     -v $PWD/perf:/perf \
 *     --add-host=host.docker.internal:host-gateway \
 *     grafana/k6 run \
 *     -e BASE_URL=http://host.docker.internal:8080 \
 *     /perf/k6/baseline_read.js
 *
 *   # 직접 설치 후
 *   k6 run -e BASE_URL=http://localhost:8080 perf/k6/baseline_read.js
 *
 *   # Prometheus remote write (모니터링 연계)
 *   k6 run --out=experimental-prometheus-rw \
 *     -e BASE_URL=http://localhost:8080 \
 *     -e K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
 *     perf/k6/baseline_read.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Rate, Trend } from "k6/metrics";

// ── fixtures ────────────────────────────────
const wallets = new SharedArray("wallets", function () {
  return JSON.parse(open("../fixtures/test-wallets.json"));
});

// ── 환경변수 ────────────────────────────────
// 로컬: Nginx 경유 13000 (docker-compose.local.yml)
// Dev/Prod: http://dev.ssatto777.site 또는 http://ssatto777.site
const BASE_URL = __ENV.BASE_URL || "http://localhost:13000";

// ── 커스텀 메트릭 ───────────────────────────
const errorRate = new Rate("custom_errors");
const dashboardDuration = new Trend("dashboard_duration", true);
const lottoDuration = new Trend("lotto_duration", true);
const entriesDuration = new Trend("entries_duration", true);

// ── 시나리오 정의 ───────────────────────────
export const options = {
  scenarios: {
    dashboard: {
      executor: "constant-vus",
      vus: 100,
      duration: "5m",
      exec: "dashboardScenario",
      tags: { scenario: "dashboard" },
    },
    lotto_overview: {
      executor: "constant-vus",
      vus: 50,
      duration: "5m",
      exec: "lottoOverviewScenario",
      tags: { scenario: "lotto_overview" },
    },
    lotto_entries: {
      executor: "constant-vus",
      vus: 50,
      duration: "5m",
      exec: "lottoEntriesScenario",
      tags: { scenario: "lotto_entries" },
    },
  },

  // 합격 기준 (Phase 6 목표)
  thresholds: {
    // GET 계열 p95 < 500ms
    "http_req_duration{scenario:dashboard}": ["p(95)<500"],
    "http_req_duration{scenario:lotto_overview}": ["p(95)<500"],
    "http_req_duration{scenario:lotto_entries}": ["p(95)<500"],
    // 전체 에러율 1% 미만
    custom_errors: ["rate<0.01"],
    // HTTP 실패율 1% 미만
    http_req_failed: ["rate<0.01"],
  },
};

// ── 공통 헬퍼 ────────────────────────────────
function authHeaders(token) {
  return {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
}

function pickWallet() {
  return wallets[__VU % wallets.length];
}

// ── 시나리오 함수 ─────────────────────────────

export function dashboardScenario() {
  const res = http.get(`${BASE_URL}/api/v1/blockchain/dashboard?limit=10`);

  const ok = check(res, {
    "dashboard status 200": (r) => r.status === 200,
    "dashboard has height": (r) => {
      try { return JSON.parse(r.body).data.height > 0; } catch { return false; }
    },
  });

  errorRate.add(!ok);
  dashboardDuration.add(res.timings.duration);
  sleep(1);
}

export function lottoOverviewScenario() {
  const w = pickWallet();
  const res = http.get(
    `${BASE_URL}/api/v1/lotto?address=${w.address}`,
    authHeaders(w.accessToken)
  );

  const ok = check(res, {
    "lotto overview status 200": (r) => r.status === 200,
  });

  errorRate.add(!ok);
  lottoDuration.add(res.timings.duration);
  sleep(1);
}

export function lottoEntriesScenario() {
  const w = pickWallet();
  const res = http.get(
    `${BASE_URL}/api/v1/lotto/entries?address=${w.address}&size=20`,
    authHeaders(w.accessToken)
  );

  const ok = check(res, {
    "lotto entries status 200": (r) => r.status === 200,
  });

  errorRate.add(!ok);
  entriesDuration.add(res.timings.duration);
  sleep(1);
}
