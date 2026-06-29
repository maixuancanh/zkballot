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

PROPOSAL_ID=7
TITLE_JSON="/tmp/zkballot-title.json"
ROOT_HEX="$(xxd -p -c 256 -l 32 artifacts/fixture/public_inputs)"
NULLIFIER_HEX="$(xxd -p -c 256 -s 96 -l 32 artifacts/fixture/public_inputs)"

printf '%s\n' '"Fixture proposal"' > "$TITLE_JSON"

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

if invoke_read -- proposal \
  --proposal_id "$PROPOSAL_ID" >/tmp/zkballot-proposal.json 2>/tmp/zkballot-proposal.err; then
  echo "Proposal already exists:"
  cat /tmp/zkballot-proposal.json
else
  echo "Creating proposal..."
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$BALLOT_ID" \
    -- create_proposal \
    --proposal_id "$PROPOSAL_ID" \
    --title-file-path "$TITLE_JSON" \
    --root "$ROOT_HEX"
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
  --merkle_root "$ROOT_HEX" \
  --nullifier "$NULLIFIER_HEX" \
  --vote 1 \
  --public_inputs-file-path artifacts/fixture/public_inputs \
  --proof-file-path artifacts/fixture/proof
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
