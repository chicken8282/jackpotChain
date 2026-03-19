#!/bin/sh
set -eu

DATA_DIR="${NODE_DATA_DIR:-/data}"
RPC_HOST="${NODE_RPC_HOST:-127.0.0.1}"
RPC_PORT="${NODE_RPC_PORT:-8332}"
P2P_PORT="${NODE_P2P_PORT:-8333}"
WALLET_DIR="${NODE_WALLET_DIR:-/wallets}"
WALLET_FILE="${NODE_WALLET_FILE:-${WALLET_DIR}/default.json}"
NODE_SEED_VALUE="${NODE_SEED:-}"
NODE_MINE_VALUE="${NODE_MINE:-false}"
NODE_MINING_ADDRESS_VALUE="${NODE_MINING_ADDRESS:-}"

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
  fi
fi

exec "$@"
