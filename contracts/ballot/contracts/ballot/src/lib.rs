#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Bytes, BytesN, Env,
};
#[cfg(all(not(test), feature = "nethermind-verifier"))]
use ultrahonk_soroban_verifier::UltraHonkVerifier as NethermindUltraHonkVerifier;

#[cfg(all(not(test), not(feature = "nethermind-verifier")))]
compile_error!("A verifier backend is required. Enable the `nethermind-verifier` feature.");

#[cfg(all(feature = "static-vk", not(test)))]
const STATIC_VK: &[u8] = include_bytes!("../../../../../artifacts/ballot/vk");

const PERSISTENT_BUMP_THRESHOLD: u32 = 345_600;
const PERSISTENT_LIFETIME: u32 = 2_073_600;
const INSTANCE_BUMP_THRESHOLD: u32 = 345_600;
const INSTANCE_LIFETIME: u32 = 2_073_600;

#[contract]
pub struct BallotContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RootState {
    pub root: BytesN<32>,
    pub leaf_count: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub meta_hash: BytesN<32>,
    pub root: BytesN<32>,
    pub leaf_count: u32,
    pub deadline: u64,
    pub yes: u64,
    pub no: u64,
    pub finalized: bool,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Tally {
    pub yes: u64,
    pub no: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
enum DataKey {
    Admin,
    ContractDomain,
    VerifyingKey,
    RootState,
    NextProposalId,
    Commitment(BytesN<32>),
    Proposal(u64),
    Nullifier(u64, BytesN<32>),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    ProposalExists = 3,
    ProposalMissing = 4,
    RootMissing = 5,
    NullifierUsed = 6,
    InvalidVote = 7,
    InvalidPublicInputs = 8,
    EmptyProof = 9,
    VkParseError = 10,
    ProofParseError = 11,
    VerificationFailed = 12,
    CommitmentExists = 13,
    NonSequentialIndex = 14,
    NonMonotonicLeafCount = 15,
    PastDeadline = 16,
    ProposalClosed = 17,
    Finalized = 18,
    TooEarlyToFinalize = 19,
}

#[contractimpl]
impl BallotContract {
    pub fn __constructor(
        env: Env,
        admin: Address,
        contract_domain: BytesN<32>,
        vk_bytes: Bytes,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        let zero_root = BytesN::from_array(&env, &[0; 32]);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::ContractDomain, &contract_domain);
        env.storage()
            .instance()
            .set(&DataKey::VerifyingKey, &vk_bytes);
        env.storage().instance().set(
            &DataKey::RootState,
            &RootState {
                root: zero_root,
                leaf_count: 0,
            },
        );
        env.storage().instance().set(&DataKey::NextProposalId, &1_u64);
        Self::extend_instance_ttl(&env);
    }

    pub fn admin(env: Env) -> Result<Address, Error> {
        Self::extend_instance_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    pub fn contract_domain(env: Env) -> Result<BytesN<32>, Error> {
        Self::extend_instance_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::ContractDomain)
            .ok_or(Error::NotInitialized)
    }

    pub fn verifying_key(env: Env) -> Result<Bytes, Error> {
        Self::extend_instance_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::VerifyingKey)
            .ok_or(Error::NotInitialized)
    }

    pub fn get_root(env: Env) -> Result<RootState, Error> {
        Self::extend_instance_ttl(&env);
        env.storage()
            .instance()
            .get(&DataKey::RootState)
            .ok_or(Error::NotInitialized)
    }

    pub fn register_voter(
        env: Env,
        commitment: BytesN<32>,
        index: u32,
        new_root: BytesN<32>,
        new_leaf_count: u32,
    ) -> Result<RootState, Error> {
        Self::require_admin(&env)?;
        let current = Self::get_root(env.clone())?;
        if env
            .storage()
            .persistent()
            .has(&DataKey::Commitment(commitment.clone()))
        {
            return Err(Error::CommitmentExists);
        }
        if index != current.leaf_count {
            return Err(Error::NonSequentialIndex);
        }
        if new_leaf_count <= current.leaf_count || new_leaf_count != index + 1 {
            return Err(Error::NonMonotonicLeafCount);
        }

        let next = RootState {
            root: new_root,
            leaf_count: new_leaf_count,
        };
        let commitment_key = DataKey::Commitment(commitment);
        env.storage().persistent().set(&commitment_key, &index);
        Self::extend_persistent_ttl(&env, &commitment_key);
        env.storage().instance().set(&DataKey::RootState, &next);
        Self::extend_instance_ttl(&env);
        Ok(next)
    }

    pub fn commitment_index(env: Env, commitment: BytesN<32>) -> Result<u32, Error> {
        let key = DataKey::Commitment(commitment);
        let index = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::RootMissing)?;
        Self::extend_persistent_ttl(&env, &key);
        Ok(index)
    }

    pub fn create_proposal(
        env: Env,
        meta_hash: BytesN<32>,
        deadline: u64,
    ) -> Result<u64, Error> {
        Self::require_admin(&env)?;
        if deadline <= env.ledger().timestamp() {
            return Err(Error::PastDeadline);
        }
        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextProposalId)
            .ok_or(Error::NotInitialized)?;
        let root_state = Self::get_root(env.clone())?;
        let proposal = Proposal {
            id,
            meta_hash,
            root: root_state.root,
            leaf_count: root_state.leaf_count,
            deadline,
            yes: 0,
            no: 0,
            finalized: false,
        };
        let key = DataKey::Proposal(id);
        env.storage().persistent().set(&key, &proposal);
        Self::extend_persistent_ttl(&env, &key);
        env.storage().instance().set(&DataKey::NextProposalId, &(id + 1));
        Self::extend_instance_ttl(&env);
        Ok(id)
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<Proposal, Error> {
        Self::proposal(env, proposal_id)
    }

    pub fn proposal(env: Env, proposal_id: u64) -> Result<Proposal, Error> {
        let key = DataKey::Proposal(proposal_id);
        let proposal = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::ProposalMissing)?;
        Self::extend_persistent_ttl(&env, &key);
        Ok(proposal)
    }

    pub fn tally(env: Env, proposal_id: u64) -> Result<Tally, Error> {
        let proposal = Self::proposal(env, proposal_id)?;
        Ok(Tally {
            yes: proposal.yes,
            no: proposal.no,
        })
    }

    pub fn has_voted(env: Env, proposal_id: u64, nullifier: BytesN<32>) -> bool {
        let key = DataKey::Nullifier(proposal_id, nullifier);
        let has = env.storage().persistent().has(&key);
        if has {
            Self::extend_persistent_ttl(&env, &key);
        }
        has
    }

    pub fn cast_vote(
        env: Env,
        proposal_id: u64,
        proof: Bytes,
        nullifier: BytesN<32>,
        vote: u32,
    ) -> Result<Tally, Error> {
        if vote > 1 {
            return Err(Error::InvalidVote);
        }
        if proof.is_empty() {
            return Err(Error::EmptyProof);
        }
        let proposal = Self::proposal(env.clone(), proposal_id)?;
        if proposal.finalized {
            return Err(Error::Finalized);
        }
        if env.ledger().timestamp() >= proposal.deadline {
            return Err(Error::ProposalClosed);
        }
        if Self::has_voted(env.clone(), proposal_id, nullifier.clone()) {
            return Err(Error::NullifierUsed);
        }

        let public_inputs =
            Self::pack_public_inputs(&env, &proposal.root, proposal_id, &nullifier, vote)?;
        Self::verify_ultrahonk(&env, &public_inputs, &proof)?;
        Self::record_vote(env, proposal, nullifier, vote)
    }

    pub fn finalize(env: Env, proposal_id: u64) -> Result<Tally, Error> {
        let mut proposal = Self::proposal(env.clone(), proposal_id)?;
        if proposal.finalized {
            return Err(Error::Finalized);
        }
        if env.ledger().timestamp() < proposal.deadline {
            return Err(Error::TooEarlyToFinalize);
        }
        proposal.finalized = true;
        let tally = Tally {
            yes: proposal.yes,
            no: proposal.no,
        };
        let key = DataKey::Proposal(proposal_id);
        env.storage().persistent().set(&key, &proposal);
        Self::extend_persistent_ttl(&env, &key);
        Ok(tally)
    }

    pub fn pack_public_inputs_view(
        env: Env,
        proposal_id: u64,
        nullifier: BytesN<32>,
        vote: u32,
    ) -> Result<Bytes, Error> {
        let proposal = Self::proposal(env.clone(), proposal_id)?;
        Self::pack_public_inputs(&env, &proposal.root, proposal_id, &nullifier, vote)
    }

    fn pack_public_inputs(
        env: &Env,
        merkle_root: &BytesN<32>,
        proposal_id: u64,
        nullifier: &BytesN<32>,
        vote: u32,
    ) -> Result<Bytes, Error> {
        let contract_domain: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::ContractDomain)
            .ok_or(Error::NotInitialized)?;
        let mut out = Bytes::new(env);
        out.append(&Bytes::from(merkle_root.clone()));
        out.append(&Bytes::from(contract_domain));
        out.append(&Self::field_bytes_from_u64(env, proposal_id));
        out.append(&Bytes::from(nullifier.clone()));
        out.append(&Self::field_bytes_from_u32(env, vote));
        Ok(out)
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

    #[cfg(not(test))]
    fn verify_ultrahonk(env: &Env, public_inputs: &Bytes, proof: &Bytes) -> Result<(), Error> {
        #[cfg(feature = "static-vk")]
        let vk_bytes = Bytes::from_slice(env, STATIC_VK);

        #[cfg(not(feature = "static-vk"))]
        let vk_bytes: Bytes = env
            .storage()
            .instance()
            .get(&DataKey::VerifyingKey)
            .ok_or(Error::NotInitialized)?;
        #[cfg(feature = "nethermind-verifier")]
        {
            let verifier =
                NethermindUltraHonkVerifier::new(env, &vk_bytes).map_err(|_| Error::VkParseError)?;
            verifier
                .verify(env, proof, public_inputs)
                .map_err(|_| Error::VerificationFailed)?;
            return Ok(());
        }
    }

    #[cfg(test)]
    fn verify_ultrahonk(_env: &Env, _public_inputs: &Bytes, proof: &Bytes) -> Result<(), Error> {
        if proof.is_empty() {
            return Err(Error::EmptyProof);
        }
        if proof.get(0) == Some(0) {
            return Err(Error::VerificationFailed);
        }
        Ok(())
    }

    fn require_admin(env: &Env) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        admin.require_auth();
        Self::extend_instance_ttl(env);
        Ok(())
    }

    fn record_vote(
        env: Env,
        mut proposal: Proposal,
        nullifier: BytesN<32>,
        vote: u32,
    ) -> Result<Tally, Error> {
        let nullifier_key = DataKey::Nullifier(proposal.id, nullifier);
        env.storage().persistent().set(&nullifier_key, &true);
        Self::extend_persistent_ttl(&env, &nullifier_key);

        if vote == 1 {
            proposal.yes += 1;
        } else {
            proposal.no += 1;
        }
        let tally = Tally {
            yes: proposal.yes,
            no: proposal.no,
        };
        let proposal_key = DataKey::Proposal(proposal.id);
        env.storage().persistent().set(&proposal_key, &proposal);
        Self::extend_persistent_ttl(&env, &proposal_key);
        Ok(tally)
    }

    fn extend_instance_ttl(env: &Env) {
        env.storage()
            .instance()
            .extend_ttl(INSTANCE_BUMP_THRESHOLD, INSTANCE_LIFETIME);
    }

    fn extend_persistent_ttl(env: &Env, key: &DataKey) {
        env.storage()
            .persistent()
            .extend_ttl(key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_LIFETIME);
    }
}

mod test;
