#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Bytes, BytesN, Env, String,
};
#[cfg(not(test))]
use ultrahonk_rust_verifier::{UltraHonkVerifier, PROOF_BYTES};

#[contract]
pub struct BallotContract;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Proposal {
    pub id: u64,
    pub title: String,
    pub root: BytesN<32>,
    pub active: bool,
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
    Proposal(u64),
    Tally(u64),
    Root(BytesN<32>),
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
}

#[contractimpl]
impl BallotContract {
    pub fn __constructor(env: Env, admin: Address, contract_domain: u64, vk_bytes: Bytes) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::ContractDomain, &contract_domain);
        env.storage()
            .instance()
            .set(&DataKey::VerifyingKey, &vk_bytes);
    }

    pub fn admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    pub fn contract_domain(env: Env) -> Result<u64, Error> {
        env.storage()
            .instance()
            .get(&DataKey::ContractDomain)
            .ok_or(Error::NotInitialized)
    }

    pub fn verifying_key(env: Env) -> Result<Bytes, Error> {
        env.storage()
            .instance()
            .get(&DataKey::VerifyingKey)
            .ok_or(Error::NotInitialized)
    }

    pub fn create_proposal(
        env: Env,
        proposal_id: u64,
        title: String,
        root: BytesN<32>,
    ) -> Result<Proposal, Error> {
        Self::require_admin(&env)?;
        if env.storage().persistent().has(&DataKey::Proposal(proposal_id)) {
            return Err(Error::ProposalExists);
        }
        let proposal = Proposal {
            id: proposal_id,
            title,
            root: root.clone(),
            active: true,
        };
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage()
            .persistent()
            .set(&DataKey::Tally(proposal_id), &Tally { yes: 0, no: 0 });
        env.storage().persistent().set(&DataKey::Root(root), &true);
        Ok(proposal)
    }

    pub fn close_proposal(env: Env, proposal_id: u64) -> Result<Proposal, Error> {
        Self::require_admin(&env)?;
        let mut proposal = Self::proposal(env.clone(), proposal_id)?;
        proposal.active = false;
        env.storage()
            .persistent()
            .set(&DataKey::Proposal(proposal_id), &proposal);
        Ok(proposal)
    }

    pub fn add_root(env: Env, root: BytesN<32>) -> Result<(), Error> {
        Self::require_admin(&env)?;
        env.storage().persistent().set(&DataKey::Root(root), &true);
        Ok(())
    }

    pub fn root_exists(env: Env, root: BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::Root(root))
    }

    pub fn proposal(env: Env, proposal_id: u64) -> Result<Proposal, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Proposal(proposal_id))
            .ok_or(Error::ProposalMissing)
    }

    pub fn tally(env: Env, proposal_id: u64) -> Result<Tally, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Tally(proposal_id))
            .ok_or(Error::ProposalMissing)
    }

    pub fn has_voted(env: Env, proposal_id: u64, nullifier: BytesN<32>) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Nullifier(proposal_id, nullifier))
    }

    pub fn cast_vote(
        env: Env,
        proposal_id: u64,
        merkle_root: BytesN<32>,
        nullifier: BytesN<32>,
        vote: u32,
        public_inputs: Bytes,
        proof: Bytes,
    ) -> Result<Tally, Error> {
        if vote > 1 {
            return Err(Error::InvalidVote);
        }
        if public_inputs.len() != 160 {
            return Err(Error::InvalidPublicInputs);
        }
        if !Self::public_inputs_match(
            &env,
            &public_inputs,
            &merkle_root,
            proposal_id,
            &nullifier,
            vote,
        )? {
            return Err(Error::InvalidPublicInputs);
        }
        if proof.is_empty() {
            return Err(Error::EmptyProof);
        }
        #[cfg(not(test))]
        if proof.len() as usize != PROOF_BYTES {
            return Err(Error::ProofParseError);
        }

        let proposal = Self::proposal(env.clone(), proposal_id)?;
        if !proposal.active || proposal.root != merkle_root {
            return Err(Error::RootMissing);
        }
        if !Self::root_exists(env.clone(), merkle_root) {
            return Err(Error::RootMissing);
        }
        if Self::has_voted(env.clone(), proposal_id, nullifier.clone()) {
            return Err(Error::NullifierUsed);
        }

        Self::verify_ultrahonk(&env, &public_inputs, &proof)?;
        Self::record_vote(env, proposal_id, nullifier, vote)
    }

    fn public_inputs_match(
        env: &Env,
        public_inputs: &Bytes,
        merkle_root: &BytesN<32>,
        proposal_id: u64,
        nullifier: &BytesN<32>,
        vote: u32,
    ) -> Result<bool, Error> {
        let contract_domain: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ContractDomain)
            .ok_or(Error::NotInitialized)?;

        Ok(public_inputs.slice(0..32) == Bytes::from(merkle_root.clone())
            && public_inputs.slice(32..64) == Self::field_bytes_from_u64(env, contract_domain)
            && public_inputs.slice(64..96) == Self::field_bytes_from_u64(env, proposal_id)
            && public_inputs.slice(96..128) == Bytes::from(nullifier.clone())
            && public_inputs.slice(128..160) == Self::field_bytes_from_u32(env, vote))
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
        let vk_bytes: Bytes = env
            .storage()
            .instance()
            .get(&DataKey::VerifyingKey)
            .ok_or(Error::NotInitialized)?;
        let verifier = UltraHonkVerifier::new(env, &vk_bytes).map_err(|_| Error::VkParseError)?;
        verifier
            .verify(proof, public_inputs)
            .map_err(|_| Error::VerificationFailed)?;
        Ok(())
    }

    #[cfg(test)]
    fn verify_ultrahonk(_env: &Env, _public_inputs: &Bytes, proof: &Bytes) -> Result<(), Error> {
        if proof.is_empty() {
            return Err(Error::EmptyProof);
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
        Ok(())
    }

    fn record_vote(
        env: Env,
        proposal_id: u64,
        nullifier: BytesN<32>,
        vote: u32,
    ) -> Result<Tally, Error> {
        env.storage()
            .persistent()
            .set(&DataKey::Nullifier(proposal_id, nullifier), &true);

        let mut tally = Self::tally(env.clone(), proposal_id)?;
        if vote == 1 {
            tally.yes += 1;
        } else {
            tally.no += 1;
        }
        env.storage()
            .persistent()
            .set(&DataKey::Tally(proposal_id), &tally);
        Ok(tally)
    }
}

mod test;
