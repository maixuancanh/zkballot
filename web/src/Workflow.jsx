import { useReducer } from "react";
import {
  createRecoveryPayload,
  getOrCreateIdentity,
} from "./lib/identity.js";
import {
  initialWorkflowState,
  workflowReducer,
} from "./lib/workflow.js";

const REGISTER_TX =
  "ad63620d0a7b2019a626ab7d93c6a3e2a531ae557555726008d7451bf3c5ceb3";
const VOTE_TX =
  "3871a69de3d7bc1fdd8bf2444af3404126acbc945612f5e907e3a3a84b57856c";
const FIXTURE_PROOF_ID =
  "44a05f425f49d41ed83b0f21ce4e0dcefcf1587ccf93a61c2bb0b20cba0071e9";
const FIXTURE_NULLIFIER =
  "066a3584d4726e08418cca2b0f4cfbba853995292d58c7e782698526e82f79d4";

const steps = [
  ["connect", "Connect"],
  ["register", "Register"],
  ["vote", "Vote"],
  ["results", "Results"],
];

function short(value, head = 8, tail = 6) {
  if (!value) return "—";
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

async function localFingerprint(identity) {
  const bytes = new TextEncoder().encode(
    `${identity.identitySecret}:${identity.identityTrapdoor}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function downloadRecovery(identity) {
  const blob = new Blob([createRecoveryPayload(identity)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "zkballot-identity-recovery.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function StepRail({ current }) {
  const currentIndex = steps.findIndex(([key]) => key === current);
  return (
    <ol className="step-rail" aria-label="Voting workflow progress">
      {steps.map(([key, label], index) => (
        <li
          className={index === currentIndex ? "current" : index < currentIndex ? "done" : ""}
          key={key}
          aria-current={index === currentIndex ? "step" : undefined}
        >
          <span>{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export default function Workflow() {
  const [state, dispatch] = useReducer(workflowReducer, initialWorkflowState);

  const connect = () => {
    dispatch({
      type: "wallet.connected",
      address: "GDEMO…TESTNET",
      network: "TESTNET",
    });
  };

  const createIdentity = async () => {
    const identity = getOrCreateIdentity(window.localStorage);
    const commitment = await localFingerprint(identity);
    dispatch({ type: "identity.created", commitment });
  };

  const register = () => {
    dispatch({ type: "identity.registered", tx: REGISTER_TX });
  };

  const generateProof = () => {
    dispatch({ type: "proof.generating" });
    dispatch({
      type: "proof.generated",
      proofId: FIXTURE_PROOF_ID,
      nullifier: FIXTURE_NULLIFIER,
    });
  };

  const submitVote = () => {
    dispatch({
      type: "vote.submitted",
      tx: VOTE_TX,
      tally: { yes: 2, no: 1 },
    });
  };

  return (
    <section id="vote" className="workflow-shell" aria-labelledby="workflow-title">
      <header className="workflow-heading">
        <div>
          <h1 id="workflow-title">Cast an anonymous eligibility proof</h1>
          <p>Your membership leaf stays hidden. Your vote and tally are public.</p>
        </div>
        <div className="network-indicator">
          <span aria-hidden="true" /> Stellar Testnet
        </div>
      </header>

      <div className="workflow-layout">
        <div className="workflow-main">
          <StepRail current={state.step} />
          <div className="workflow-stage" aria-live="polite">
            {state.step === "connect" && (
              <div className="stage-content">
                <span className="stage-number">01</span>
                <h2>Connect</h2>
                <p>
                  Start a guided session against the public testnet evidence.
                  No transaction is sent from this browser.
                </p>
                <label>
                  Network
                  <input value="Stellar Testnet" readOnly />
                </label>
                <button className="workflow-primary" onClick={connect}>
                  Connect demo session
                </button>
              </div>
            )}

            {state.step === "register" && (
              <div className="stage-content">
                <span className="stage-number">02</span>
                <h2>Register identity</h2>
                <p>
                  Generate a canonical 31-byte identity locally, then load its
                  verified registration record from the testnet run.
                </p>
                <div className="wallet-row">
                  <span>Session</span>
                  <code>{state.wallet.address}</code>
                </div>
                {!state.identity ? (
                  <button className="workflow-primary" onClick={createIdentity}>
                    Create local identity
                  </button>
                ) : (
                  <>
                    <div className="wallet-row">
                      <span>Local fingerprint</span>
                      <code>{short(state.identity.commitment)}</code>
                    </div>
                    <div className="workflow-actions">
                      <button
                        className="workflow-secondary"
                        onClick={() =>
                          downloadRecovery(getOrCreateIdentity(window.localStorage))
                        }
                      >
                        Export recovery file
                      </button>
                      <button className="workflow-primary" onClick={register}>
                        Load verified registration
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {state.step === "vote" && (
              <div className="stage-content">
                <span className="stage-number">03</span>
                <h2>Vote on proposal #1</h2>
                <p>
                  Choose a public vote, then verify the checked-in UltraHonk
                  proof fixture used by the deployed contract.
                </p>
                <fieldset>
                  <legend>Your public choice</legend>
                  <div className="vote-choice">
                    <button
                      className={state.vote === 1 ? "selected" : ""}
                      onClick={() => dispatch({ type: "vote.selected", vote: 1 })}
                    >
                      YES
                    </button>
                    <button
                      className={state.vote === 0 ? "selected" : ""}
                      onClick={() => dispatch({ type: "vote.selected", vote: 0 })}
                    >
                      NO
                    </button>
                  </div>
                </fieldset>
                {state.proof.status === "verified" && (
                  <div className="workflow-success">
                    Proof fixture verified · nullifier {short(state.proof.nullifier)}
                  </div>
                )}
                {state.error && <div className="workflow-error">{state.error}</div>}
                <div className="workflow-actions">
                  <button
                    className="workflow-secondary"
                    disabled={state.vote === null}
                    onClick={generateProof}
                  >
                    Verify proof fixture
                  </button>
                  <button
                    className="workflow-primary"
                    disabled={state.proof.status !== "verified"}
                    onClick={submitVote}
                  >
                    Load verified vote
                  </button>
                </div>
              </div>
            )}

            {state.step === "results" && (
              <div className="stage-content">
                <span className="stage-number">04</span>
                <h2>Verified result</h2>
                <p>
                  The proof-backed transaction is public and the proposal is
                  finalized. The identity witness never appears on-chain.
                </p>
                <div className="workflow-tally">
                  <div><span>YES</span><strong>{state.result.tally.yes}</strong></div>
                  <div><span>NO</span><strong>{state.result.tally.no}</strong></div>
                </div>
                <div className="workflow-success">
                  Finalized · replay protection enabled
                </div>
                <a
                  className="workflow-primary link-button"
                  href={`https://stellar.expert/explorer/testnet/tx/${state.result.tx}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open vote transaction
                </a>
                <button
                  className="workflow-secondary"
                  onClick={() => dispatch({ type: "reset" })}
                >
                  Restart walkthrough
                </button>
              </div>
            )}
          </div>
          <div className="workflow-disclosure">
            <strong>Guided evidence mode.</strong> Controls replay the verified
            testnet lifecycle; they do not submit a new wallet transaction.
          </div>
        </div>

        <aside className="protocol-summary">
          <h2>Protocol summary</h2>
          <div className="boundary private-boundary">
            <strong>Private witness · kept local</strong>
            <span>Identity secret · trapdoor · Merkle path</span>
          </div>
          <div className="boundary-arrow" aria-hidden="true">↓</div>
          <div className="boundary public-boundary">
            <strong>Public inputs · on-chain</strong>
            <span>Root · domain · proposal · nullifier · vote</span>
          </div>
          <dl>
            <div><dt>Proof</dt><dd>UltraHonk</dd></div>
            <div><dt>Verifier</dt><dd>Nethermind</dd></div>
            <div><dt>Tree depth</dt><dd>20</dd></div>
            <div><dt>Tally</dt><dd>Public</dd></div>
          </dl>
          <p>
            The proof hides which registered leaf voted. It does not hide the
            selected vote or the tally.
          </p>
        </aside>
      </div>
    </section>
  );
}
