#!/bin/sh
set -eu

DATA_DIR="${NODE_DATA_DIR:-/data}"
RPC_HOST="${NODE_RPC_HOST:-127.0.0.1}"
RPC_PORT="${NODE_RPC_PORT:-9776}"
P2P_PORT="${NODE_P2P_PORT:-9777}"
WALLET_DIR="${NODE_WALLET_DIR:-/wallets}"
WALLET_FILE="${NODE_WALLET_FILE:-${WALLET_DIR}/default.json}"
NODE_SEED_VALUE="${NODE_SEED:-}"
NODE_MINE_VALUE="${NODE_MINE:-false}"
NODE_MINING_ADDRESS_VALUE="${NODE_MINING_ADDRESS:-}"
NODE_DISABLE_DISCOVERY_VALUE="${NODE_DISABLE_DISCOVERY:-false}"
NODE_SEED_NODE_VALUE="${NODE_SEED_NODE:-false}"
NODE_RENDEZVOUS_PORT_VALUE="${NODE_RENDEZVOUS_PORT:-9778}"

mkdir -p "${DATA_DIR}" "$(dirname "${WALLET_FILE}")"

set -- python -m jackpotchain.cli.main node \
  --data-dir "${DATA_DIR}" \
  --wallet-file "${WALLET_FILE}" \
  --rpc-host "${RPC_HOST}" \
  --rpc-port "${RPC_PORT}" \
  --port "${P2P_PORT}"

if [ -n "${NODE_SEED_VALUE}" ]; then
  OLD_IFS="${IFS}"
  IFS=','
  for seed in ${NODE_SEED_VALUE}; do
    if [ -n "${seed}" ]; then
      set -- "$@" --seed "${seed}"
    fi
  done
  IFS="${OLD_IFS}"
fi

if [ "${NODE_MINE_VALUE}" = "true" ]; then
  set -- "$@" --mine

  if [ -n "${NODE_MINING_ADDRESS_VALUE}" ]; then
    set -- "$@" --address "${NODE_MINING_ADDRESS_VALUE}"
  elif [ -f "${WALLET_FILE}" ]; then
    WALLET_ADDR=$(python -c "import json; w=json.load(open('${WALLET_FILE}')); print(w['addresses'][0]['address'])")
    set -- "$@" --address "${WALLET_ADDR}"
  else
    python -m jackpotchain.cli.main wallet create --wallet-file "${WALLET_FILE}"
    WALLET_ADDR=$(python -c "import json; w=json.load(open('${WALLET_FILE}')); print(w['addresses'][0]['address'])")
    set -- "$@" --address "${WALLET_ADDR}"
  fi
fi

if [ "${NODE_DISABLE_DISCOVERY_VALUE}" = "true" ]; then
  set -- "$@" --disable-discovery
fi

if [ "${NODE_SEED_NODE_VALUE}" = "true" ]; then
  set -- "$@" --seed-node
  set -- "$@" --rendezvous-port "${NODE_RENDEZVOUS_PORT_VALUE}"
fi

exec "$@"
