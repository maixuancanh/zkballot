import "../src/styles.css";
import { PUBLIC_INPUT_ORDER } from "./lib/prover.js";
import Workflow from "./Workflow.jsx";

const EXPLORER = "https://stellar.expert/explorer/testnet";
const CONTRACT_ID = "CDDW36USNVE3Y2URBH2LXCCLFLFG65BWMHKEXUE23EMBBKOYTKA6Z4V6";

const lifecycle = [
  {
    label: "Deploy static-VK ballot contract",
    status: "submitted",
    tx: "b9ad22820660d3a5c652df0f31c88fd41afadaaeefd98f75e849e5cb2aa51015",
  },
  {
    label: "Register voter 0 commitment",
    status: "registered",
    tx: "ad63620d0a7b2019a626ab7d93c6a3e2a531ae557555726008d7451bf3c5ceb3",
  },
  {
    label: "Register voter 1 commitment",
    status: "registered",
    tx: "397d28a2a176c590662c91b824b77684778a39658e40b492cea6044d3534cf9f",
  },
  {
    label: "Register voter 2 commitment",
    status: "registered",
    tx: "dcefa6e837f2bebfb93828b09d71b9f2a1b6488a6eeb6f61fc53d21a21d3066e",
  },
  {
    label: "Create proposal with 3-leaf root snapshot",
    status: "proposal #1",
    tx: "9ce8e9f6e1df231459e3c78c2d0299439262768a28661b09f1247434cd9c8331",
  },
  {
    label: "Cast vote: YES",
    status: "proof verified",
    tx: "3871a69de3d7bc1fdd8bf2444af3404126acbc945612f5e907e3a3a84b57856c",
  },
  {
    label: "Cast vote: NO",
    status: "proof verified",
    tx: "499a88e093f8ec8f66a9ccf0748a2ee236bfc2699747931c9e53ee018ffc0fb7",
  },
  {
    label: "Cast vote: YES",
    status: "proof verified",
    tx: "ecf70f272ffcaa7eab1d8fca49db0ff2db35639ace55d603db4b3c4b29f4ddd4",
  },
  {
    label: "Finalize proposal after deadline",
    status: "finalized",
    tx: "0556cd815c84e59c2dc87edd72b9df5c0f21f4053fbec0e20227e371547f870f",
  },
];

const proofFacts = [
  ["Circuit", "Noir ballot membership circuit"],
  ["Proof system", "UltraHonk, oracle_hash = keccak"],
  ["Verifier", "Nethermind Soroban UltraHonk verifier"],
  ["SDK", "Soroban SDK 26.1.0"],
  ["Tree depth", "20"],
  ["Contract domain", "Random canonical 31-byte field"],
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
          <a href="#vote">Vote</a>
          <a href="#evidence">Evidence</a>
          <a href="#zk-flow">ZK flow</a>
          <a href="#privacy">Privacy</a>
          <a href="#reproduce">Reproduce</a>
        </div>
      </nav>

      <Workflow />

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
