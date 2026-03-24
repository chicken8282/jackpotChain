#!/usr/bin/env bash
set -euo pipefail

TARGET_COLOR="${1:-green}"

APP_DIR="${HOME}/app"
COMPOSE_FILE="${APP_DIR}/compose/docker-compose.prod.yml"
ENV_FILE="${APP_DIR}/env/.env.prod"
HEALTH_SCRIPT="${APP_DIR}/scripts/health-check.sh"
SWITCH_SCRIPT="${APP_DIR}/scripts/switch-color.sh"
ROLLBACK_SCRIPT="${APP_DIR}/scripts/rollback.sh"

if [ "${TARGET_COLOR}" = "green" ]; then
  TARGET_SERVICE="spring-green"
  TARGET_PORT="8092"
  PREVIOUS_COLOR="blue"
elif [ "${TARGET_COLOR}" = "blue" ]; then
  TARGET_SERVICE="spring-blue"
  TARGET_PORT="8090"
  PREVIOUS_COLOR="green"
else
  echo "invalid color: ${TARGET_COLOR}"
  exit 1
fi

echo "[PROD] compose config 검증"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" config >/dev/null

echo "[PROD] 이미지 pull"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" pull

echo "[PROD] 공통 서비스 기동"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d postgresql redis rabbitmq jackpotchain-node-prod frontend-prod

echo "[PROD] 대상 color 기동: ${TARGET_SERVICE}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d "${TARGET_SERVICE}"

echo "[PROD] health check"
bash "${HEALTH_SCRIPT}" "http://127.0.0.1:${TARGET_PORT}/actuator/health"

echo "[PROD] nginx upstream 전환"
bash "${SWITCH_SCRIPT}" "${TARGET_COLOR}"

echo "[PROD] 최종 상태"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps