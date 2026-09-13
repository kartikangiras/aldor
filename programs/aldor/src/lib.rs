use anchor_lang::prelude::*;

declare_id!("2km5TwkgiaDWfAyojtntyj5Djuz6ivcBVvWR8SSR4DQj");

const MAX_REPUTATION: u64 = 10_000;
const INITIAL_REPUTATION: u64 = 5_000;
const REPUTATION_REWARD: u64 = 50;
const REPUTATION_PENALTY: u64 = 100;
const MAX_SNS_LEN: usize = 128;
const MAX_NAME_LEN: usize = 64;
const MAX_CATEGORY_LEN: usize = 32;
const MAX_CAPABILITIES: usize = 8;
const MAX_CAPABILITY_LEN: usize = 32;

#[program]
pub mod aldor {
    use super::*;

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        sns_domain: String,
        umbra_stealth_key: [u8; 32],
        name: String,
        category: String,
        price_micro_stablecoin: u64,
        is_recursive: bool,
        capabilities: Vec<String>,
    ) -> Result<()> {
        require!(sns_domain.len() <= MAX_SNS_LEN, AldorError::StringTooLong);
        require!(name.len() <= MAX_NAME_LEN, AldorError::StringTooLong);
        require!(category.len() <= MAX_CATEGORY_LEN, AldorError::StringTooLong);
        require!(price_micro_stablecoin > 0, AldorError::InvalidPrice);
        require!(capabilities.len() <= MAX_CAPABILITIES, AldorError::TooManyCapabilities);
        for cap in capabilities.iter() {
            require!(cap.len() <= MAX_CAPABILITY_LEN, AldorError::StringTooLong);
        }

        let agent = &mut ctx.accounts.agent;
        agent.owner = ctx.accounts.owner.key();
        agent.sns_domain = sns_domain;
        agent.umbra_stealth_key = umbra_stealth_key;
        agent.name = name;
        agent.category = category;
        agent.price_micro_stablecoin = price_micro_stablecoin;
        agent.reputation_bps = INITIAL_REPUTATION;
        agent.total_jobs = 0;
        agent.successful_jobs = 0;
        agent.active = true;
        agent.is_recursive = is_recursive;
        agent.capabilities = capabilities;
        agent.registered_at = Clock::get()?.unix_timestamp;
        agent.bump = ctx.bumps.agent;

        emit!(AgentRegistered {
            sns_domain: agent.sns_domain.clone(),
            umbra_stealth_key: agent.umbra_stealth_key,
            category: agent.category.clone(),
            price_micro_stablecoin: agent.price_micro_stablecoin,
        });

        Ok(())
    }

    pub fn update_capabilities(
        ctx: Context<UpdateCapabilities>,
        new_capabilities: Vec<String>,
        new_price_micro_stablecoin: u64,
    ) -> Result<()> {
        require!(new_capabilities.len() <= MAX_CAPABILITIES, AldorError::TooManyCapabilities);
        for cap in new_capabilities.iter() {
            require!(cap.len() <= MAX_CAPABILITY_LEN, AldorError::StringTooLong);
        }

        let agent = &mut ctx.accounts.agent;
        require!(agent.owner == ctx.accounts.owner.key(), AldorError::Unauthorized);
        require!(new_price_micro_stablecoin > 0, AldorError::InvalidPrice);

        agent.capabilities = new_capabilities.clone();
        agent.price_micro_stablecoin = new_price_micro_stablecoin;

        emit!(CapabilitiesUpdated {
            sns_domain: agent.sns_domain.clone(),
            new_capabilities,
            new_price_micro_stablecoin,
        });

        Ok(())
    }

    pub fn record_job_outcome(ctx: Context<RecordJobOutcome>, success: bool) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        require!(agent.owner == ctx.accounts.owner.key(), AldorError::Unauthorized);

        agent.total_jobs = agent.total_jobs.saturating_add(1);
        if success {
            agent.successful_jobs = agent.successful_jobs.saturating_add(1);
            agent.reputation_bps = (agent.reputation_bps.saturating_add(REPUTATION_REWARD)).min(MAX_REPUTATION);
        } else {
            agent.reputation_bps = agent.reputation_bps.saturating_sub(REPUTATION_PENALTY);
        }

        emit!(JobOutcomeRecorded {
            sns_domain: agent.sns_domain.clone(),
            success,
            new_reputation_bps: agent.reputation_bps,
        });

        Ok(())
    }

    pub fn deactivate_agent(ctx: Context<DeactivateAgent>) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        require!(agent.owner == ctx.accounts.owner.key(), AldorError::Unauthorized);
        agent.active = false;

        emit!(AgentDeactivated {
            sns_domain: agent.sns_domain.clone(),
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(sns_domain: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + AgentAccount::INIT_SPACE,
        seeds = [b"agent", sns_domain.as_bytes()],
        bump
    )]
    pub agent: Account<'info, AgentAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(sns_domain: String)]
pub struct UpdateCapabilities<'info> {
    #[account(mut, seeds = [b"agent", sns_domain.as_bytes()], bump = agent.bump)]
    pub agent: Account<'info, AgentAccount>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(sns_domain: String)]
pub struct RecordJobOutcome<'info> {
    #[account(mut, seeds = [b"agent", sns_domain.as_bytes()], bump = agent.bump)]
    pub agent: Account<'info, AgentAccount>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(sns_domain: String)]
pub struct DeactivateAgent<'info> {
    #[account(mut, seeds = [b"agent", sns_domain.as_bytes()], bump = agent.bump)]
    pub agent: Account<'info, AgentAccount>,
    pub owner: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct AgentAccount {
    pub owner: Pubkey,
    #[max_len(128)]
    pub sns_domain: String,
    pub umbra_stealth_key: [u8; 32],
    #[max_len(64)]
    pub name: String,
    #[max_len(32)]
    pub category: String,
    pub price_micro_stablecoin: u64,
    pub reputation_bps: u64,
    pub total_jobs: u64,
    pub successful_jobs: u64,
    pub active: bool,
    pub is_recursive: bool,
    #[max_len(MAX_CAPABILITIES, MAX_CAPABILITY_LEN)]
    pub capabilities: Vec<String>,
    pub registered_at: i64,
    pub bump: u8,
}

#[event]
pub struct AgentRegistered {
    pub sns_domain: String,
    pub umbra_stealth_key: [u8; 32],
    pub category: String,
    pub price_micro_stablecoin: u64,
}

#[event]
pub struct CapabilitiesUpdated {
    pub sns_domain: String,
    pub new_capabilities: Vec<String>,
    pub new_price_micro_stablecoin: u64,
}

#[event]
pub struct JobOutcomeRecorded {
    pub sns_domain: String,
    pub success: bool,
    pub new_reputation_bps: u64,
}

#[event]
pub struct AgentDeactivated {
    pub sns_domain: String,
}

#[error_code]
pub enum AldorError {
    #[msg("String too long")]
    StringTooLong,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Too many capabilities")]
    TooManyCapabilities,
}
