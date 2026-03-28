#!/usr/bin/env bash
# ─────────────────────────────────────────────
# JackpotChain 성능 테스트 실행 래퍼
# ─────────────────────────────────────────────
# 사용법:
#   bash perf/run.sh read  [BASE_URL]       # GET 읽기 부하 테스트
#   bash perf/run.sh commit [BASE_URL]      # POST commit 부하 테스트
#   bash perf/run.sh all   [BASE_URL]       # read + commit 순차 실행
#
# BASE_URL 기본값:
#   로컬:  http://localhost:8080
#   Dev:   http://dev.ssatto777.site
#   Prod:  http://ssatto777.site
# ─────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

TEST_TYPE="${1:-read}"
BASE_URL="${2:-http://localhost:8080}"
RESULTS_DIR="${REPO_ROOT}/perf/results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "${RESULTS_DIR}"

# k6 실행 방법 결정 (설치 여부 확인)
if command -v k6 &>/dev/null; then
  K6_CMD="k6"
else
  echo "[INFO] k6 미설치 — Docker로 실행합니다."
  K6_CMD="docker run --rm -i \
    -v ${REPO_ROOT}/perf:/perf \
    --add-host=host.docker.internal:host-gateway \
    grafana/k6"
  # Docker 사용 시 BASE_URL의 localhost → host.docker.internal 교체
  BASE_URL="${BASE_URL/localhost/host.docker.internal}"
fi

# Prometheus remote write URL (옵션)
PROM_URL="${K6_PROMETHEUS_RW_SERVER_URL:-}"

run_k6() {
  local script="$1"
  local result_file="$2"
  local extra_args="${3:-}"

  local prom_args=""
  if [ -n "${PROM_URL}" ]; then
    prom_args="--out experimental-prometheus-rw \
      -e K6_PROMETHEUS_RW_SERVER_URL=${PROM_URL} \
      -e K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true"
  fi

  echo "────────────────────────────────────────"
  echo "[k6] 스크립트: ${script}"
  echo "[k6] BASE_URL:  ${BASE_URL}"
  echo "[k6] 결과 파일: ${result_file}"
  echo "────────────────────────────────────────"

  if [ "${K6_CMD}" = "k6" ]; then
    k6 run \
      -e BASE_URL="${BASE_URL}" \
      --out "json=${result_file}" \
      ${prom_args} \
      ${extra_args} \
      "${script}"
  else
    # MSYS_NO_PATHCONV=1 : Git Bash가 /perf/... 를 Windows 경로로 변환하는 것을 방지
    MSYS_NO_PATHCONV=1 docker run --rm -i \
      -v "${REPO_ROOT}/perf:/perf" \
      --add-host=host.docker.internal:host-gateway \
      grafana/k6 run \
      -e BASE_URL="${BASE_URL}" \
      --out "json=/perf/results/$(basename ${result_file})" \
      ${prom_args} \
      ${extra_args} \
      "/perf/k6/$(basename ${script})"
  fi
}

case "${TEST_TYPE}" in
  read)
    run_k6 \
      "${REPO_ROOT}/perf/k6/baseline_read.js" \
      "${RESULTS_DIR}/baseline_read_${TIMESTAMP}.json"
    ;;

  stress)
    run_k6 \
      "${REPO_ROOT}/perf/k6/stress_read.js" \
      "${RESULTS_DIR}/stress_read_${TIMESTAMP}.json"
    ;;

  commit)
    if [ ! -f "${REPO_ROOT}/perf/fixtures/commit-payloads.json" ]; then
      echo "[ERROR] commit-payloads.json 없음. 먼저 실행하세요:"
      echo "  python perf/setup/prepare_commit_txs.py --base-url ${BASE_URL/host.docker.internal/localhost}"
      exit 1
    fi
    run_k6 \
      "${REPO_ROOT}/perf/k6/baseline_commit.js" \
      "${RESULTS_DIR}/baseline_commit_${TIMESTAMP}.json"
    ;;

  all)
    run_k6 \
      "${REPO_ROOT}/perf/k6/baseline_read.js" \
      "${RESULTS_DIR}/baseline_read_${TIMESTAMP}.json"
    echo ""
    echo "읽기 테스트 완료. commit 테스트로 이어집니다..."
    sleep 5
    run_k6 \
      "${REPO_ROOT}/perf/k6/baseline_commit.js" \
      "${RESULTS_DIR}/baseline_commit_${TIMESTAMP}.json"
    ;;

  *)
    echo "사용법: $0 <read|commit|all|stress> [BASE_URL]"
    exit 1
    ;;
esac

echo ""
echo "결과 파일: ${RESULTS_DIR}/"
echo ""
echo "결과 요약 보기:"
echo "  cat ${RESULTS_DIR}/baseline_*_${TIMESTAMP}.json | jq '.metrics.http_req_duration'"
