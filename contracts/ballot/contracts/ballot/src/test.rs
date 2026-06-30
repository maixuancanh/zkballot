#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Bytes, BytesN, Env,
};

fn setup() -> (Env, BallotContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 1_000);
    let admin = Address::generate(&env);
    let vk = Bytes::from_slice(&env, &[1, 2, 3]);
    let contract_id = env.register(BallotContract, (&admin, &987_654_u64, &vk));
    let client = BallotContractClient::new(&env, &contract_id);
    (env, client, admin)
}

fn bytes32(env: &Env, value: u8) -> BytesN<32> {
    BytesN::from_array(env, &[value; 32])
}

fn field_bytes_from_u64(env: &Env, value: u64) -> Bytes {
    let mut bytes = [0u8; 32];
    bytes[24..32].copy_from_slice(&value.to_be_bytes());
    Bytes::from_array(env, &bytes)
}

fn field_bytes_from_u32(env: &Env, value: u32) -> Bytes {
    let mut bytes = [0u8; 32];
    bytes[28..32].copy_from_slice(&value.to_be_bytes());
    Bytes::from_array(env, &bytes)
}

fn expected_public_inputs(
    env: &Env,
    root: &BytesN<32>,
    proposal_id: u64,
    nullifier: &BytesN<32>,
    vote: u32,
) -> Bytes {
    let mut out = Bytes::new(env);
    out.append(&Bytes::from(root.clone()));
    out.append(&field_bytes_from_u64(env, 987_654));
    out.append(&field_bytes_from_u64(env, proposal_id));
    out.append(&Bytes::from(nullifier.clone()));
    out.append(&field_bytes_from_u32(env, vote));
    out
}

fn register_one(env: &Env, client: &BallotContractClient<'static>, value: u8) -> RootState {
    client.register_voter(&bytes32(env, value), &0, &bytes32(env, value + 10), &1)
}

fn create_proposal(
    env: &Env,
    client: &BallotContractClient<'static>,
    deadline: u64,
) -> u64 {
    client.create_proposal(&bytes32(env, 55), &deadline)
}

#[test]
fn constructor_exposes_admin_domain_vk_and_empty_root() {
    let (env, client, admin) = setup();

    assert_eq!(client.admin(), admin);
    assert_eq!(client.contract_domain(), 987_654);
    assert_eq!(client.verifying_key(), Bytes::from_slice(&env, &[1, 2, 3]));
    assert_eq!(
        client.get_root(),
        RootState {
            root: bytes32(&env, 0),
            leaf_count: 0
        }
    );
}

#[test]
fn admin_registers_append_only_voters() {
    let (env, client, _admin) = setup();

    let root = client
        .try_register_voter(&bytes32(&env, 1), &0, &bytes32(&env, 10), &1)
        .unwrap()
        .unwrap();
    assert_eq!(
        root,
        RootState {
            root: bytes32(&env, 10),
            leaf_count: 1
        }
    );
    assert_eq!(client.commitment_index(&bytes32(&env, 1)), 0);

    let duplicate = client.try_register_voter(&bytes32(&env, 1), &1, &bytes32(&env, 11), &2);
    assert_eq!(duplicate, Err(Ok(Error::CommitmentExists)));

    let non_sequential =
        client.try_register_voter(&bytes32(&env, 2), &3, &bytes32(&env, 12), &2);
    assert_eq!(non_sequential, Err(Ok(Error::NonSequentialIndex)));

    let non_monotonic =
        client.try_register_voter(&bytes32(&env, 2), &1, &bytes32(&env, 12), &1);
    assert_eq!(non_monotonic, Err(Ok(Error::NonMonotonicLeafCount)));
}

#[test]
fn proposal_snapshots_current_root_and_rejects_past_deadline() {
    let (env, client, _admin) = setup();
    let root = register_one(&env, &client, 1);

    let proposal_id = create_proposal(&env, &client, 2_000);
    let proposal = client.get_proposal(&proposal_id);
    assert_eq!(proposal.id, 1);
    assert_eq!(proposal.root, root.root);
    assert_eq!(proposal.leaf_count, 1);
    assert_eq!(proposal.deadline, 2_000);
    assert_eq!(proposal.finalized, false);
    assert_eq!(client.tally(&proposal_id), Tally { yes: 0, no: 0 });

    let past = client.try_create_proposal(&bytes32(&env, 56), &999);
    assert_eq!(past, Err(Ok(Error::PastDeadline)));
}

#[test]
fn cast_vote_reconstructs_public_inputs_updates_tally_and_blocks_replay() {
    let (env, client, _admin) = setup();
    let root = register_one(&env, &client, 1).root;
    let proposal_id = create_proposal(&env, &client, 2_000);
    let nullifier = bytes32(&env, 9);
    let proof = Bytes::from_slice(&env, &[42]);

    assert_eq!(
        client.pack_public_inputs_view(&proposal_id, &nullifier, &1),
        expected_public_inputs(&env, &root, proposal_id, &nullifier, 1)
    );

    let tally = client.cast_vote(&proposal_id, &proof, &nullifier, &1);
    assert_eq!(tally, Tally { yes: 1, no: 0 });
    assert_eq!(client.has_voted(&proposal_id, &nullifier), true);

    let second = client.try_cast_vote(&proposal_id, &proof, &nullifier, &1);
    assert_eq!(second, Err(Ok(Error::NullifierUsed)));
}

#[test]
fn cast_vote_rejects_invalid_vote_closed_proposal_and_empty_proof() {
    let (env, client, _admin) = setup();
    register_one(&env, &client, 1);
    let proposal_id = create_proposal(&env, &client, 2_000);
    let nullifier = bytes32(&env, 9);
    let proof = Bytes::from_slice(&env, &[42]);

    let invalid_vote = client.try_cast_vote(&proposal_id, &proof, &nullifier, &2);
    assert_eq!(invalid_vote, Err(Ok(Error::InvalidVote)));

    let empty_proof = client.try_cast_vote(&proposal_id, &Bytes::new(&env), &nullifier, &1);
    assert_eq!(empty_proof, Err(Ok(Error::EmptyProof)));

    env.ledger().with_mut(|li| li.timestamp = 2_000);
    let closed = client.try_cast_vote(&proposal_id, &proof, &nullifier, &1);
    assert_eq!(closed, Err(Ok(Error::ProposalClosed)));
}

#[test]
fn cross_proposal_replay_is_allowed_but_same_proposal_replay_is_blocked() {
    let (env, client, _admin) = setup();
    register_one(&env, &client, 1);
    let first = create_proposal(&env, &client, 2_000);
    let second = create_proposal(&env, &client, 2_000);
    let nullifier_one = bytes32(&env, 9);
    let nullifier_two = bytes32(&env, 10);
    let proof = Bytes::from_slice(&env, &[42]);

    assert_eq!(
        client.cast_vote(&first, &proof, &nullifier_one, &1),
        Tally { yes: 1, no: 0 }
    );
    assert_eq!(
        client.cast_vote(&second, &proof, &nullifier_two, &0),
        Tally { yes: 0, no: 1 }
    );
}

#[test]
fn finalize_requires_deadline_and_prevents_late_votes_or_repeat_finalization() {
    let (env, client, _admin) = setup();
    register_one(&env, &client, 1);
    let proposal_id = create_proposal(&env, &client, 2_000);
    let proof = Bytes::from_slice(&env, &[42]);
    client.cast_vote(&proposal_id, &proof, &bytes32(&env, 9), &1);

    let early = client.try_finalize(&proposal_id);
    assert_eq!(early, Err(Ok(Error::TooEarlyToFinalize)));

    env.ledger().with_mut(|li| li.timestamp = 2_000);
    assert_eq!(client.finalize(&proposal_id), Tally { yes: 1, no: 0 });

    let late_vote = client.try_cast_vote(&proposal_id, &proof, &bytes32(&env, 10), &0);
    assert_eq!(late_vote, Err(Ok(Error::Finalized)));

    let repeat = client.try_finalize(&proposal_id);
    assert_eq!(repeat, Err(Ok(Error::Finalized)));
}
