import "../src/styles.css";

const fixture = {
  merkleRoot:
    "14460785374449162739442214995460005202646364416647747249593055484428816229179",
  contractDomain: "987654",
  proposalId: "7",
  nullifier:
    "3783916719230538462541909291699990079648539517558103881539723711101739686955",
  vote: "1",
  proofSha256: "d6f5d47f82a40060eb0e18b7af33019cf9cb887a27447667c77abe3ad594579d",
  publicInputsSha256:
    "fe5861c4722a4e8c16f1acb59fbf7a92fa41cee6fbaca80c1074d2a98ccf260d",
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
