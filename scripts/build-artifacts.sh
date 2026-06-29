#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CIRCUIT_DIR="$ROOT_DIR/circuits/ballot"
ARTIFACT_DIR="$ROOT_DIR/artifacts/ballot"
JQ_BIN="$ROOT_DIR/tools/bin/jq"

if ! command -v jq >/dev/null 2>&1; then
  if [[ ! -x "$JQ_BIN" ]]; then
    mkdir -p "$(dirname "$JQ_BIN")"
    curl -L --fail \
      https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-amd64 \
      -o "$JQ_BIN"
    chmod +x "$JQ_BIN"
  fi
  export PATH="$(dirname "$JQ_BIN"):$PATH"
fi

mkdir -p "$ARTIFACT_DIR"

(
  cd "$CIRCUIT_DIR"
  nargo test
  nargo compile
  bb write_vk \
    --scheme ultra_honk \
    --oracle_hash keccak \
    --bytecode_path target/ballot.json \
    --output_path target
)

cp "$CIRCUIT_DIR/target/ballot.json" "$ARTIFACT_DIR/ballot.json"
cp "$CIRCUIT_DIR/target/vk" "$ARTIFACT_DIR/vk"

(
  cd "$ROOT_DIR"
  sha256sum artifacts/ballot/ballot.json artifacts/ballot/vk > "$ARTIFACT_DIR/SHA256SUMS"
)

echo "Artifacts written to $ARTIFACT_DIR"
