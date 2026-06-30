#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CIRCUIT_DIR="$ROOT_DIR/circuits/ballot"
FIXTURE_DIR="${FIXTURE_DIR:-$ROOT_DIR/artifacts/fixture}"
if [[ "$FIXTURE_DIR" != /* ]]; then
  FIXTURE_DIR="$ROOT_DIR/$FIXTURE_DIR"
fi
JQ_BIN="$ROOT_DIR/tools/bin/jq"
BB_BIN="$HOME/.bb/bb"

if [[ ! -x "$JQ_BIN" ]]; then
  mkdir -p "$(dirname "$JQ_BIN")"
  curl -L --fail \
    https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-amd64 \
    -o "$JQ_BIN"
  chmod +x "$JQ_BIN"
fi
export PATH="$(dirname "$JQ_BIN"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$HOME/.bb:$HOME/.nvm/versions/node/v20.20.2/bin:$HOME/.cargo/bin:$HOME/.nargo/bin:$HOME/.local/bin"

"$HOME/.nvm/versions/node/v20.20.2/bin/node" \
  "$ROOT_DIR/node_modules/tsx/dist/cli.mjs" \
  "$ROOT_DIR/scripts/generate-proof-inputs.ts"

(
  cd "$CIRCUIT_DIR"
  nargo compile
  "$BB_BIN" write_vk \
    --scheme ultra_honk \
    --oracle_hash keccak \
    --bytecode_path target/ballot.json \
    --output_path target
  nargo execute ballot_witness
  "$BB_BIN" prove \
    --scheme ultra_honk \
    --oracle_hash keccak \
    --bytecode_path target/ballot.json \
    --witness_path target/ballot_witness.gz \
    --output_path target
  "$BB_BIN" verify \
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
