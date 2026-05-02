use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod aldor {
    use super::*;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>, treasury_mint: Pubkey) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.treasury_mint = treasury_mint;
        registry.bump = ctx.bumps.registry;
        Ok(())
    }

    pub fn open_escrow(ctx: Context<OpenEscrow>, amount: u64, task_id: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.payer = ctx.accounts.payer.key();
        escrow.payee = ctx.accounts.payee.key();
        escrow.amount = amount;
        escrow.task_id = bounded_string::<64>(&task_id)?;
        escrow.released = false;
        escrow.bump = ctx.bumps.escrow;
        Ok(())
    }

    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(!escrow.released, AldorError::AlreadyReleased);
        escrow.released = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AgentRegistry::INIT_SPACE,
        seeds = [b"registry", authority.key().as_ref()],
        bump
    )]
    pub registry: Account<'info, AgentRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(task_id: String)]
pub struct OpenEscrow<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + EscrowAccount::INIT_SPACE,
        seeds = [b"escrow", payer.key().as_ref(), task_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: The payee is a registry-known account or agent owner.
    pub payee: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseEscrow<'info> {
    #[account(mut)]
    pub escrow: Account<'info, EscrowAccount>,
    pub payer: Signer<'info>,
    pub payee: UncheckedAccount<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowAccount {
    pub payer: Pubkey,
    pub payee: Pubkey,
    #[max_len(64)]
    pub task_id: String,
    pub amount: u64,
    pub released: bool,
    pub bump: u8,
}

#[error_code]
pub enum AldorError {
    #[msg("Escrow already released.")]
    AlreadyReleased,
    #[msg("String too long.")]
    StringTooLong,
}

fn bounded_string<const N: usize>(value: &str) -> Result<String> {
    require!(value.len() <= N, AldorError::StringTooLong);
    Ok(value.to_string())
}
