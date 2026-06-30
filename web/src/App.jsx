import "../src/styles.css";
import { PUBLIC_INPUT_ORDER } from "./lib/prover.js";

const fixture = {
  treeDepth: "20",
  merkleRoot:
    "14460785374449162739442214995460005202646364416647747249593055484428816229179",
  contractDomain: "987654",
  proposalId: "1",
  nullifier:
    "11121500871050058422885258033156885195708409286151403101685507171941946327337",
  vote: "1",
  proofSha256: "91cd4240afd21366aa4b9552bb439c913b26623df66534dd950417b2f8e7b4af",
  publicInputsSha256:
    "f09fe1eee714ffe8315b27d79a1d9060abe17a1343a23de4378fe7ffbba9f926",
};

function Field({ label, value }) {
  return (
    <div className="field">
      <span>{label}</span>
      <code>{value}</code>
    </div>
  );
}

function Screen({ number, title, children }) {
  return (
    <article className="card">
      <p className="eyebrow">Screen {number}</p>
      <h2>{title}</h2>
      {children}
    </article>
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
          <span>Depth-{fixture.treeDepth} anonymity set</span>
          <span>Proposal-scoped nullifier</span>
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
        <Screen number="1" title="Connect">
          <p>
            Connect to the expected Stellar network before sending any
            transaction. The helper rejects wallet/network mismatches.
          </p>
        </Screen>

        <Screen number="2" title="Register identity">
          <p>
            Generate local browser secrets, store them locally with an export
            warning, and register only the Poseidon2 commitment/root on-chain.
          </p>
        </Screen>

        <Screen number="3" title="Vote">
          <p>
            Generate a Noir/UltraHonk proof of membership and submit the proof
            plus nullifier and public vote. The contract reconstructs public
            inputs in this order:
          </p>
          <ol className="steps">
            {PUBLIC_INPUT_ORDER.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ol>
        </Screen>

        <Screen number="4" title="Results">
          <p>
            The tally is public and live. Reusing the same proposal nullifier is
            rejected, while each proposal gets its own nullifier domain.
          </p>
        </Screen>
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

        <article className="card hashes">
          <h2>Reproducible artifacts</h2>
          <Field label="proof sha256" value={fixture.proofSha256} />
          <Field label="public_inputs sha256" value={fixture.publicInputsSha256} />
          <p>
            Rebuild locally with <code>npm run fixture:prove</code> and{" "}
            <code>npm run build:artifacts</code>.
          </p>
        </article>
      </section>
    </main>
  );
}
