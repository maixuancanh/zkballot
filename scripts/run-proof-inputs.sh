#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/.generated-proof-tools"

rm -rf "$OUT_DIR"
node "$ROOT_DIR/node_modules/typescript/bin/tsc" \
  --target ES2022 \
  --module NodeNext \
  --moduleResolution NodeNext \
  --skipLibCheck \
  --outDir "$OUT_DIR" \
  "$ROOT_DIR/scripts/generate-proof-inputs.ts" \
  "$ROOT_DIR/scripts/encoding.ts" \
  "$ROOT_DIR/scripts/merkle.ts"

node "$OUT_DIR/generate-proof-inputs.js"
