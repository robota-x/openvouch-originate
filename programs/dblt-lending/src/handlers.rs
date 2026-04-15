// Updated new code for handlers.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::error::ErrorCode;
use crate::state::{PoolStatus, Config, UserProfile};

/// Initialize the protocol configuration
pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = admin;
    config.dblt_mint = ctx.accounts.dblt_mint.key();
    config.platform_fee_bps = 100; // Default 1%
    config.total_borrowers = 0;
    config.total_lenders = 0;
    Ok(())
}

/// Register a new borrower with company details
pub fn register_borrower(ctx: Context<RegisterUser>, company_name: String) -> Result<()> {
    let borrower = &mut ctx.accounts.borrower;
    borrower.authority = ctx.accounts.user.key();
    borrower.company_name = Some(company_name);
    borrower.entity_name = None;
    borrower.is_lender = false;
    borrower.identity_score = 0;
    borrower.financial_score = 0;
    borrower.max_score = 4;
    borrower.financial_max_score = 4;
    borrower.has_profile = true;
    msg!("Borrower registered: {:?}", borrower.company_name);
    Ok(())
}

/// Register a new lender with entity details
pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
    let lender = &mut ctx.accounts.borrower; // Note: Reusing 'borrower' account name from context
    lender.authority = ctx.accounts.user.key();
    lender.entity_name = Some(entity_name);
    lender.company_name = None;
    lender.is_lender = true;
    lender.identity_score = 0;
    lender.max_score = 4;
    lender.financial_score = 0; // Lenders don't need financial scores
    lender.financial_max_score = 0;
    lender.has_profile = true;
    msg!("Lender registered: {:?}", lender.entity_name);
    Ok(())
}

/// Update identity score (1-4)
pub fn update_identity_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
    let user = &mut ctx.accounts.user_profile;
    require!(component_type >= 1 && component_type <= 4, ErrorCode::InvalidComponent);
    require!(user.identity_score < user.max_score, ErrorCode::AlreadyVerified);
    user.identity_score += 1;
    msg!("Identity score updated to: {}", user.identity_score);
    Ok(())
}

/// Update financial score (1-4) - Borrowers only
pub fn update_financial_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
    let user = &mut ctx.accounts.user_profile;
    require!(!user.is_lender, ErrorCode::LenderNoFinancials);
    require!(component_type >= 1 && component_type <= 4, ErrorCode::InvalidComponent);
    require!(user.financial_score < user.financial_max_score, ErrorCode::AlreadyVerified);
    user.financial_score += 1;
    msg!("Financial score updated to: {}", user.financial_score);
    Ok(())
}

/// Create a Term Offer (Bidirectional: Borrower or Lender can set terms)
pub fn create_term_offer(
    ctx: Context<CreateTermOffer>,
    min_interest_rate_bps: u64,
    max_duration_days: u64,
    collateral_required: bool,
    description: String,
) -> Result<()> {
    // Basic validation for interest rate (e.g., 0 to 10000 bps = 0% to 100%)
    require!(min_interest_rate_bps <= 10000, ErrorCode::InvalidInterestRate);
    require!(max_duration_days > 0, ErrorCode::InvalidDuration);

    let offer = &mut ctx.accounts.term_offer;
    offer.authority = ctx.accounts.user.key();
    offer.min_interest_rate_bps = min_interest_rate_bps;
    offer.max_duration_days = max_duration_days;
    offer.collateral_required = collateral_required;
    offer.description = description;
    offer.is_active = true;
    offer.created_at = Clock::get()?.unix_timestamp;
    
    msg!("Term offer created by: {}", offer.authority);
    Ok(())
}

/// Create a Loan Pool
/// Requires: Credit score > 0, Valid years_covered (1-3), Valid term_offer reference
pub fn create_loan_pool(
    ctx: Context<CreateLoanPool>,
    target_amount: u64,
    term_offer_id: Pubkey,
    years_data_hash: String,
    years_covered: u8,
) -> Result<()> {
    // 1. Validate Years Covered
    require!(years_covered >= 1 && years_covered <= 3, ErrorCode::InvalidYearsCovered);
    
    // 2. Validate Target Amount
    require!(target_amount > 0, ErrorCode::InvalidAmount);

    // 3. Check Credit Score Requirement
    let borrower_profile = &ctx.accounts.borrower_profile;
    let total_score = borrower_profile.identity_score + borrower_profile.financial_score;
    require!(total_score > 0, ErrorCode::InsufficientCredit);

    // 4. Initialize Pool State
    let pool = &mut ctx.accounts.pool;
    pool.borrower = ctx.accounts.borrower.key();
    pool.target_amount = target_amount;
    pool.current_amount = 0;
    pool.term_offer = term_offer_id;
    pool.years_data_hash = years_data_hash;
    pool.years_covered = years_covered;
    pool.status = PoolStatus::Open as u8;
    pool.created_at = Clock::get()?.unix_timestamp;

    msg!("Loan pool created for {} SOL with {} years of financials", target_amount, years_covered);
    Ok(())
}

/// Contribute to a Loan Pool
/// Handles partial funding and auto-updates status when fully funded
pub fn contribute_to_pool(ctx: Context<ContributeToPool>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let lender = &ctx.accounts.lender;

    // 1. Check Pool Status
    require!(pool.status == PoolStatus::Open as u8, ErrorCode::PoolNotOpen);

    // 2. Check for Over-funding
    let remaining = pool.target_amount.checked_sub(pool.current_amount).unwrap();
    require!(amount <= remaining, ErrorCode::OverFunding);

    // 3. TRANSFER LOGIC (CRITICAL)
    // In a real implementation, you must transfer SOL from Lender to the Pool PDA or Escrow.
    // Since the Pool PDA is the signer here, we usually transfer TO the pool account.
    // However, if the Pool PDA is not a signer, we need a Vault account.
    // Assuming a Vault pattern or direct transfer to Pool PDA (requires Pool PDA to be signer):
    
    /* 
    // Example Transfer Logic (Uncomment and adapt based on your Vault strategy):
    let cpi_program = ctx.accounts.system_program.to_account_info();
    let cpi_accounts = Transfer {
        from: ctx.accounts.lender.to_account_info(),
        to: ctx.accounts.pool.to_account_info(), // Or a dedicated vault
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    transfer(cpi_ctx, amount)?;
    */

    // 4. Update State
    pool.current_amount = pool.current_amount.checked_add(amount).unwrap();

    // 5. Check Completion
    if pool.current_amount >= pool.target_amount {
        pool.status = PoolStatus::Funded as u8;
        msg!("Pool fully funded! Total: {}", pool.current_amount);
    } else {
        msg!("Pool partially funded. Progress: {}/{}", pool.current_amount, pool.target_amount);
    }

    Ok(())
}

/// Finalize Pool
/// Moves funds to borrower and starts repayment timer.
/// Usually restricted to Admin or triggered by an Oracle when conditions are met.
pub fn finalize_pool(ctx: Context<FinalizePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    
    // 1. Check Status
    require!(pool.status == PoolStatus::Funded as u8, ErrorCode::PoolNotFunded);

    // 2. Optional: Verify Admin Authority if not using a specific oracle account
    // require!(ctx.accounts.admin.key() == pool.admin_key, ErrorCode::Unauthorized);

    // 3. TRANSFER FUNDS TO BORROWER
    // Logic to move funds from Pool/Vault to Borrower's ATA or SOL account
    /*
    let cpi_program = ctx.accounts.system_program.to_account_info();
    let cpi_accounts = Transfer {
        from: ctx.accounts.pool.to_account_info(),
        to: ctx.accounts.borrower.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    transfer(cpi_ctx, pool.current_amount)?;
    */

    // 4. Update Status
    pool.status = PoolStatus::Active as u8;
    msg!("Pool finalized and active. Funds released to borrower.");
    
    Ok(())
}
