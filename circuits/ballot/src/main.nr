global TREE_DEPTH: u32 = 20;
global DOMAIN_ZKBALLOT: Field = 1514885697;

use dep::poseidon::poseidon2::Poseidon2;

fn hash2(left: Field, right: Field) -> Field {
    Poseidon2::hash([left, right], 2)
}

fn hash3(a: Field, b: Field, c: Field) -> Field {
    Poseidon2::hash([a, b, c], 3)
}

fn compute_root(
    leaf: Field,
    merkle_path: [Field; TREE_DEPTH],
    path_indices: [u1; TREE_DEPTH],
) -> Field {
    let mut current = leaf;
    for level in 0..TREE_DEPTH {
        if path_indices[level] == 0 {
            current = hash2(current, merkle_path[level]);
        } else {
            current = hash2(merkle_path[level], current);
        }
    }
    current
}

fn ballot(
    identity_secret: Field,
    identity_trapdoor: Field,
    merkle_path: [Field; TREE_DEPTH],
    path_indices: [u1; TREE_DEPTH],
    merkle_root: Field,
    contract_domain: Field,
    proposal_id: Field,
    nullifier: Field,
    vote: Field,
) {
    let commitment = hash2(identity_secret, identity_trapdoor);
    assert(compute_root(commitment, merkle_path, path_indices) == merkle_root);

    let external_nullifier = hash3(DOMAIN_ZKBALLOT, contract_domain, proposal_id);
    assert(hash2(identity_secret, external_nullifier) == nullifier);
    assert((vote == 0) | (vote == 1));
}

fn fixture() -> (Field, Field, [Field; TREE_DEPTH], [u1; TREE_DEPTH], Field, Field) {
    let secret = 111;
    let trapdoor = 222;
    let path = [0; TREE_DEPTH];
    let indices = [0 as u1; TREE_DEPTH];
    let commitment = hash2(secret, trapdoor);
    let root = compute_root(commitment, path, indices);
    (secret, trapdoor, path, indices, root, 987654)
}

fn expected_nullifier(secret: Field, contract_domain: Field, proposal_id: Field) -> Field {
    let external_nullifier = hash3(DOMAIN_ZKBALLOT, contract_domain, proposal_id);
    hash2(secret, external_nullifier)
}

#[test]
fn accepts_valid_vote() {
    let (secret, trapdoor, path, indices, root, domain) = fixture();
    let nullifier = expected_nullifier(secret, domain, 7);
    ballot(secret, trapdoor, path, indices, root, domain, 7, nullifier, 1);
}

#[test(should_fail)]
fn rejects_wrong_root() {
    let (secret, trapdoor, path, indices, root, domain) = fixture();
    let nullifier = expected_nullifier(secret, domain, 7);
    ballot(secret, trapdoor, path, indices, root + 1, domain, 7, nullifier, 1);
}

#[test(should_fail)]
fn rejects_wrong_domain() {
    let (secret, trapdoor, path, indices, root, domain) = fixture();
    let nullifier = expected_nullifier(secret, domain, 7);
    ballot(secret, trapdoor, path, indices, root, domain + 1, 7, nullifier, 1);
}

#[test(should_fail)]
fn rejects_wrong_proposal() {
    let (secret, trapdoor, path, indices, root, domain) = fixture();
    let nullifier = expected_nullifier(secret, domain, 7);
    ballot(secret, trapdoor, path, indices, root, domain, 8, nullifier, 1);
}

#[test(should_fail)]
fn rejects_wrong_nullifier() {
    let (secret, trapdoor, path, indices, root, domain) = fixture();
    let nullifier = expected_nullifier(secret, domain, 7);
    ballot(secret, trapdoor, path, indices, root, domain, 7, nullifier + 1, 1);
}

#[test(should_fail)]
fn rejects_non_binary_vote() {
    let (secret, trapdoor, path, indices, root, domain) = fixture();
    let nullifier = expected_nullifier(secret, domain, 7);
    ballot(secret, trapdoor, path, indices, root, domain, 7, nullifier, 2);
}

fn main(
    identity_secret: Field,
    identity_trapdoor: Field,
    merkle_path: [Field; TREE_DEPTH],
    path_indices: [u1; TREE_DEPTH],
    merkle_root: pub Field,
    contract_domain: pub Field,
    proposal_id: pub Field,
    nullifier: pub Field,
    vote: pub Field,
) {
    ballot(
        identity_secret,
        identity_trapdoor,
        merkle_path,
        path_indices,
        merkle_root,
        contract_domain,
        proposal_id,
        nullifier,
        vote,
    );
}
