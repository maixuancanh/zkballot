#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

: "${STELLAR_NETWORK:=testnet}"
: "${STELLAR_SOURCE:?Set STELLAR_SOURCE}"
: "${BALLOT_ID:?Set BALLOT_ID}"
: "${PROPOSAL_ID:=1}"

JQ_BIN="$ROOT_DIR/tools/bin/jq"
if [[ ! -x "$JQ_BIN" ]]; then
  mkdir -p "$(dirname "$JQ_BIN")"
  curl -L --fail \
    https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-amd64 \
    -o "$JQ_BIN"
  chmod +x "$JQ_BIN"
fi

FIXTURE_JSON="artifacts/fixture/fixture.json"
COMMITMENT_HEX="$("$JQ_BIN" -r '.commitmentHex' "$FIXTURE_JSON")"
ROOT_HEX="$("$JQ_BIN" -r '.merkleRootHex' "$FIXTURE_JSON")"
NULLIFIER_HEX="$("$JQ_BIN" -r '.nullifierHex' "$FIXTURE_JSON")"
META_HASH="$(printf 'Fixture proposal' | sha256sum | awk '{print $1}')"
DEADLINE="$(( $(date +%s) + 86400 ))"

invoke_read() {
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$BALLOT_ID" \
    --send no \
    "$@"
}

retry_read() {
  local label="$1"
  shift
  local attempt
  for attempt in 1 2 3 4 5; do
    if invoke_read "$@"; then
      return 0
    fi
    if [[ "$attempt" -lt 5 ]]; then
      echo "$label not visible yet; retrying..."
      sleep 3
    fi
  done
  return 1
}

echo "Contract: $BALLOT_ID"
echo "Proposal: $PROPOSAL_ID"
echo "Root: $ROOT_HEX"
echo "Nullifier: $NULLIFIER_HEX"

if invoke_read -- commitment_index --commitment "$COMMITMENT_HEX" >/tmp/zkballot-commitment-index.json 2>/tmp/zkballot-commitment-index.err; then
  echo "Fixture voter already registered:"
  cat /tmp/zkballot-commitment-index.json
else
  echo "Registering fixture voter..."
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$BALLOT_ID" \
    -- register_voter \
    --commitment "$COMMITMENT_HEX" \
    --index 0 \
    --new_root "$ROOT_HEX" \
    --new_leaf_count 1
fi

if invoke_read -- get_proposal --proposal_id "$PROPOSAL_ID" >/tmp/zkballot-proposal.json 2>/tmp/zkballot-proposal.err; then
  echo "Proposal already exists:"
  cat /tmp/zkballot-proposal.json
else
  echo "Creating proposal..."
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$BALLOT_ID" \
    -- create_proposal \
    --meta_hash "$META_HASH" \
    --deadline "$DEADLINE"
fi

echo "Casting fixture vote..."
set +e
stellar contract invoke \
  --network "$STELLAR_NETWORK" \
  --source "$STELLAR_SOURCE" \
  --id "$BALLOT_ID" \
  --instruction-leeway 100000000 \
  -- cast_vote \
  --proposal_id "$PROPOSAL_ID" \
  --proof-file-path artifacts/fixture/proof \
  --nullifier "$NULLIFIER_HEX" \
  --vote 1
CAST_STATUS=$?
set -e

if [[ "$CAST_STATUS" -ne 0 ]]; then
  echo "Cast vote did not submit. Current testnet simulation exceeds the Soroban budget for UltraHonk verification."
  echo "The proof itself is verified natively by npm run fixture:prove."
fi

echo "Tally:"
retry_read "Tally" -- tally \
  --proposal_id "$PROPOSAL_ID"

echo "Has voted:"
retry_read "Has voted" -- has_voted \
  --proposal_id "$PROPOSAL_ID" \
  --nullifier "$NULLIFIER_HEX"
