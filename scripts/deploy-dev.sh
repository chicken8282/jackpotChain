#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${HOME}/app"
COMPOSE_FILE="${APP_DIR}/compose/docker-compose.dev.yml"
ENV_FILE="${APP_DIR}/env/.env.dev"

echo "[DEV] compose config 검증"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" config >/dev/null

echo "[DEV] 이미지 pull"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" pull

echo "[DEV] 컨테이너 기동"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d

echo "[DEV] 상태 확인"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps