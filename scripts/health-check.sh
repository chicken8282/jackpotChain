#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-}"

if [ -z "${TARGET_URL}" ]; then
  echo "usage: $0 <url>"
  exit 1
fi

for i in {1..20}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_URL}" || true)

  if [ "${STATUS}" = "200" ]; then
    echo "health check success: ${TARGET_URL}"
    exit 0
  fi

  echo "health check retry ${i}/20 - status=${STATUS}"
  sleep 5
done

echo "health check failed: ${TARGET_URL}"
exit 1