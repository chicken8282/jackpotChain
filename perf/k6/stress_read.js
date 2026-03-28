/**
 * JackpotChain Stress Test — 단계적 VU 증가
 *
 * 부하 패턴:
 *   단계 1  워밍업   →  200 VU  (1분 ramping + 2분 유지)
 *   단계 2  증가     →  500 VU  (1분 ramping + 2분 유지)
 *   단계 3  피크     → 1000 VU  (1분 ramping + 2분 유지)
 *   쿨다운           →    0 VU  (1분 ramping)
 *   합계: 약 11분
 *
 * VU 비율: dashboard 50% / lotto_overview 25% / lotto_entries 25%
 *   200  VU → dashboard 100 / lotto_overview  50 / lotto_entries  50
 *   500  VU → dashboard 250 / lotto_overview 125 / lotto_entries 125
 *   1000 VU → dashboard 500 / lotto_overview 250 / lotto_entries 250
 *
 * 사용법:
 *   bash perf/run.sh stress http://localhost:13000
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Rate, Trend } from "k6/metrics";

// ── fixtures ────────────────────────────────
const wallets = new SharedArray("wallets", function () {
  return JSON.parse(open("../fixtures/test-wallets.json"));
});

const BASE_URL = __ENV.BASE_URL || "http://localhost:13000";

// ── 커스텀 메트릭 ───────────────────────────
const errorRate = new Rate("custom_errors");
const dashboardDuration = new Trend("dashboard_duration", true);
const lottoDuration     = new Trend("lotto_duration",     true);
const entriesDuration   = new Trend("entries_duration",   true);

// ── 시나리오 정의 ───────────────────────────
export const options = {
  scenarios: {
    dashboard: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 100 },   // 워밍업 ramping
        { duration: "2m", target: 100 },   // 200 VU 유지
        { duration: "1m", target: 250 },   // 500 VU ramping
        { duration: "2m", target: 250 },   // 500 VU 유지
        { duration: "1m", target: 500 },   // 1000 VU ramping
        { duration: "2m", target: 500 },   // 1000 VU 유지
        { duration: "1m", target: 0   },   // 쿨다운
      ],
      exec: "dashboardScenario",
      tags: { scenario: "dashboard" },
      gracefulRampDown: "30s",
    },
    lotto_overview: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target:  50 },
        { duration: "2m", target:  50 },
        { duration: "1m", target: 125 },
        { duration: "2m", target: 125 },
        { duration: "1m", target: 250 },
        { duration: "2m", target: 250 },
        { duration: "1m", target:   0 },
      ],
      exec: "lottoOverviewScenario",
      tags: { scenario: "lotto_overview" },
      gracefulRampDown: "30s",
    },
    lotto_entries: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target:  50 },
        { duration: "2m", target:  50 },
        { duration: "1m", target: 125 },
        { duration: "2m", target: 125 },
        { duration: "1m", target: 250 },
        { duration: "2m", target: 250 },
        { duration: "1m", target:   0 },
      ],
      exec: "lottoEntriesScenario",
      tags: { scenario: "lotto_entries" },
      gracefulRampDown: "30s",
    },
  },

  thresholds: {
    // Baseline(200 VU) 구간 p95 기준 — 피크에서는 참고치로만 활용
    "http_req_duration{scenario:dashboard}":     ["p(95)<1000"],
    "http_req_duration{scenario:lotto_overview}": ["p(95)<1000"],
    "http_req_duration{scenario:lotto_entries}":  ["p(95)<1000"],
    custom_errors:   ["rate<0.05"],   // 피크 허용 에러율 5%
    http_req_failed: ["rate<0.05"],
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
