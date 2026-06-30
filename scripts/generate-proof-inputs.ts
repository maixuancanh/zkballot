import { mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { fieldToBytes, u64ToField } from "./encoding.js";
import {
  buildTree,
  identityCommitment,
  initPoseidon,
  merkleProof,
  poseidon2Hash,
  verifyPath,
} from "./merkle.js";

const TREE_DEPTH = Number(process.env.TREE_DEPTH ?? "20");
const DOMAIN_ZKBALLOT = 1514885697n;

const rootDir = new URL("..", import.meta.url).pathname;
const circuitDir = join(rootDir, "circuits", "ballot");
const fixtureDirInput = process.env.FIXTURE_DIR ?? "artifacts/fixture";
const outDir = isAbsolute(fixtureDirInput)
  ? fixtureDirInput
  : join(rootDir, fixtureDirInput);

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

function fieldHex(value: bigint): string {
  return Buffer.from(fieldToBytes(value)).toString("hex");
}

await initPoseidon();

function parseBigIntList(name: string, fallback: readonly bigint[]): bigint[] {
  const raw = process.env[name];
  if (!raw) return [...fallback];
  return raw.split(",").map((value) => BigInt(value.trim()));
}

const identitySecrets = parseBigIntList("IDENTITY_SECRETS", [111n]);
const identityTrapdoors = parseBigIntList("IDENTITY_TRAPDOORS", [222n]);
if (identitySecrets.length !== identityTrapdoors.length) {
  throw new Error("IDENTITY_SECRETS and IDENTITY_TRAPDOORS must have the same length");
}

const proverIndex = Number(process.env.PROVER_INDEX ?? "0");
if (!Number.isInteger(proverIndex) || proverIndex < 0 || proverIndex >= identitySecrets.length) {
  throw new Error("PROVER_INDEX is outside the identity list");
}

const identitySecret = identitySecrets[proverIndex];
const identityTrapdoor = identityTrapdoors[proverIndex];
const contractDomain = u64ToField(BigInt(process.env.CONTRACT_DOMAIN ?? "987654"));
const proposalId = u64ToField(BigInt(process.env.PROPOSAL_ID ?? "1"));
const vote = BigInt(process.env.VOTE ?? "1");

const commitments = identitySecrets.map((secret, index) =>
  identityCommitment(secret, identityTrapdoors[index]),
);
const commitment = commitments[proverIndex];
const tree = buildTree(commitments, TREE_DEPTH);
const proof = merkleProof(tree, proverIndex);
const appendRoots = commitments.map((_, index) =>
  buildTree(commitments.slice(0, index + 1), TREE_DEPTH).root,
);

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
      proverIndex,
      identityCount: identitySecrets.length,
      identitySecret: identitySecret.toString(),
      identityTrapdoor: identityTrapdoor.toString(),
      commitment: commitment.toString(),
      commitmentHex: fieldHex(commitment),
      commitments: commitments.map((value) => value.toString()),
      commitmentsHex: commitments.map(fieldHex),
      appendRoots: appendRoots.map((value) => value.toString()),
      appendRootsHex: appendRoots.map(fieldHex),
      merkleRoot: proof.root.toString(),
      merkleRootHex: fieldHex(proof.root),
      contractDomain: contractDomain.toString(),
      proposalId: proposalId.toString(),
      nullifier: nullifier.toString(),
      nullifierHex: fieldHex(nullifier),
      vote: vote.toString(),
      publicInputs: publicInputs.map((value) => value.toString()),
      publicInputsHex: publicInputs.map(fieldHex),
    },
    null,
    2,
  ),
);

console.log(`Wrote ${join(circuitDir, "Prover.toml")}`);
console.log(`Wrote ${join(outDir, "fixture.json")}`);
