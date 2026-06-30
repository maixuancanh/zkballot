# Submission README Design

## Objective

Replace the existing project README with a professional, English-language,
submission-grade document that lets hackathon judges quickly understand,
verify, reproduce, and evaluate zkBallot.

## Audience

- Hackathon judges evaluating meaningful ZK and Stellar integration.
- Developers reproducing the circuit, contract, and testnet lifecycle.
- Security-minded reviewers checking the project's privacy claims.

## Editorial approach

Use a judge-first structure:

1. Establish the project value and honest privacy claim.
2. Surface the demo, video, deployed contract, and testnet evidence.
3. Explain the system through architecture and workflow diagrams.
4. Document implementation details and reproducible commands.
5. State security assumptions, limitations, and future work.

The README must use concise technical English. Conversation with the project
owner remains in Vietnamese.

## Required content

- Project summary, problem statement, and solution.
- Feature and implementation status.
- Demo UI, demo video, contract, and transaction evidence.
- System architecture diagram.
- End-to-end voting workflow diagram.
- Public-versus-private data-flow diagram.
- Repository tree and component responsibilities.
- Noir circuit constraints and exact public-input order.
- Soroban contract lifecycle, state, methods, and errors.
- UltraHonk and Nethermind verifier integration.
- Prerequisites and WSL-oriented environment setup.
- Install, build, test, localnet, testnet, and web commands.
- Reproducible three-voter, replay-rejection, and finalization evidence.
- Test matrix and expected results.
- Privacy model, threat model, assumptions, and explicit non-goals.
- Confidential Tokens developer-preview relationship.
- Troubleshooting, roadmap, references, and submission checklist.

## Diagram design

Use GitHub-rendered Mermaid diagrams so diagrams remain version-controlled,
readable in source form, and visible without external assets:

- A component architecture flowchart.
- A sequence diagram for registration through finalization.
- A data-boundary flowchart distinguishing private witness data from public
  inputs and on-chain state.

## Accuracy rules

- Describe zkBallot as anonymous eligibility with a public tally.
- Never describe the vote as encrypted or secret.
- State that `vote` is a public Noir input.
- Distinguish current implementation from future Confidential Token ideas.
- Use only verified contract IDs, transaction hashes, commands, versions, and
  test results found in the repository or confirmed through execution.
- Mark preview dependencies as unaudited/testnet-oriented.
- Avoid placeholders, unsupported performance claims, and mainnet-readiness
  claims.

## Validation

- Check all relative file links and public URLs.
- Confirm Mermaid syntax is valid GitHub Markdown.
- Run the existing automated test, typecheck, and web build commands when the
  environment permits.
- Scan the finished README for placeholders and contradictory privacy claims.
- Ensure the current demo-video duration and testnet lifecycle details match
  the checked-in artifacts and source.

## Scope

This change updates project documentation only. It does not alter the circuit,
contract, frontend behavior, deployments, or testnet state.
