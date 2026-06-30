#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BB_BIN="$HOME/.bb/bb"
FIXTURE_DIR="$ROOT_DIR/artifacts/fixture"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

fields=(merkle_root contract_domain proposal_id nullifier vote)

for index in "${!fields[@]}"; do
  mutated="$WORK_DIR/public_inputs_${fields[$index]}"
  cp "$FIXTURE_DIR/public_inputs" "$mutated"
  node - "$mutated" "$index" <<'NODE'
const fs = require("fs");
const [file, rawIndex] = process.argv.slice(2);
const bytes = fs.readFileSync(file);
const offset = (Number(rawIndex) + 1) * 32 - 1;
bytes[offset] ^= 1;
fs.writeFileSync(file, bytes);
NODE

  if "$BB_BIN" verify \
    --scheme ultra_honk \
    --oracle_hash keccak \
    --vk_path "$ROOT_DIR/artifacts/ballot/vk" \
    --proof_path "$FIXTURE_DIR/proof" \
    --public_inputs_path "$mutated" >/dev/null 2>&1; then
    echo "Mutation unexpectedly verified: ${fields[$index]}" >&2
    exit 1
  fi
  echo "Rejected mutated public input: ${fields[$index]}"
done

echo "All five independent public-input mutations were rejected."
