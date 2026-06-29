#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Bytes, BytesN, Env, String};

fn setup() -> (Env, BallotContractClient<'static>, Address, BytesN<32>) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let vk = Bytes::from_slice(&env, &[1, 2, 3]);
    let contract_id = env.register(BallotContract, (&admin, &987_654_u64, &vk));
    let client = BallotContractClient::new(&env, &contract_id);
    let root = BytesN::from_array(&env, &[7; 32]);
    (env, client, admin, root)
}

#[test]
fn constructor_exposes_admin_domain_and_vk() {
    let (env, client, admin, _root) = setup();

    assert_eq!(client.admin(), admin);
    assert_eq!(client.contract_domain(), 987_654);
    assert_eq!(client.verifying_key(), Bytes::from_slice(&env, &[1, 2, 3]));
}

#[test]
fn admin_creates_proposal_and_registers_root() {
    let (env, client, _admin, root) = setup();

    let proposal = client
        .try_create_proposal(&1, &String::from_str(&env, "Ship zkBallot"), &root)
        .unwrap()
        .unwrap();

    assert_eq!(proposal.id, 1);
    assert_eq!(proposal.active, true);
    assert_eq!(client.root_exists(&root), true);
    assert_eq!(client.tally(&1), Tally { yes: 0, no: 0 });
}

#[test]
fn cast_vote_updates_public_tally_and_blocks_double_vote() {
    let (env, client, _admin, root) = setup();
    client.create_proposal(&1, &String::from_str(&env, "Ship zkBallot"), &root);

    let nullifier = BytesN::from_array(&env, &[9; 32]);
    let public_inputs = Bytes::from_array(&env, &[0; 160]);
    let proof = Bytes::from_slice(&env, &[42]);

    let tally = client
        .try_cast_vote(&1, &root, &nullifier, &1, &public_inputs, &proof)
        .unwrap()
        .unwrap();
    assert_eq!(tally, Tally { yes: 1, no: 0 });
    assert_eq!(client.has_voted(&1, &nullifier), true);

    let second = client.try_cast_vote(&1, &root, &nullifier, &0, &public_inputs, &proof);
    assert_eq!(second, Err(Ok(Error::NullifierUsed)));
}

#[test]
fn cast_vote_rejects_invalid_vote_and_unknown_root() {
    let (env, client, _admin, root) = setup();
    client.create_proposal(&1, &String::from_str(&env, "Ship zkBallot"), &root);

    let nullifier = BytesN::from_array(&env, &[9; 32]);
    let public_inputs = Bytes::from_array(&env, &[0; 160]);
    let proof = Bytes::from_slice(&env, &[42]);

    let invalid_vote = client.try_cast_vote(&1, &root, &nullifier, &2, &public_inputs, &proof);
    assert_eq!(invalid_vote, Err(Ok(Error::InvalidVote)));

    let wrong_root = BytesN::from_array(&env, &[8; 32]);
    let unknown_root = client.try_cast_vote(&1, &wrong_root, &nullifier, &1, &public_inputs, &proof);
    assert_eq!(unknown_root, Err(Ok(Error::RootMissing)));
}
