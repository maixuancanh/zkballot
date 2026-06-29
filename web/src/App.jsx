import "../src/styles.css";

const fixture = {
  merkleRoot:
    "13404076185830178124547152852809432570371806541401997167885912923044198965877",
  contractDomain: "987654",
  proposalId: "7",
  nullifier:
    "3783916719230538462541909291699990079648539517558103881539723711101739686955",
  vote: "1",
  proofSha256: "61bf3879a04592015e4a8af0b96050a5861d682a0586407e1c94755e2d0209fb",
  publicInputsSha256:
    "471719a936599529f4c5511cda1bb17449cc3f96b700f353d32410fc16ff4184",
};

function Field({ label, value }) {
  return (
    <div className="field">
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

export default function App() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Stellar + Noir + UltraHonk</p>
        <h1>zkBallot</h1>
        <p className="lede">
          Anonymous binary voting with a public live tally. The proof hides the
          voter identity secret and Merkle path; the vote itself is a public
          input by design.
        </p>
        <div className="badges">
          <span>Voter anonymity</span>
          <span>Nullifier anti double-vote</span>
          <span>Public yes/no tally</span>
        </div>
      </section>

      <section className="card warning">
        <h2>Privacy boundary</h2>
        <p>
          This demo is not an encrypted tally or sealed-ballot system. It proves
          eligibility anonymously, but publishes <code>vote</code> as a circuit
          public input so the Soroban contract can update transparent counts.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Proof fixture</h2>
          <Field label="Merkle root" value={fixture.merkleRoot} />
          <Field label="Contract domain" value={fixture.contractDomain} />
          <Field label="Proposal" value={fixture.proposalId} />
          <Field label="Nullifier" value={fixture.nullifier} />
          <Field label="Public vote" value={fixture.vote === "1" ? "YES (1)" : "NO (0)"} />
        </article>

        <article className="card">
          <h2>On-chain checks</h2>
          <ol className="steps">
            <li>Verify UltraHonk proof with stored VK.</li>
            <li>Bind public inputs to root, proposal, nullifier, and vote args.</li>
            <li>Reject reused nullifier for the same proposal.</li>
            <li>Increment public yes/no tally.</li>
          </ol>
        </article>
      </section>

      <section className="card hashes">
        <h2>Reproducible artifacts</h2>
        <Field label="proof sha256" value={fixture.proofSha256} />
        <Field label="public_inputs sha256" value={fixture.publicInputsSha256} />
        <p>
          Rebuild locally with <code>npm run fixture:prove</code> and{" "}
          <code>npm run build:artifacts</code>.
        </p>
      </section>
    </main>
  );
}
