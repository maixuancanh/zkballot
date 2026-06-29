# zkBallot

Anonymous binary voting on Stellar with a public live tally.

Important privacy note: zkBallot hides the voter identity witness and Merkle path, but `vote` is a public Noir input. This is not an encrypted tally, sealed ballot, or coercion-resistant voting protocol.

## What is implemented

- Noir circuit proving:
  - identity commitment belongs to a Merkle root,
  - nullifier is bound to `DOMAIN_ZKBALLOT`, `contract_domain`, and `proposal_id`,
  - public vote is binary (`0` or `1`).
- TypeScript utilities for canonical BN254 field encoding and Poseidon2 Merkle trees.
- UltraHonk VK/proof artifact generation with `--oracle_hash keccak`.
- Soroban ballot contract:
  - admin-managed proposals and roots,
  - stored VK constructor,
  - UltraHonk proof verification,
  - public-input binding for root/domain/proposal/nullifier/vote,
  - nullifier-based double-vote prevention,
  - public yes/no tally.
- Minimal React demo UI that states the privacy boundary honestly.

## Verified toolchain

- Ubuntu 24.04 on WSL2
- Stellar CLI 27.0.0
- Nargo 1.0.0-beta.9
- Barretenberg 0.87.0
- Node.js 20.20.2
- Rust 1.95.0

## Reproduce locally

Run these from the repo root in WSL:

```bash
npm install
npm test
nargo test --program-dir circuits/ballot
npm run build:artifacts
npm run fixture:prove
cargo test --manifest-path contracts/ballot/Cargo.toml
(cd contracts/ballot && stellar contract build)
npm run web:build
```

Expected highlights:

- `nargo test`: 6 tests pass.
- `npm test`: encoding/Merkle tests pass.
- `npm run fixture:prove`: `Proof verified successfully`.
- `cargo test`: 5 contract tests pass.
- `stellar contract build`: emits `ballot.wasm`.

## Circuit public inputs

The public input order is fixed:

1. `merkle_root`
2. `contract_domain`
3. `proposal_id`
4. `nullifier`
5. `vote`

Each field is encoded as one canonical 32-byte big-endian BN254 scalar.

## Testnet deploy

Create a funded Stellar CLI identity first, then:

```bash
cp .env.example .env
source .env
npm run deploy:testnet
```

The deploy script builds artifacts, proves the fixture, builds WASM, and deploys with the VK passed to the constructor.

## Demo UI

```bash
npm run web:dev
```

For a static build:

```bash
npm run web:build
```

## Video/demo script

Suggested narration:

1. “zkBallot proves a voter is registered without revealing which registered identity they used.”
2. “The vote is intentionally public input, so the Soroban contract can update a transparent yes/no tally.”
3. “The contract verifies the UltraHonk proof, binds calldata to public inputs, rejects reused nullifiers, then increments the public tally.”
4. “This is anonymous voting, not encrypted tallying.”

Implementation follows [`../plans/02-zkBallot-plan.md`](../plans/02-zkBallot-plan.md).
