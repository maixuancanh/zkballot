#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACT_DIR="$ROOT_DIR/contracts/ballot"
WASM="$CONTRACT_DIR/target/wasm32v1-none/release/ballot.wasm"

: "${STELLAR_NETWORK:=testnet}"
: "${STELLAR_SOURCE:?Set STELLAR_SOURCE to a funded Stellar CLI identity/account}"
: "${ADMIN_ADDRESS:?Set ADMIN_ADDRESS to the admin public address}"
: "${CONTRACT_DOMAIN_HEX:=}"
: "${STELLAR_BUILD_FEATURES:=}"
: "${STELLAR_CONTRACT_ALIAS:=zkballot}"

if [[ -z "$CONTRACT_DOMAIN_HEX" ]]; then
  CONTRACT_DOMAIN_HEX="00$(openssl rand -hex 31)"
fi
export CONTRACT_DOMAIN_HEX

npm run build:artifacts
npm run fixture:prove
(
  cd "$CONTRACT_DIR"
  if [[ -n "$STELLAR_BUILD_FEATURES" ]]; then
    stellar contract build --features "$STELLAR_BUILD_FEATURES"
  else
    stellar contract build
  fi
)

stellar contract deploy \
  --network "$STELLAR_NETWORK" \
  --source "$STELLAR_SOURCE" \
  --wasm "$WASM" \
  --alias "$STELLAR_CONTRACT_ALIAS" \
  -- \
  --admin "$ADMIN_ADDRESS" \
  --contract_domain "$CONTRACT_DOMAIN_HEX" \
  --vk_bytes-file-path "$ROOT_DIR/artifacts/ballot/vk"
