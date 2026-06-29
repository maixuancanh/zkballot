#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/contracts/ballot"
WASM="$CONTRACT_DIR/target/wasm32v1-none/release/ballot.wasm"

: "${STELLAR_NETWORK:=testnet}"
: "${STELLAR_SOURCE:?Set STELLAR_SOURCE to a funded Stellar CLI identity/account}"
: "${ADMIN_ADDRESS:?Set ADMIN_ADDRESS to the admin public address}"
: "${CONTRACT_DOMAIN:=987654}"

npm run build:artifacts
npm run fixture:prove
(
  cd "$CONTRACT_DIR"
  stellar contract build
)

stellar contract deploy \
  --network "$STELLAR_NETWORK" \
  --source "$STELLAR_SOURCE" \
  --wasm "$WASM" \
  --alias zkballot \
  -- \
  --admin "$ADMIN_ADDRESS" \
  --contract_domain "$CONTRACT_DOMAIN" \
  --vk_bytes-file-path "$ROOT_DIR/artifacts/ballot/vk"
