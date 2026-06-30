import { describe, expect, it } from "vitest";
import { packPublicInputFields, proveVote } from "./prover.js";

describe("prover helpers", () => {
  it("packs public inputs in the contract/circuit order", () => {
    expect(
      packPublicInputFields({
        merkleRoot: "root",
        contractDomain: "domain",
        proposalId: "proposal",
        nullifier: "nullifier",
        vote: "vote",
      }),
    ).toEqual(["root", "domain", "proposal", "nullifier", "vote"]);
  });

  it("surfaces proof generation failure", async () => {
    await expect(proveVote({ prove: async () => ({}) }, {})).rejects.toThrow(/proof/i);
  });
});
