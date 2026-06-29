import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fieldToBytes, u64ToField } from "./encoding.js";
import {
  buildTree,
  identityCommitment,
  initPoseidon,
  merkleProof,
  poseidon2Hash,
  verifyPath,
} from "./merkle.js";

const TREE_DEPTH = 4;
const DOMAIN_ZKBALLOT = 1514885697n;

const rootDir = new URL("..", import.meta.url).pathname;
const circuitDir = join(rootDir, "circuits", "ballot");
const outDir = join(rootDir, "artifacts", "fixture");

function field(value: bigint): string {
  return `"${value.toString()}"`;
}

function fieldArray(values: readonly bigint[]): string {
  return `[${values.map(field).join(", ")}]`;
}

function u1Array(values: readonly number[]): string {
  return `[${values.join(", ")}]`;
}

function concatBytes(fields: readonly bigint[]): Uint8Array {
  const out = new Uint8Array(fields.length * 32);
  fields.forEach((value, index) => out.set(fieldToBytes(value), index * 32));
  return out;
}

await initPoseidon();

const identitySecret = 111n;
const identityTrapdoor = 222n;
const contractDomain = u64ToField(987654n);
const proposalId = u64ToField(7n);
const vote = 1n;

const commitment = identityCommitment(identitySecret, identityTrapdoor);
const tree = buildTree([commitment], TREE_DEPTH);
const proof = merkleProof(tree, 0);

if (!verifyPath(commitment, proof.path, proof.indices, proof.root)) {
  throw new Error("generated Merkle proof is invalid");
}

const externalNullifier = poseidon2Hash([
  DOMAIN_ZKBALLOT,
  contractDomain,
  proposalId,
]);
const nullifier = poseidon2Hash([identitySecret, externalNullifier]);
const publicInputs = [proof.root, contractDomain, proposalId, nullifier, vote];

mkdirSync(circuitDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(circuitDir, "Prover.toml"),
  [
    `identity_secret = ${field(identitySecret)}`,
    `identity_trapdoor = ${field(identityTrapdoor)}`,
    `merkle_path = ${fieldArray(proof.path)}`,
    `path_indices = ${u1Array(proof.indices)}`,
    `merkle_root = ${field(proof.root)}`,
    `contract_domain = ${field(contractDomain)}`,
    `proposal_id = ${field(proposalId)}`,
    `nullifier = ${field(nullifier)}`,
    `vote = ${field(vote)}`,
    "",
  ].join("\n"),
);

writeFileSync(join(outDir, "expected_public_inputs"), concatBytes(publicInputs));
writeFileSync(
  join(outDir, "fixture.json"),
  JSON.stringify(
    {
      treeDepth: TREE_DEPTH,
      identitySecret: identitySecret.toString(),
      identityTrapdoor: identityTrapdoor.toString(),
      commitment: commitment.toString(),
      merkleRoot: proof.root.toString(),
      contractDomain: contractDomain.toString(),
      proposalId: proposalId.toString(),
      nullifier: nullifier.toString(),
      vote: vote.toString(),
      publicInputs: publicInputs.map((value) => value.toString()),
    },
    null,
    2,
  ),
);

console.log(`Wrote ${join(circuitDir, "Prover.toml")}`);
console.log(`Wrote ${join(outDir, "fixture.json")}`);
