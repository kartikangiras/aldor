use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("11111111111111111111111111111111");

const MAX_DEPTH: u8 = 3;
const MAX_REPUTATION: u64 = 10_000;
const INITIAL_REPUTATION: u64 = 5_000;
const REPUTATION_REWARD: u64 = 50;
const REPUTATION_PENALTY: u64 = 100;

#[program]
pub mod aldor {
    use super::*;

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        category: String,
        price_lamports: u64,
        accepts_palm_usd: bool,
        sns_domain: String,
    ) -> Result<()> {
        require!(name.len() <= 64, AldorError::StringTooLong);
        require!(category.len() <= 32, AldorError::StringTooLong);
        require!(sns_domain.len() <= 96, AldorError::StringTooLong);

        let agent = &mut ctx.accounts.agent;
        agent.owner = ctx.accounts.owner.key();
        agent.name = name;
        agent.category = category;
        agent.price_lamports = price_lamports;
        agent.accepts_palm_usd = accepts_palm_usd;
        agent.sns_domain = sns_domain;
        agent.reputation_bps = INITIAL_REPUTATION;
        agent.total_jobs = 0;
        agent.successful_jobs = 0;
        agent.active = true;
        agent.registered_at = Clock::get()?.unix_timestamp;
        agent.bump = ctx.bumps.agent;

        Ok(())
    }

    pub fn create_job(
        ctx: Context<CreateJob>,
        task_id: [u8; 32],
        description: String,
        payment_sol_lamports: u64,
        payment_palm_usd_micro: u64,
        parent_task_id: Option<[u8; 32]>,
        depth: u8,
    ) -> Result<()> {
        require!(description.len() <= 256, AldorError::StringTooLong);
        require!(depth <= MAX_DEPTH, AldorError::MaxDepthExceeded);
        require!(payment_sol_lamports > 0 || payment_palm_usd_micro > 0, AldorError::InvalidPayment);

        let job = &mut ctx.accounts.job;
        job.task_id = task_id;
        job.orchestrator = ctx.accounts.orchestrator.key();
        job.specialist = ctx.accounts.specialist.key();
        job.description = description;
        job.payment_sol_lamports = payment_sol_lamports;
        job.payment_palm_usd_micro = payment_palm_usd_micro;
        job.parent_task_id = parent_task_id;
        job.depth = depth;
        job.status = JobStatus::Pending;
        job.result_hash = None;
        job.created_at = Clock::get()?.unix_timestamp;
        job.completed_at = None;
        job.bump = ctx.bumps.job;

        ctx.accounts.escrow_sol.task_id = task_id;
        ctx.accounts.escrow_sol.bump = ctx.bumps.escrow_sol;

        if payment_sol_lamports > 0 {
            let cpi = system_instruction::transfer(
                &ctx.accounts.orchestrator.key(),
                &ctx.accounts.escrow_sol.key(),
                payment_sol_lamports,
            );
            invoke(
                &cpi,
                &[
                    ctx.accounts.orchestrator.to_account_info(),
                    ctx.accounts.escrow_sol.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        if payment_palm_usd_micro > 0 {
            let transfer_ctx = CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.orchestrator_token_account.to_account_info(),
                    to: ctx.accounts.escrow_token_vault.to_account_info(),
                    authority: ctx.accounts.orchestrator.to_account_info(),
                },
            );
            token::transfer(transfer_ctx, payment_palm_usd_micro)?;
        }

        emit!(JobCreated {
            task_id,
            orchestrator: job.orchestrator,
            specialist: job.specialist,
            payment_sol_lamports,
            payment_palm_usd_micro,
            depth,
        });

        Ok(())
    }

    pub fn complete_job(ctx: Context<CompleteJob>, result_hash: Option<[u8; 32]>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(job.status == JobStatus::Pending, AldorError::InvalidStatus);
        require!(ctx.accounts.specialist.key() == job.specialist, AldorError::Unauthorized);

        job.status = JobStatus::Completed;
        job.result_hash = result_hash;
        job.completed_at = Some(Clock::get()?.unix_timestamp);

        let agent = &mut ctx.accounts.agent;
        require!(agent.owner == ctx.accounts.specialist.key(), AldorError::Unauthorized);
        agent.total_jobs = agent.total_jobs.saturating_add(1);
        agent.successful_jobs = agent.successful_jobs.saturating_add(1);
        agent.reputation_bps = (agent.reputation_bps.saturating_add(REPUTATION_REWARD)).min(MAX_REPUTATION);

        if job.payment_sol_lamports > 0 {
            move_lamports(
                &ctx.accounts.escrow_sol.to_account_info(),
                &ctx.accounts.specialist.to_account_info(),
                job.payment_sol_lamports,
            )?;
        }

        if job.payment_palm_usd_micro > 0 {
            let signer_seeds: &[&[u8]] = &[
                b"escrow-authority",
                job.task_id.as_ref(),
                &[ctx.bumps.escrow_authority],
            ];

            let signer = [signer_seeds];
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_vault.to_account_info(),
                    to: ctx.accounts.specialist_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                &signer,
            );
            token::transfer(transfer_ctx, job.payment_palm_usd_micro)?;
        }

        emit!(JobCompleted {
            task_id: job.task_id,
            result_hash,
            reputation_bps: agent.reputation_bps,
        });

        Ok(())
    }

    pub fn fail_job(ctx: Context<FailJob>, reason: String) -> Result<()> {
        require!(reason.len() <= 128, AldorError::StringTooLong);

        let job = &mut ctx.accounts.job;
        require!(job.status == JobStatus::Pending, AldorError::InvalidStatus);

        job.status = JobStatus::Failed;
        job.completed_at = Some(Clock::get()?.unix_timestamp);

        let agent = &mut ctx.accounts.agent;
        require!(agent.owner == job.specialist, AldorError::Unauthorized);
        agent.total_jobs = agent.total_jobs.saturating_add(1);
        agent.reputation_bps = agent.reputation_bps.saturating_sub(REPUTATION_PENALTY);

        if job.payment_sol_lamports > 0 {
            move_lamports(
                &ctx.accounts.escrow_sol.to_account_info(),
                &ctx.accounts.orchestrator.to_account_info(),
                job.payment_sol_lamports,
            )?;
        }

        if job.payment_palm_usd_micro > 0 {
            let signer_seeds: &[&[u8]] = &[
                b"escrow-authority",
                job.task_id.as_ref(),
                &[ctx.bumps.escrow_authority],
            ];

            let signer = [signer_seeds];
            let transfer_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_token_vault.to_account_info(),
                    to: ctx.accounts.orchestrator_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                },
                &signer,
            );
            token::transfer(transfer_ctx, job.payment_palm_usd_micro)?;
        }

        emit!(JobFailed {
            task_id: job.task_id,
            reason,
        });

        Ok(())
    }

    pub fn update_price(ctx: Context<UpdatePrice>, new_price_lamports: u64) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        require!(agent.owner == ctx.accounts.owner.key(), AldorError::Unauthorized);

        agent.price_lamports = new_price_lamports;

        emit!(PriceUpdated {
            agent: agent.key(),
            new_price_lamports,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + AgentAccount::INIT_SPACE,
        seeds = [b"agent", owner.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, AgentAccount>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(task_id: [u8; 32])]
pub struct CreateJob<'info> {
    #[account(
        init,
        payer = orchestrator,
        space = 8 + JobAccount::INIT_SPACE,
        seeds = [b"job", task_id.as_ref()],
        bump
    )]
    pub job: Account<'info, JobAccount>,
    #[account(
        init,
        payer = orchestrator,
        space = 8 + EscrowSolVault::INIT_SPACE,
        seeds = [b"escrow-sol", task_id.as_ref()],
        bump
    )]
    pub escrow_sol: Account<'info, EscrowSolVault>,
    /// CHECK: PDA signer for token escrow authority.
    #[account(
        seeds = [b"escrow-authority", task_id.as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = orchestrator,
        token::mint = palm_usd_mint,
        token::authority = escrow_authority,
        seeds = [b"escrow-token", task_id.as_ref()],
        bump
    )]
    pub escrow_token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub orchestrator_token_account: Account<'info, TokenAccount>,
    pub palm_usd_mint: Account<'info, Mint>,
    #[account(mut)]
    pub orchestrator: Signer<'info>,
    /// CHECK: Specialist wallet is a plain public key target.
    pub specialist: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CompleteJob<'info> {
    #[account(mut, seeds = [b"job", job.task_id.as_ref()], bump = job.bump)]
    pub job: Account<'info, JobAccount>,
    #[account(mut, seeds = [b"agent", specialist.key().as_ref()], bump = agent.bump)]
    pub agent: Account<'info, AgentAccount>,
    #[account(mut, seeds = [b"escrow-sol", job.task_id.as_ref()], bump = escrow_sol.bump)]
    pub escrow_sol: Account<'info, EscrowSolVault>,
    /// CHECK: PDA signer for token escrow authority.
    #[account(seeds = [b"escrow-authority", job.task_id.as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"escrow-token", job.task_id.as_ref()], bump)]
    pub escrow_token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub specialist_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub specialist: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct FailJob<'info> {
    #[account(mut, seeds = [b"job", job.task_id.as_ref()], bump = job.bump)]
    pub job: Account<'info, JobAccount>,
    #[account(mut, seeds = [b"agent", job.specialist.as_ref()], bump = agent.bump)]
    pub agent: Account<'info, AgentAccount>,
    #[account(mut, seeds = [b"escrow-sol", job.task_id.as_ref()], bump = escrow_sol.bump)]
    pub escrow_sol: Account<'info, EscrowSolVault>,
    /// CHECK: PDA signer for token escrow authority.
    #[account(seeds = [b"escrow-authority", job.task_id.as_ref()], bump)]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"escrow-token", job.task_id.as_ref()], bump)]
    pub escrow_token_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub orchestrator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub orchestrator: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(mut, seeds = [b"agent", owner.key().as_ref()], bump = agent.bump)]
    pub agent: Account<'info, AgentAccount>,
    pub owner: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct AgentAccount {
    pub owner: Pubkey,
    #[max_len(64)]
    pub name: String,
    #[max_len(32)]
    pub category: String,
    pub price_lamports: u64,
    pub accepts_palm_usd: bool,
    #[max_len(96)]
    pub sns_domain: String,
    pub reputation_bps: u64,
    pub total_jobs: u64,
    pub successful_jobs: u64,
    pub active: bool,
    pub registered_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct JobAccount {
    pub task_id: [u8; 32],
    pub orchestrator: Pubkey,
    pub specialist: Pubkey,
    #[max_len(256)]
    pub description: String,
    pub payment_sol_lamports: u64,
    pub payment_palm_usd_micro: u64,
    pub parent_task_id: Option<[u8; 32]>,
    pub depth: u8,
    pub status: JobStatus,
    pub result_hash: Option<[u8; 32]>,
    pub created_at: i64,
    pub completed_at: Option<i64>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowSolVault {
    pub task_id: [u8; 32],
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, PartialEq, Eq)]
pub enum JobStatus {
    Pending,
    Completed,
    Failed,
}

#[event]
pub struct JobCreated {
    pub task_id: [u8; 32],
    pub orchestrator: Pubkey,
    pub specialist: Pubkey,
    pub payment_sol_lamports: u64,
    pub payment_palm_usd_micro: u64,
    pub depth: u8,
}

#[event]
pub struct JobCompleted {
    pub task_id: [u8; 32],
    pub result_hash: Option<[u8; 32]>,
    pub reputation_bps: u64,
}

#[event]
pub struct JobFailed {
    pub task_id: [u8; 32],
    pub reason: String,
}

#[event]
pub struct PriceUpdated {
    pub agent: Pubkey,
    pub new_price_lamports: u64,
}

#[error_code]
pub enum AldorError {
    #[msg("String too long")]
    StringTooLong,
    #[msg("Maximum recursion depth exceeded")]
    MaxDepthExceeded,
    #[msg("Invalid job status transition")]
    InvalidStatus,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid payment amount")]
    InvalidPayment,
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
}

fn move_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> Result<()> {
    let from_balance = from.lamports();
    require!(from_balance >= amount, AldorError::InsufficientEscrowBalance);

    **from.try_borrow_mut_lamports()? -= amount;
    **to.try_borrow_mut_lamports()? += amount;
    Ok(())
}
