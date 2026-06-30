# Submission README Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an English, submission-grade README that enables hackathon judges to understand, verify, and reproduce zkBallot.

**Architecture:** Replace the root README with a judge-first document backed by repository source, checked-in artifacts, and verified Stellar testnet transactions. Use GitHub-native Mermaid for architecture and workflow diagrams, and keep all privacy claims explicitly limited to anonymous eligibility with a public vote and tally.

**Tech Stack:** Markdown, Mermaid, Noir, UltraHonk/Barretenberg, Rust/Soroban, Stellar CLI, TypeScript, React/Vite, WSL2

---

## File structure

- Modify: `README.md` — canonical project overview, evidence, architecture, operation, security, and submission documentation.
- Reference: `docs/superpowers/specs/2026-06-30-submission-readme-design.md` — approved content and accuracy requirements.
- Reference: `circuits/ballot/src/main.nr` — circuit constraints and input visibility.
- Reference: `contracts/ballot/contracts/ballot/src/lib.rs` — contract interface, state, lifecycle, and errors.
- Reference: `scripts/*.sh`, `scripts/*.ts` — exact build, proof, deployment, and E2E workflows.
- Reference: `web/src/App.jsx` — testnet evidence and demo presentation.

### Task 1: Verify source-of-truth facts

- [ ] **Step 1: Inspect implementation sources**

Run:

```bash
sed -n '1,240p' circuits/ballot/src/main.nr
sed -n '1,320p' contracts/ballot/contracts/ballot/src/lib.rs
```

Expected: circuit inputs, constraints, contract methods, storage keys, errors, and verifier invocation are visible.

- [ ] **Step 2: Inspect operational workflows**

Run:

```bash
for file in scripts/build-artifacts.sh scripts/prove-fixture.sh scripts/e2e-localnet.sh scripts/deploy-testnet.sh scripts/testnet-fixture-demo.sh; do
  printf '\n## %s\n' "$file"
  sed -n '1,320p' "$file"
done
```

Expected: exact environment variables, commands, lifecycle order, and expected final state are visible.

- [ ] **Step 3: Verify checked-in evidence metadata**

Run:

```bash
sha256sum -c artifacts/ballot/SHA256SUMS
sha256sum -c artifacts/fixture/SHA256SUMS
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 zkballot-demo-video.mp4
```

Expected: checksums pass and the video reports its current duration and size.

### Task 2: Write the judge-first README

- [ ] **Step 1: Replace `README.md` with the approved structure**

The document must contain these sections in this order:

```text
Title and one-line value proposition
Submission links and verified testnet result
Why zkBallot
What was built
Privacy claim
Architecture diagram
End-to-end workflow diagram
Private/public data-boundary diagram
Repository structure
Circuit design and public-input order
Soroban contract design and interface
Verifier integration
Technology stack
Prerequisites
Quick start
Testing and expected results
Localnet E2E
Testnet deployment and evidence
Demo web application
Security model and limitations
Confidential Tokens preview relationship
Troubleshooting
Roadmap
Submission checklist
References and license status
```

Use the verified contract:

```text
CCXOON5YG6WR2LHNIO2DSBWLHHP5X7TH5RJKVKY4EBIB4RXMJLX2WONQ
```

State the verified result exactly:

```text
Three registered voters cast yes/no/yes, a replayed nullifier was rejected
with NullifierUsed (#6), and the finalized tally was {"no":1,"yes":2}.
```

- [ ] **Step 2: Add GitHub-native diagrams**

Include:

```text
flowchart LR: browser/prover -> Noir -> UltraHonk proof -> Soroban ballot -> Nethermind verifier -> Stellar state
sequenceDiagram: admin registration -> proposal snapshot -> three proof-backed votes -> replay rejection -> finalization
flowchart TB: private identity/path separated from public root/domain/proposal/nullifier/vote and on-chain tally
```

Expected: each diagram has a descriptive heading and distinguishes off-chain proof generation from on-chain verification.

- [ ] **Step 3: Add reproducible commands**

Commands must be copyable from WSL and cover:

```bash
npm install
npm test
nargo test --program-dir circuits/ballot
npm run build:artifacts
npm run fixture:prove
cargo test --manifest-path contracts/ballot/Cargo.toml
npm run e2e:localnet
npm run deploy:testnet
npm run web:dev
npm run web:build
```

Expected: every command states its purpose and relevant expected result.

### Task 3: Validate and commit

- [ ] **Step 1: Scan accuracy and completeness**

Run:

```bash
rg -n "TBD|TODO|PLACEHOLDER|encrypted tally|secret ballot|mainnet ready" README.md
rg -n "merkle_root|contract_domain|proposal_id|nullifier|vote" README.md
rg -n "CCXOON5YG6WR2LHNIO2DSBWLHHP5X7TH5RJKVKY4EBIB4RXMJLX2WONQ|NullifierUsed|\\{\"no\":1,\"yes\":2\\}" README.md
```

Expected: no placeholders or unsupported claims; all five public inputs and verified testnet facts are present.

- [ ] **Step 2: Check Markdown references**

Run:

```bash
git diff --check
node -e "const fs=require('fs');const s=fs.readFileSync('README.md','utf8');for(const m of s.matchAll(/\\[[^\\]]+\\]\\((?!https?:|#)([^)]+)\\)/g){const p=m[1].split('#')[0];if(p&&!fs.existsSync(p))throw new Error('Missing local link: '+p)}console.log('Local README links exist')"
```

Expected: no whitespace errors and all local links exist.

- [ ] **Step 3: Run documentation-adjacent verification**

Run:

```bash
npm test
npm run web:build
```

Expected: automated tests pass and the Vite production build succeeds.

- [ ] **Step 4: Commit the README**

```bash
git add README.md
git commit -m "docs: publish submission-grade readme"
```

Expected: the commit contains only the README implementation.
