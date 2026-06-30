# zkBallot submission demo storyboard

**Message:** zkBallot uses a real zero-knowledge membership proof to authorize anonymous eligibility, verifies it in a Soroban contract, and leaves a complete public testnet evidence trail.

**Arc:** Demonstration — establish the privacy boundary, trace the proof into Stellar, inspect the three-voter lifecycle, show replay rejection, then close on the verified result and reproducibility.

**Audience:** DoraHacks judges and ZK/Stellar developers watching a landscape submission video.

**Brand voice:** Technical, direct, evidence-first, honest about limitations.

**Why this matters now:** The submission must demonstrate load-bearing ZK and public Stellar testnet integration, not merely describe an idea.

**Pacing:** Moderate — 7 beats across approximately 150 seconds.

## Beat 1 — Claim and boundary (0:00–0:18)

Show the hero headline and result card. Emphasize “Anonymous eligibility” and
then “Public tally” as separate ideas. The contract ID resolves into focus.

Techniques: viewport camera push, text emphasis, status-chip pulse.

## Beat 2 — What the proof does (0:18–0:40)

Scroll to the four-node proof flow. Highlight private witness, Noir circuit,
Soroban verifier, and public result in sequence.

Techniques: guided page scroll, sequential spotlight, connector trace.

## Beat 3 — Contract and deployment evidence (0:40–0:58)

Return to the testnet result and open the Stellar Expert contract page. Hold on
the contract ID and network context long enough to verify that the target is
testnet.

Techniques: browser tab transition, cursor focus, contract-ID callout.

## Beat 4 — Three-voter lifecycle (0:58–1:32)

Walk through deploy, three registrations, proposal creation, and the YES/NO/YES
vote transactions. Open at least one vote transaction in Stellar Expert and
return to the evidence trail.

Techniques: scroll tracking, row spotlight, hash callout, explorer cutaway.

## Beat 5 — Double-vote rejection (1:32–1:50)

Frame the amber replay block and `NullifierUsed (#6)`. Explain that the replay
is rejected before state mutation.

Techniques: amber warning pulse, error-code zoom, tally freeze.

## Beat 6 — Finalize and verified state (1:50–2:12)

Open the finalize transaction, then return to the result card:
`finalized = true`, `YES 2`, `NO 1`.

Techniques: explorer cutaway, counter emphasis, success sweep.

## Beat 7 — Reproduce and honest close (2:12–2:30)

Show the local verification commands and the privacy boundary. End on:
“Real ZK. Real Soroban verification. Public testnet evidence.”

Techniques: terminal-line reveal, three-column privacy comparison, logo hold.

## Asset audit

The capture contains no image or SVG assets. Use the live dashboard as the
primary visual. Skip decorative stock assets; they would weaken the evidentiary
purpose of the video.

## Production architecture

The final deliverable is a real Playwright browser recording of the live
dashboard and Stellar Expert pages, with generated narration, captions, and an
FFmpeg-composed 1920×1080 MP4.
