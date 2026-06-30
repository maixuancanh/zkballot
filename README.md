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
  - admin-authorized append-only voter registry,
  - proposal root snapshots and deadlines,
  - stored VK constructor in the default build,
  - optional `static-vk` build that embeds the VK into WASM to remove runtime VK storage reads,
  - UltraHonk proof verification,
  - contract-side public-input reconstruction for root/domain/proposal/nullifier/vote,
  - nullifier-based double-vote prevention,
  - finalization after the proposal deadline,
  - public yes/no tally.
- React demo UI and helper tests that state the privacy boundary honestly.

## Verified toolchain

- Ubuntu 24.04 on WSL2
- Stellar CLI 27.0.0
- Nargo 1.0.0-beta.9
- Barretenberg 0.87.0
- Node.js 20.20.2
- Rust 1.95.0
- Docker Engine 29.6.1 in WSL for localnet

## Reproduce locally

Run these from the repo root in WSL:

```bash
export PATH="$PWD/tools/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$HOME/.bb:$HOME/.nvm/versions/node/v20.20.2/bin:$HOME/.cargo/bin:$HOME/.nargo/bin:$HOME/.local/bin"
npm install
npm test
nargo test --program-dir circuits/ballot
npm run build:artifacts
npm run fixture:prove
cargo test --manifest-path contracts/ballot/Cargo.toml
(cd contracts/ballot && stellar contract build)
(cd contracts/ballot && stellar contract build --features static-vk)
npm --prefix web test
npm --prefix web run typecheck
npm --prefix web run build
```

Expected highlights:

- `nargo test`: 6 tests pass.
- `npm test`: encoding/Merkle/web helper tests pass.
- `npm run fixture:prove`: `Proof verified successfully`.
- `cargo test`: 7 contract tests pass.
- `stellar contract build`: emits `ballot.wasm`.
- `stellar contract build --features static-vk`: emits the optimized static-VK verifier variant.

## Circuit public inputs

The public input order is fixed:

1. `merkle_root`
2. `contract_domain`
3. `proposal_id`
4. `nullifier`
5. `vote`

Each field is encoded as one canonical 32-byte big-endian BN254 scalar.

The checked-in circuit uses `TREE_DEPTH = 20`, matching the implementation plan. Proof generation requires the Linux `jq`, `base64`, and `gunzip` binaries to resolve before Windows shims in WSL; the project scripts set a clean PATH for this.

## Localnet E2E

The full plan-level E2E runs on Stellar localnet with protocol 26 and unlimited Soroban limits:

```bash
stellar container start local --protocol-version 26 --limits unlimited --name zkballot-localnet
npm run e2e:localnet
```

The E2E script:

1. builds the depth-20 Noir circuit and static-VK Soroban contract;
2. generates three UltraHonk proofs for three identities;
3. registers three voter commitments and snapshots the root in a proposal;
4. casts `yes/no/yes`;
5. rejects a repeated nullifier; and
6. finalizes to `{"no":1,"yes":2}`.

Last verified localnet result:

```text
zkBallot localnet E2E passed: yes/no/yes, double-vote rejected, finalized to (2, 1).
```

## Testnet deploy

Create a funded Stellar CLI identity first, then:

```bash
cp .env.example .env
source .env
npm run deploy:testnet
```

The deploy script builds artifacts, proves the fixture, builds WASM, and deploys with the VK passed to the constructor.

To reproduce the optimized static-VK deployment:

```bash
STELLAR_BUILD_FEATURES=static-vk STELLAR_CONTRACT_ALIAS=zkballot-static-vk npm run deploy:testnet
```

Latest testnet demo deployment (`static-vk` verifier build):

- Contract: `CBJOYLAFVEHPJY2UMDKJYOQHFVOFUI73ZSPYYG6NU7DNU5VZ47A6EQUQ`
- WASM upload tx: <https://stellar.expert/explorer/testnet/tx/b6c4229880824c9046adcb0b5d380d21e156b8739669a1ceb40640dc21f84916>
- Deploy tx: <https://stellar.expert/explorer/testnet/tx/bb66634cdc9e688f163372c2b676a5e6885c7f5dcfcf60da6ec19dc2e6373b2b>
- Proposal tx: <https://stellar.expert/explorer/testnet/tx/fa20fd8eb95d74ddc4aafe645a53419606a6419f82ca045315352ef7742d75d1>

Previous default stored-VK deployment:

- Contract: `CBRDNA55CAQTAQD2VWIMILT224RSBGXBQ2ERYUD7XOZBTTGU37TX4ZJJ`
- Deploy tx: <https://stellar.expert/explorer/testnet/tx/6aba7e821c09aa33bb02a4f6e74088e5f9688187d632969e24e09ac430349429>
- Proposal tx: <https://stellar.expert/explorer/testnet/tx/1218755d63c577609aeb4d78fcf6874d2732fe9640eb120a0d9732eb1a3c91d4>

The proposal/root state is live on testnet. The `cast_vote` path currently reaches Soroban simulation but fails with `HostError: Error(Budget, ExceededLimit)` while running the UltraHonk verifier. This is a testnet budget/verifier-cost blocker, not a native proof failure: `npm run fixture:prove` verifies the same proof successfully with `bb`.

Optimization note: the `static-vk` build removes the contract storage read and VK fetch from the verification path, but `cast_vote` still exceeds the current testnet budget. This strongly indicates the dominant cost is inside UltraHonk verification itself, not the Merkle circuit size or the surrounding Soroban state logic.

Run the state/proof demo:

```bash
npm run fixture:prove
npm run demo:testnet
```

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
