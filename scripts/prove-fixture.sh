#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CIRCUIT_DIR="$ROOT_DIR/circuits/ballot"
FIXTURE_DIR="$ROOT_DIR/artifacts/fixture"
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

npm run fixture:inputs

(
  cd "$CIRCUIT_DIR"
  nargo execute ballot_witness
  bb prove \
    --scheme ultra_honk \
    --oracle_hash keccak \
    --bytecode_path target/ballot.json \
    --witness_path target/ballot_witness.gz \
    --output_path target
  bb verify \
    --scheme ultra_honk \
    --oracle_hash keccak \
    --vk_path target/vk \
    --proof_path target/proof \
    --public_inputs_path target/public_inputs
)

cmp -s "$CIRCUIT_DIR/target/public_inputs" "$FIXTURE_DIR/expected_public_inputs"
cp "$CIRCUIT_DIR/target/proof" "$FIXTURE_DIR/proof"
cp "$CIRCUIT_DIR/target/public_inputs" "$FIXTURE_DIR/public_inputs"

(
  cd "$ROOT_DIR"
  sha256sum \
    artifacts/fixture/proof \
    artifacts/fixture/public_inputs \
    artifacts/fixture/expected_public_inputs \
    > "$FIXTURE_DIR/SHA256SUMS"
)

echo "Fixture proof written to $FIXTURE_DIR"
