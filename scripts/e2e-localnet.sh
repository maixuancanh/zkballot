#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

JQ_BIN="$ROOT_DIR/tools/bin/jq"
if [[ ! -x "$JQ_BIN" ]]; then
  mkdir -p "$(dirname "$JQ_BIN")"
  curl -L --fail \
    https://github.com/jqlang/jq/releases/download/jq-1.7.1/jq-linux-amd64 \
    -o "$JQ_BIN"
  chmod +x "$JQ_BIN"
fi
export PATH="$(dirname "$JQ_BIN"):/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$HOME/.bb:$HOME/.nvm/versions/node/v20.20.2/bin:$HOME/.cargo/bin:$HOME/.nargo/bin:$HOME/.local/bin"

: "${STELLAR_NETWORK:=local}"
: "${STELLAR_SOURCE:=zkballot-local-admin}"
: "${CONTRACT_DOMAIN:=987654}"
: "${PROPOSAL_ID:=1}"
: "${IDENTITY_SECRETS:=111,333,555}"
: "${IDENTITY_TRAPDOORS:=222,444,666}"
: "${VOTES:=1,0,1}"
: "${START_LOCALNET:=0}"
: "${LOCALNET_CONTAINER:=zkballot-localnet}"
: "${STELLAR_BUILD_FEATURES:=static-vk}"
: "${STELLAR_NO_DEFAULT_FEATURES:=0}"
: "${PROPOSAL_DEADLINE_SECONDS:=20}"
: "${FINALIZE_WAIT_SECONDS:=$((PROPOSAL_DEADLINE_SECONDS + 4))}"
: "${SKIP_FINALIZE:=0}"
: "${INSTRUCTION_LEEWAY:=100000000}"

if [[ "$START_LOCALNET" == "1" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required for START_LOCALNET=1. Enable Docker Desktop WSL integration or install Docker in WSL." >&2
    exit 1
  fi
  stellar container start local --protocol-version 26 --limits unlimited --name "$LOCALNET_CONTAINER" >/tmp/zkballot-localnet.log 2>&1 &
  sleep 8
fi

echo "Checking Stellar network: $STELLAR_NETWORK"
if ! stellar network health --network "$STELLAR_NETWORK" 2>&1 | grep -q "Healthy"; then
  echo "Stellar network '$STELLAR_NETWORK' is not healthy. For localnet, start it with:" >&2
  echo "  stellar container start local --protocol-version 26 --limits unlimited --name $LOCALNET_CONTAINER" >&2
  echo "Docker is currently required for the localnet container." >&2
  exit 1
fi

if ! stellar keys address "$STELLAR_SOURCE" >/tmp/zkballot-admin-address 2>/dev/null; then
  stellar keys generate "$STELLAR_SOURCE" --network "$STELLAR_NETWORK" --fund
else
  stellar keys fund "$STELLAR_SOURCE" --network "$STELLAR_NETWORK" >/dev/null || true
fi
ADMIN_ADDRESS="$(stellar keys address "$STELLAR_SOURCE")"

npm run build:artifacts
for index in 0 1 2; do
  vote="$(echo "$VOTES" | cut -d, -f "$((index + 1))")"
  FIXTURE_DIR="artifacts/e2e/voter$index" \
  IDENTITY_SECRETS="$IDENTITY_SECRETS" \
  IDENTITY_TRAPDOORS="$IDENTITY_TRAPDOORS" \
  PROVER_INDEX="$index" \
  PROPOSAL_ID="$PROPOSAL_ID" \
  CONTRACT_DOMAIN="$CONTRACT_DOMAIN" \
  VOTE="$vote" \
    bash scripts/prove-fixture.sh
done

if [[ "$STELLAR_NO_DEFAULT_FEATURES" == "1" ]]; then
  (cd contracts/ballot && stellar contract build --no-default-features --features "$STELLAR_BUILD_FEATURES")
else
  (cd contracts/ballot && stellar contract build --features "$STELLAR_BUILD_FEATURES")
fi

CONTRACT_ID="$(
  stellar contract deploy \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --wasm contracts/ballot/target/wasm32v1-none/release/ballot.wasm \
    --alias zkballot-local-e2e \
    -- \
    --admin "$ADMIN_ADDRESS" \
    --contract_domain "$CONTRACT_DOMAIN" \
    --vk_bytes-file-path artifacts/ballot/vk \
  | tail -n 1
)"

echo "Contract: $CONTRACT_ID"

META_HASH="$(printf 'zkBallot localnet proposal' | sha256sum | awk '{print $1}')"

FIRST_FIXTURE="artifacts/e2e/voter0/fixture.json"
for index in 0 1 2; do
  commitment="$("$JQ_BIN" -r ".commitmentsHex[$index]" "$FIRST_FIXTURE")"
  new_root="$("$JQ_BIN" -r ".appendRootsHex[$index]" "$FIRST_FIXTURE")"
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$CONTRACT_ID" \
    -- register_voter \
    --commitment "$commitment" \
    --index "$index" \
    --new_root "$new_root" \
    --new_leaf_count "$((index + 1))" >/dev/null
done

LEDGER_JSON="$(stellar ledger latest --network "$STELLAR_NETWORK" --output json)"
NOW="$("$JQ_BIN" -r '.latestLedgerCloseTime // .timestamp // .ledgerCloseTime // 0' <<<"$LEDGER_JSON")"
if [[ "$NOW" == "0" || "$NOW" == "null" ]]; then
  NOW="$(date +%s)"
fi
DEADLINE="$((NOW + PROPOSAL_DEADLINE_SECONDS))"

CREATED_ID="$(
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$CONTRACT_ID" \
    -- create_proposal \
    --meta_hash "$META_HASH" \
    --deadline "$DEADLINE" \
)"
if [[ "$CREATED_ID" != "$PROPOSAL_ID" ]]; then
  echo "Expected proposal id $PROPOSAL_ID, got $CREATED_ID" >&2
  exit 1
fi

for index in 0 1 2; do
  vote="$(echo "$VOTES" | cut -d, -f "$((index + 1))")"
  nullifier="$("$JQ_BIN" -r '.nullifierHex' "artifacts/e2e/voter$index/fixture.json")"
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$CONTRACT_ID" \
    --instruction-leeway "$INSTRUCTION_LEEWAY" \
    -- cast_vote \
    --proposal_id "$PROPOSAL_ID" \
    --proof-file-path "artifacts/e2e/voter$index/proof" \
    --nullifier "$nullifier" \
    --vote "$vote" >/dev/null
done

set +e
double_vote_output="$(
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$CONTRACT_ID" \
    --instruction-leeway "$INSTRUCTION_LEEWAY" \
    -- cast_vote \
    --proposal_id "$PROPOSAL_ID" \
    --proof-file-path artifacts/e2e/voter0/proof \
    --nullifier "$("$JQ_BIN" -r '.nullifierHex' artifacts/e2e/voter0/fixture.json)" \
    --vote 1 2>&1
)"
double_vote_status=$?
set -e
if [[ "$double_vote_status" -eq 0 || "$double_vote_output" != *"NullifierUsed"* && "$double_vote_output" != *"#6"* ]]; then
  echo "Expected double vote rejection, got status=$double_vote_status output=$double_vote_output" >&2
  exit 1
fi

tally="$(
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$CONTRACT_ID" \
    --send no \
    -- tally \
    --proposal_id "$PROPOSAL_ID"
)"
echo "Tally before finalize: $tally"
if [[ "$tally" != *'"yes":2'* || "$tally" != *'"no":1'* ]]; then
  echo "Expected tally yes=2 no=1, got $tally" >&2
  exit 1
fi

if [[ "$SKIP_FINALIZE" == "1" ]]; then
  echo "Skipping finalize because SKIP_FINALIZE=1. Finalize after deadline $DEADLINE."
  exit 0
fi

sleep "$FINALIZE_WAIT_SECONDS"
final_tally="$(
  stellar contract invoke \
    --network "$STELLAR_NETWORK" \
    --source "$STELLAR_SOURCE" \
    --id "$CONTRACT_ID" \
    -- finalize \
    --proposal_id "$PROPOSAL_ID"
)"
echo "Final tally: $final_tally"
if [[ "$final_tally" != *'"yes":2'* || "$final_tally" != *'"no":1'* ]]; then
  echo "Expected final tally yes=2 no=1, got $final_tally" >&2
  exit 1
fi

echo "zkBallot localnet E2E passed: yes/no/yes, double-vote rejected, finalized to (2, 1)."
