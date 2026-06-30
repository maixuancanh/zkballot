export const PUBLIC_INPUT_ORDER = [
  "merkleRoot",
  "contractDomain",
  "proposalId",
  "nullifier",
  "vote",
];

export function packPublicInputFields(fields) {
  return PUBLIC_INPUT_ORDER.map((key) => {
    const value = fields[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`Missing public input: ${key}`);
    }
    return value;
  });
}

export async function proveVote(prover, input) {
  const result = await prover.prove(input);
  if (!result?.proof || !result?.publicInputs) {
    throw new Error("Proof generation failed");
  }
  return result;
}
