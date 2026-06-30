import { describe, expect, it } from "vitest";
import {
  initialWorkflowState,
  workflowReducer,
} from "./workflow.js";

function reduce(actions) {
  return actions.reduce(workflowReducer, initialWorkflowState);
}

describe("interactive ballot workflow", () => {
  it("advances from wallet connection through registration, proof, and result", () => {
    const state = reduce([
      { type: "wallet.connected", address: "GABC", network: "TESTNET" },
      { type: "identity.created", commitment: "0xcommitment" },
      { type: "identity.registered", tx: "register-tx" },
      { type: "vote.selected", vote: 1 },
      { type: "proof.generated", proofId: "proof-1", nullifier: "0xnullifier" },
      { type: "vote.submitted", tx: "vote-tx", tally: { yes: 3, no: 1 } },
    ]);

    expect(state.step).toBe("results");
    expect(state.wallet.address).toBe("GABC");
    expect(state.identity.registered).toBe(true);
    expect(state.vote).toBe(1);
    expect(state.proof.status).toBe("verified");
    expect(state.result).toEqual({
      tx: "vote-tx",
      tally: { yes: 3, no: 1 },
    });
  });

  it("does not generate a proof before registration and vote selection", () => {
    expect(() =>
      workflowReducer(initialWorkflowState, {
        type: "proof.generated",
        proofId: "proof-1",
        nullifier: "0xnullifier",
      }),
    ).toThrow(/register.*select/i);
  });

  it("surfaces proof and transaction failures without advancing", () => {
    const ready = reduce([
      { type: "wallet.connected", address: "GABC", network: "TESTNET" },
      { type: "identity.created", commitment: "0xcommitment" },
      { type: "identity.registered", tx: "register-tx" },
      { type: "vote.selected", vote: 0 },
    ]);
    const proofFailure = workflowReducer(ready, {
      type: "proof.failed",
      error: "witness rejected",
    });
    expect(proofFailure.step).toBe("vote");
    expect(proofFailure.error).toMatch(/witness rejected/);

    const proved = workflowReducer(ready, {
      type: "proof.generated",
      proofId: "proof-1",
      nullifier: "0xnullifier",
    });
    const txFailure = workflowReducer(proved, {
      type: "vote.failed",
      error: "NullifierUsed (#6)",
    });
    expect(txFailure.step).toBe("vote");
    expect(txFailure.error).toMatch(/NullifierUsed/);
  });
});
