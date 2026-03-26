/**
 * JackpotChain POST /lotto/commit 부하 테스트 (Phase 6-1 Baseline)
 *
 * 사전 조건:
 *   perf/fixtures/commit-payloads.json 존재
 *   (prepare_commit_txs.py 실행 완료 후)
 *
 * 동작:
 *   20 VU가 pre-signed commit TX를 순서대로 replay
 *   (각 TX는 한 번만 사용 — 블록체인 특성상 재사용 불가)
 *
 * 사용법:
 *   docker run --rm -i \
 *     -v $PWD/perf:/perf \
 *     --add-host=host.docker.internal:host-gateway \
 *     grafana/k6 run \
 *     -e BASE_URL=http://host.docker.internal:8080 \
 *     /perf/k6/baseline_commit.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { Counter, Rate, Trend } from "k6/metrics";

// ── fixtures ────────────────────────────────
const payloads = new SharedArray("commits", function () {
  return JSON.parse(open("../fixtures/commit-payloads.json"));
});

// ── 환경변수 ────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:13000";

// ── 커스텀 메트릭 ───────────────────────────
const commitSuccess = new Counter("commit_success");
const commitFail = new Counter("commit_fail");
const commitDuration = new Trend("commit_duration", true);
const errorRate = new Rate("custom_errors");

// ── 시나리오 ─────────────────────────────────
export const options = {
  scenarios: {
    lotto_commit: {
      // 각 TX는 1회만 유효하므로 shared-iterations 사용
      executor: "shared-iterations",
      vus: 20,
      iterations: payloads.length,
      maxDuration: "10m",
    },
  },

  thresholds: {
    // POST /lotto/commit p95 < 1000ms
    "http_req_duration": ["p(95)<1000"],
    commit_success: ["count>0"],
    custom_errors: ["rate<0.05"],
  },
};

// ── 기본 실행 함수 ────────────────────────────
export default function () {
  // shared-iterations에서 각 VU가 순서대로 payload를 소비
  const idx = __ITER % payloads.length;
  const p = payloads[idx];

  if (!p) return;

  const res = http.post(
    `${BASE_URL}/api/v1/lotto/commit`,
    JSON.stringify({
      address: p.address,
      signedTxHex: p.signedTxHex,
      commitNumbers: p.commitNumbers,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${p.accessToken}`,
      },
    }
  );

  const ok = check(res, {
    "commit status 200": (r) => r.status === 200,
    "commit has commitHash": (r) => {
      try { return !!JSON.parse(r.body).data.commitHash; } catch { return false; }
    },
  });

  commitDuration.add(res.timings.duration);
  errorRate.add(!ok);

  if (ok) {
    commitSuccess.add(1);
  } else {
    commitFail.add(1);
    console.log(`[FAIL] idx=${idx} status=${res.status} body=${res.body.substring(0, 200)}`);
  }

  sleep(0.2);
}
