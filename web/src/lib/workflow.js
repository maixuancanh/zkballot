export const initialWorkflowState = {
  step: "connect",
  wallet: null,
  identity: null,
  vote: null,
  proof: { status: "idle" },
  result: null,
  error: null,
};

export function workflowReducer(state, action) {
  switch (action.type) {
    case "reset":
      return initialWorkflowState;
    case "wallet.connected":
      return {
        ...state,
        step: "register",
        wallet: { address: action.address, network: action.network },
        error: null,
      };
    case "identity.created":
      if (!state.wallet) throw new Error("Connect a wallet first");
      return {
        ...state,
        identity: { commitment: action.commitment, registered: false },
        error: null,
      };
    case "identity.registered":
      if (!state.identity) throw new Error("Create an identity first");
      return {
        ...state,
        step: "vote",
        identity: { ...state.identity, registered: true, tx: action.tx },
        error: null,
      };
    case "vote.selected":
      if (!state.identity?.registered) throw new Error("Register an identity first");
      if (action.vote !== 0 && action.vote !== 1) throw new Error("Vote must be 0 or 1");
      return {
        ...state,
        vote: action.vote,
        proof: { status: "idle" },
        error: null,
      };
    case "proof.generating":
      return { ...state, proof: { status: "generating" }, error: null };
    case "proof.generated":
      if (!state.identity?.registered || state.vote === null) {
        throw new Error("Register an identity and select a vote first");
      }
      return {
        ...state,
        proof: {
          status: "verified",
          proofId: action.proofId,
          nullifier: action.nullifier,
        },
        error: null,
      };
    case "proof.failed":
      return {
        ...state,
        proof: { status: "failed" },
        error: action.error,
      };
    case "vote.submitted":
      if (state.proof.status !== "verified") throw new Error("Generate a proof first");
      return {
        ...state,
        step: "results",
        result: { tx: action.tx, tally: action.tally },
        error: null,
      };
    case "vote.failed":
      return { ...state, error: action.error };
    default:
      return state;
  }
}
