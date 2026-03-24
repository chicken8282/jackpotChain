#!/usr/bin/env bash
set -euo pipefail

PREVIOUS_COLOR="${1:-}"

if [ -z "${PREVIOUS_COLOR}" ]; then
  echo "usage: $0 <blue|green>"
  exit 1
fi

"${HOME}/app/scripts/switch-color.sh" "${PREVIOUS_COLOR}"
echo "rollback completed to ${PREVIOUS_COLOR}"