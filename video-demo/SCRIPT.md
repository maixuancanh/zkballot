# zkBallot narration

This is not a mockup. zkBallot has a deployed Stellar testnet contract, a
completed three-voter election, and public transactions for every state change.

The privacy claim is precise: a voter proves membership in an eligible Merkle
set without revealing which registered identity voted. The identity secret,
trapdoor, and Merkle path stay private. The vote value is public, so this is
anonymous eligibility with a transparent tally, not encrypted tallying.

The private witness enters a Noir circuit. UltraHonk produces the proof, and a
Nethermind Soroban verifier checks it onchain before `cast_vote` can update the
tally. The contract reconstructs the public inputs in one exact order: Merkle
root, contract domain, proposal ID, nullifier, and vote.

Here is the deployed contract on Stellar testnet. The evidence trail begins
with deployment, then registers three voter commitments and creates proposal
one with the Merkle-root snapshot.

The three voters submit yes, no, and yes. Each successful vote has its own
public Stellar transaction, and each one reaches state mutation only after the
proof verifies.

Now the failure case. Replaying voter zero's proposal-scoped nullifier is
rejected with `NullifierUsed`, error number six. The replay cannot increment the
tally twice.

After the deadline, the proposal is finalized. The verified final state is
`finalized equals true`, with two yes votes and one no vote.

The repository includes the Noir tests, reproducible proof fixture, Soroban
contract tests, web tests, and build commands. The honest boundary remains
visible: identity membership is hidden, while the selected vote, nullifier, and
tally are public.

Real zero knowledge. Real Soroban verification. Public testnet evidence.
