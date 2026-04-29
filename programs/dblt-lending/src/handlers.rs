use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::instructions::*; 
use crate::state::*;
use crate::error::ErrorCode;

// --- INITIALIZE ---
pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = admin;
    // [DEFERRED-SPL]
    // config.dblt_mint = ctx.accounts.dblt_mint.key();
    config.platform_fee_bps = 50;
    config.total_borrowers = 0;
    config.total_lenders = 0;
    Ok(())
}

// --- USERS ---
pub fn register_borrower(ctx: Context<RegisterUser>, company_name: String) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    let user = &ctx.accounts.user;

    user_profile.authority = user.key();
    user_profile.is_lender = false;
    user_profile.identity_score = 0; 
    user_profile.financial_score = 0; 
    user_profile.max_identity_score = 100;
    user_profile.max_financial_score = 100;
    user_profile.has_profile = true;
    user_profile.financial_verified_flags = 0;

    let name_bytes = company_name.as_bytes();
    let len = name_bytes.len().min(64);
    user_profile.company_name[..len].copy_from_slice(&name_bytes[..len]);
    user_profile.name_len = len as u8;
    user_profile.entity_name = [0u8; 64];

    msg!("Borrower registered: {}", user_profile.key());
    Ok(())
}

pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    let user = &ctx.accounts.user;

    user_profile.authority = user.key();
    user_profile.is_lender = true;
    user_profile.identity_score = 0; 
    user_profile.financial_score = 0; 
    user_profile.max_identity_score = 100;
    user_profile.max_financial_score = 100;
    user_profile.has_profile = true;
    user_profile.financial_verified_flags = 0;

    let name_bytes = entity_name.as_bytes();
    let len = name_bytes.len().min(64);
    user_profile.entity_name[..len].copy_from_slice(&name_bytes[..len]);
    user_profile.name_len = len as u8;
    user_profile.company_name = [0u8; 64];

    msg!("Lender registered: {}", user_profile.key());
    Ok(())
}

// --- SCORE ---
pub fn update_identity_score(ctx: Context<UpdateScore>, new_score: u8) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    require!(new_score <= 100, ErrorCode::InvalidComponent);
    if user_profile.is_lender { return Err(ErrorCode::LenderNoFinancials.into()); }
    user_profile.identity_score = new_score;
    msg!("Identity score updated: {}", new_score);
    Ok(())
}

pub fn update_financial_score(ctx: Context<UpdateScore>, new_score: u8) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    require!(new_score <= 100, ErrorCode::InvalidComponent);
    if user_profile.is_lender { return Err(ErrorCode::LenderNoFinancials.into()); }
    user_profile.financial_score = new_score;
    msg!("Financial score updated: {}", new_score);
    Ok(())
}

// --- CONTRIBUTION ---
pub fn contribute_to_pool(ctx: Context<ContributeToPool>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault = &mut ctx.accounts.vault;
    let position = &mut ctx.accounts.position;
    
    // Transfer SOL from lender to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.lender.to_account_info(),
                to: vault.to_account_info(),
            },
        ),
        amount,
    )?;

    pool.current_amount = pool.current_amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    vault.total_deposited = vault.total_deposited.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    
    position.lender = ctx.accounts.lender.key();
    position.pool = pool.key();
    position.amount = position.amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

    msg!("Contribution made: {}", amount);
    Ok(())
}

// --- DISBURSE ---
pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let borrower = &ctx.accounts.borrower;

    // TODO [PRODUCTION]: Schedule creation should ideally be atomic with finalization/disbursement 
    // to prevent funds being locked without repayment rules.

    let amount = vault.total_deposited;
    
    // Transfer SOL from vault to borrower
    let pool_key = ctx.accounts.pool.key();
    let seeds = &[
        b"vault",
        pool_key.as_ref(),
        &[ctx.bumps.vault],
    ];
    let signer = &[&seeds[..]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: vault.to_account_info(),
                to: borrower.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    vault.total_withdrawn = vault.total_withdrawn.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    msg!("Loan disbursed to borrower: {}", borrower.key());
    Ok(())
}

// --- FINALIZE ---
pub fn finalize_pool(ctx: Context<FinalizePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    pool.status = PoolStatus::Funded as u8; 
    Ok(())
}

// --- WITHDRAW ---
pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
    let position = &mut ctx.accounts.position;
    let vault = &mut ctx.accounts.vault;
    let pool = &ctx.accounts.pool;
    let lender = &ctx.accounts.lender;

    // Pro-rata withdrawal logic:
    // (Lender Position / Total Pool Target) * Total Repaid into Vault
    let share = (position.amount as u128)
        .checked_mul(vault.total_repaid as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(pool.target_amount as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    let claimable = share.saturating_sub(position.withdrawn);
    require!(claimable > 0, ErrorCode::InsufficientFunds);
    
    let pool_key = pool.key();
    let seeds = &[
        b"vault",
        pool_key.as_ref(),
        &[ctx.bumps.vault],
    ];
    let signer = &[&seeds[..]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: vault.to_account_info(),
                to: lender.to_account_info(),
            },
            signer,
        ),
        claimable,
    )?;

    position.withdrawn = position.withdrawn.checked_add(claimable).ok_or(ErrorCode::MathOverflow)?;
    Ok(())
}

// --- PLACEHOLDERS FOR OTHER INSTRUCTIONS ---
pub fn create_term_offer(
    _ctx: Context<CreateTermOffer>,
    _min_interest_rate_bps: u64,
    _max_duration_days: u64,
    _collateral_required: bool,
    _description: String,
) -> Result<()> {
    Ok(())
}

pub fn create_loan_pool(
    ctx: Context<CreateLoanPool>,
    target_amount: u64,
    term_offer_id: Pubkey,
    _years_data_hash: String,
    _years_covered: u8,
    _currency: String,
    _country: String,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    pool.borrower = ctx.accounts.borrower.key();
    pool.target_amount = target_amount;
    pool.current_amount = 0;
    pool.term_offer = term_offer_id;
    pool.status = 0; // Open
    pool.created_at = clock.unix_timestamp;

    vault.pool = pool.key();
    vault.total_deposited = 0;
    vault.total_withdrawn = 0;
    vault.total_repaid = 0;

    Ok(())
}
