#!/usr/bin/env bash
set -euo pipefail

TARGET_COLOR="${1:-}"

if [ -z "${TARGET_COLOR}" ]; then
  echo "usage: $0 <blue|green>"
  exit 1
fi

UPSTREAM_FILE="/etc/nginx/conf.d/upstream.conf"

if [ "${TARGET_COLOR}" = "blue" ]; then
  sudo tee "${UPSTREAM_FILE}" > /dev/null <<'EOF'
upstream active_spring {
    server 127.0.0.1:8090;
}
EOF
elif [ "${TARGET_COLOR}" = "green" ]; then
  sudo tee "${UPSTREAM_FILE}" > /dev/null <<'EOF'
upstream active_spring {
    server 127.0.0.1:8092;
}
EOF
else
  echo "invalid color: ${TARGET_COLOR}"
  exit 1
fi

sudo nginx -t
sudo systemctl reload nginx
echo "switched active color to ${TARGET_COLOR}"