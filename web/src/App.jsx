import "../src/styles.css";
import { PUBLIC_INPUT_ORDER } from "./lib/prover.js";

const EXPLORER = "https://stellar.expert/explorer/testnet";
const CONTRACT_ID = "CCXOON5YG6WR2LHNIO2DSBWLHHP5X7TH5RJKVKY4EBIB4RXMJLX2WONQ";

const lifecycle = [
  {
    label: "Deploy static-VK ballot contract",
    status: "submitted",
    tx: "1a9069576a2cff36b4ceb326bd1054ed2ef9c311c37df04268277db652f4de28",
  },
  {
    label: "Register voter 0 commitment",
    status: "registered",
    tx: "4cb6125ff354577f864ed0f89fe1073eefc64e3178e6bc6142139605856c645b",
  },
  {
    label: "Register voter 1 commitment",
    status: "registered",
    tx: "f0c12435a601be593fa5bc03c587a72a5812e4d7894ac87c6ad4be2dfa0a5c55",
  },
  {
    label: "Register voter 2 commitment",
    status: "registered",
    tx: "1beb26702e41826c2582ab0275e5f71a3140ee77e014136e94de47ea7abc2748",
  },
  {
    label: "Create proposal with 3-leaf root snapshot",
    status: "proposal #1",
    tx: "dba6a51a928b88c77cc68ba67bfaa627e4c94f284c02aa8c3b0f1ef1eef2d2ad",
  },
  {
    label: "Cast vote: YES",
    status: "proof verified",
    tx: "c01a73c7ac1cc9e015722a71f262bc0c627e81c7d01af00218677fba024d3c49",
  },
  {
    label: "Cast vote: NO",
    status: "proof verified",
    tx: "b2e1cdc66e0e810cd1068fdebb80b122aef40223b4e924fc6773f64d4862a177",
  },
  {
    label: "Cast vote: YES",
    status: "proof verified",
    tx: "f45451e73a77e2019563c1a49f2816e235f16fc00841a7d1400190765b0893ab",
  },
  {
    label: "Finalize proposal after deadline",
    status: "finalized",
    tx: "4ffbcbd515c808097abf8c4f66df0121f2b937d9f52dde62bda0cdff53bbd9ad",
  },
];

const proofFacts = [
  ["Circuit", "Noir ballot membership circuit"],
  ["Proof system", "UltraHonk, oracle_hash = keccak"],
  ["Verifier", "Nethermind Soroban UltraHonk verifier"],
  ["SDK", "Soroban SDK 26.1.0"],
  ["Tree depth", "20"],
  ["Contract domain", "987654"],
];

const commands = [
  "npm test",
  "nargo test --program-dir circuits/ballot",
  "npm run fixture:prove",
  "cargo test --manifest-path contracts/ballot/Cargo.toml",
  "npm --prefix web run build",
];

function shortHash(hash) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function TxLink({ tx }) {
  return (
    <a href={`${EXPLORER}/tx/${tx}`} target="_blank" rel="noreferrer">
      {shortHash(tx)}
    </a>
  );
}

function Stat({ label, value, tone = "default" }) {
  return (
    <div className={`stat ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SectionTitle({ title, copy }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      <p>{copy}</p>
    </div>
  );
}

export default function App() {
  return (
    <main className="shell">
      <nav className="topbar" aria-label="Demo navigation">
        <div className="brand">zkBallot</div>
        <div className="navlinks">
          <a href="#evidence">Evidence</a>
          <a href="#zk-flow">ZK flow</a>
          <a href="#privacy">Privacy</a>
          <a href="#reproduce">Reproduce</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <h1>Anonymous eligibility. Public tally. Verified on Stellar testnet.</h1>
          <p className="lede">
            zkBallot lets a voter prove they belong to an eligible Merkle set without revealing
            which identity voted. The selected vote remains public so Soroban can update a
            transparent yes/no tally.
          </p>
          <div className="actions">
            <a className="button primary" href={`${EXPLORER}/contract/${CONTRACT_ID}`} target="_blank" rel="noreferrer">
              Open contract on Stellar Expert
            </a>
            <a className="button" href="#evidence">
              View testnet proof trail
            </a>
          </div>
        </div>

        <aside className="result-card" aria-label="Latest verified testnet result">
          <div className="result-head">
            <span>Latest testnet E2E</span>
            <strong>Finalized</strong>
          </div>
          <code>{CONTRACT_ID}</code>
          <div className="stats">
            <Stat label="YES" value="2" tone="yes" />
            <Stat label="NO" value="1" tone="no" />
            <Stat label="Replay" value="Rejected" tone="warn" />
          </div>
          <div className="verified-state">
            Verified final state: <strong>finalized = true</strong>,{" "}
            <strong>tally = {"{\"no\":1,\"yes\":2}"}</strong>
          </div>
          <p>
            Three voters cast <strong>yes / no / yes</strong>. Replaying voter 0’s nullifier
            failed with <strong>NullifierUsed (#6)</strong>.
          </p>
        </aside>
      </section>

      <section id="evidence" className="panel evidence-panel">
        <SectionTitle
          title="Onchain evidence trail"
          copy="Every row links to the public Stellar testnet transaction used in the verified three-voter lifecycle."
        />
        <div className="timeline">
          {lifecycle.map((item, index) => (
            <article className="timeline-row" key={item.tx}>
              <div className="step-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <h3>{item.label}</h3>
                <p>{item.status}</p>
              </div>
              <TxLink tx={item.tx} />
            </article>
          ))}
        </div>
        <div className="rejection-proof">
          <div>
            <h3>Double-vote check</h3>
            <p>
              Replaying voter 0’s proposal nullifier was simulated against the same contract and
              rejected before submission with <strong>NullifierUsed (#6)</strong>.
            </p>
          </div>
          <code>proposal_id = 1 · nullifier replay blocked</code>
        </div>
      </section>

      <section id="zk-flow" className="grid two">
        <article className="panel">
          <SectionTitle
            title="What the zero knowledge proof does"
            copy="The proof is load-bearing: cast_vote only mutates tally after proof verification succeeds."
          />
          <div className="flow">
            <div className="flow-node private">
              <span>Private witness</span>
              identity secret · trapdoor · Merkle path
            </div>
            <div className="arrow">→</div>
            <div className="flow-node">
              <span>Noir circuit</span>
              membership · binary vote · proposal nullifier
            </div>
            <div className="arrow">→</div>
            <div className="flow-node">
              <span>Soroban verifier</span>
              Nethermind UltraHonk verifier checks proof onchain
            </div>
            <div className="arrow">→</div>
            <div className="flow-node public">
              <span>Public result</span>
              yes/no tally and spent nullifier
            </div>
          </div>
        </article>

        <article className="panel facts">
          <SectionTitle
            title="Verifier facts"
            copy="These are the concrete proof and contract settings used by the current build."
          />
          {proofFacts.map(([label, value]) => (
            <div className="fact" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <SectionTitle
            title="Public input order"
            copy="The contract reconstructs this exact order from proposal state and call arguments."
          />
          <ol className="input-order">
            {PUBLIC_INPUT_ORDER.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ol>
        </article>

        <article id="reproduce" className="panel terminal-card">
          <SectionTitle title="Reproduce locally" copy="The README contains the complete setup and testnet notes." />
          <pre>
            {commands.map((cmd) => `$ ${cmd}`).join("\n")}
          </pre>
        </article>
      </section>

      <section id="privacy" className="panel privacy">
        <SectionTitle
          title="Honest privacy boundary"
          copy="This is anonymous eligibility with transparent results, not encrypted tallying."
        />
        <div className="privacy-grid">
          <div>
            <h3>Hidden by the proof</h3>
            <ul>
              <li>Identity secret and trapdoor</li>
              <li>Merkle membership path</li>
              <li>Which registered leaf produced the vote</li>
            </ul>
          </div>
          <div>
            <h3>Public on Stellar</h3>
            <ul>
              <li>Vote value: 0 or 1</li>
              <li>Proposal-scoped nullifier</li>
              <li>Live yes/no tally and finalized result</li>
            </ul>
          </div>
          <div>
            <h3>Not claimed</h3>
            <ul>
              <li>No sealed ballots</li>
              <li>No hidden interim tally</li>
              <li>No coercion resistance</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
