# zkBallot

Anonymous binary voting on Stellar with a public live tally.

Important privacy note: zkBallot hides the voter identity witness and Merkle path, but `vote` is a public Noir input. This is not an encrypted tally, sealed ballot, or coercion-resistant voting protocol.

Hackathon preview note: the Soroban verifier now uses Nethermind's UltraHonk verifier from the OpenZeppelin/SDF Confidential Tokens developer preview branch. That improves alignment with the current Stellar preview stack, but it does not by itself make the ballot encrypted: OpenZeppelin Confidential Tokens target private token balances and transfer amounts, while zkBallot still exposes the binary vote as public input for a transparent tally.

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
  - UltraHonk proof verification through Nethermind's Soroban verifier backend,
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
- Nethermind `rs-soroban-ultrahonk` verifier rev `661db07200f890b1bd9a7349ed787c70a706dd12`

## Confidential Tokens preview fit

OpenZeppelin and SDF's Confidential Tokens preview is useful for zkBallot in two honest ways:

1. The preview branch wires real Noir/UltraHonk proof verification into Soroban through Nethermind's verifier. zkBallot now uses that verifier backend directly for ballot proofs.
2. The Confidential Token wrapper model is a plausible future extension for stake-weighted or token-gated voting where balances/transfer amounts need privacy.

What zkBallot does not claim:

- It does not use the Confidential Token contract wrapper today.
- It does not hide the selected vote. The `vote` field remains a public input.
- It does not implement encrypted tallying or private aggregation.
- The preview dependency is testnet/localnet-oriented and should be treated as unaudited preview code until the upstream audits finish.

References:

- OpenZeppelin preview branch: <https://github.com/OpenZeppelin/stellar-contracts/tree/feat/confidential-verifier-ultrahonk>
- Demo shared by the hackathon: <https://stellar-confidential-token-demo.billowing-moon-0c6f.workers.dev/>

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
- `stellar contract build`: emits `ballot.wasm` with the Nethermind verifier backend.
- `stellar contract build --features static-vk`: emits the optimized static-VK Nethermind verifier variant.

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

1. builds the depth-20 Noir circuit and static-VK Soroban contract with the Nethermind UltraHonk verifier;
2. generates three UltraHonk proofs for three identities;
3. registers three voter commitments and snapshots the root in a proposal;
4. casts `yes/no/yes`;
5. rejects a repeated nullifier; and
6. finalizes to `{"no":1,"yes":2}`.

Last verified localnet result:

```text
Contract: CDF2SO323RAPZND25NVHUYBQ3WXRYJJ3E5LIUG5GTC62ECLW7P3OMNV7
Tally before finalize: {"no":1,"yes":2}
Final tally: {"no":1,"yes":2}
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

Latest testnet three-voter E2E (`static-vk` + Nethermind verifier preview):

- Contract: `CCXOON5YG6WR2LHNIO2DSBWLHHP5X7TH5RJKVKY4EBIB4RXMJLX2WONQ`
- Deploy tx: <https://stellar.expert/explorer/testnet/tx/1a9069576a2cff36b4ceb326bd1054ed2ef9c311c37df04268277db652f4de28>
- Register voter txs:
  - <https://stellar.expert/explorer/testnet/tx/4cb6125ff354577f864ed0f89fe1073eefc64e3178e6bc6142139605856c645b>
  - <https://stellar.expert/explorer/testnet/tx/f0c12435a601be593fa5bc03c587a72a5812e4d7894ac87c6ad4be2dfa0a5c55>
  - <https://stellar.expert/explorer/testnet/tx/1beb26702e41826c2582ab0275e5f71a3140ee77e014136e94de47ea7abc2748>
- Create proposal tx: <https://stellar.expert/explorer/testnet/tx/dba6a51a928b88c77cc68ba67bfaa627e4c94f284c02aa8c3b0f1ef1eef2d2ad>
- Cast vote txs:
  - yes: <https://stellar.expert/explorer/testnet/tx/c01a73c7ac1cc9e015722a71f262bc0c627e81c7d01af00218677fba024d3c49>
  - no: <https://stellar.expert/explorer/testnet/tx/b2e1cdc66e0e810cd1068fdebb80b122aef40223b4e924fc6773f64d4862a177>
  - yes: <https://stellar.expert/explorer/testnet/tx/f45451e73a77e2019563c1a49f2816e235f16fc00841a7d1400190765b0893ab>
- Double-vote check: replaying voter 0's nullifier is rejected with `NullifierUsed (#6)`.
- Finalize tx: <https://stellar.expert/explorer/testnet/tx/4ffbcbd515c808097abf8c4f66df0121f2b937d9f52dde62bda0cdff53bbd9ad>
- Verified final state: `finalized = true`, `tally = {"no":1,"yes":2}`

Historical testnet demo deployment from before the Nethermind preview migration (`static-vk` verifier build):

- Contract: `CBJOYLAFVEHPJY2UMDKJYOQHFVOFUI73ZSPYYG6NU7DNU5VZ47A6EQUQ`
- WASM upload tx: <https://stellar.expert/explorer/testnet/tx/b6c4229880824c9046adcb0b5d380d21e156b8739669a1ceb40640dc21f84916>
- Deploy tx: <https://stellar.expert/explorer/testnet/tx/bb66634cdc9e688f163372c2b676a5e6885c7f5dcfcf60da6ec19dc2e6373b2b>
- Proposal tx: <https://stellar.expert/explorer/testnet/tx/fa20fd8eb95d74ddc4aafe645a53419606a6419f82ca045315352ef7742d75d1>

Previous default stored-VK deployment:

- Contract: `CBRDNA55CAQTAQD2VWIMILT224RSBGXBQ2ERYUD7XOZBTTGU37TX4ZJJ`
- Deploy tx: <https://stellar.expert/explorer/testnet/tx/6aba7e821c09aa33bb02a4f6e74088e5f9688187d632969e24e09ac430349429>
- Proposal tx: <https://stellar.expert/explorer/testnet/tx/1218755d63c577609aeb4d78fcf6874d2732fe9640eb120a0d9732eb1a3c91d4>

The historical proposal/root state is live on testnet. Before the Nethermind preview migration, the `cast_vote` path reached Soroban simulation but failed with `HostError: Error(Budget, ExceededLimit)` while running the earlier UltraHonk verifier. The current Nethermind-backed build has been verified both end-to-end on protocol-26 localnet with unlimited limits and on testnet for the three-voter lifecycle above.

Optimization note: the `static-vk` build removes the contract storage read and VK fetch from the verification path. In the pre-migration testnet attempt this was not enough to fit the earlier verifier under testnet budget, which indicated the dominant cost was inside UltraHonk verification itself rather than Merkle state logic.

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
