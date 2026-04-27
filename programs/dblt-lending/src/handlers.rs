// use anchor_lang::prelude::*;

// use crate::{CreateLoan, FundLoan, Initialize, RegisterUser, UpdateScore};
// use crate::error::ErrorCode;
// use crate::state::LoanStatus;

// pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
//     let config = &mut ctx.accounts.config;
//     config.admin = admin;
//     config.dblt_mint = ctx.accounts.dblt_mint.key();
//     config.platform_fee_bps = 100;
//     config.total_borrowers = 0;
//     config.total_lenders = 0;
//     Ok(())
// }

// pub fn register_borrower(ctx: Context<RegisterUser>, company_name: String) -> Result<()> {
//     let borrower = &mut ctx.accounts.borrower;
//     borrower.authority = ctx.accounts.user.key();
//     borrower.company_name = Some(company_name);
//     borrower.entity_name = None;
//     borrower.is_lender = false;
//     borrower.identity_score = 0;
//     borrower.financial_score = 0;
//     borrower.max_score = 4;
//     borrower.financial_max_score = 4;
//     borrower.has_profile = true;
//     msg!("Borrower registered: {:?}", borrower.company_name);
//     Ok(())
// }

// pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
//     let lender = &mut ctx.accounts.borrower;
//     lender.authority = ctx.accounts.user.key();
//     lender.entity_name = Some(entity_name);
//     lender.company_name = None;
//     lender.is_lender = true;
//     lender.identity_score = 0;
//     lender.max_score = 4;
//     lender.has_profile = true;
//     msg!("Lender registered: {:?}", lender.entity_name);
//     Ok(())
// }

// pub fn update_identity_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
//     let user = &mut ctx.accounts.user_profile;
//     require!(component_type >= 1 && component_type <= 4, ErrorCode::InvalidComponent);
//     require!(user.identity_score < user.max_score, ErrorCode::AlreadyVerified);
//     user.identity_score += 1;
//     msg!("Identity score updated to: {}", user.identity_score);
//     Ok(())
// }

// pub fn update_financial_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
//     let user = &mut ctx.accounts.user_profile;
//     require!(!user.is_lender, ErrorCode::LenderNoFinancials);
//     require!(component_type >= 1 && component_type <= 4, ErrorCode::InvalidComponent);
//     require!(user.financial_score < user.financial_max_score, ErrorCode::AlreadyVerified);
//     user.financial_score += 1;
//     msg!("Financial score updated to: {}", user.financial_score);
//     Ok(())
// }

// pub fn create_loan_listing(
//     ctx: Context<CreateLoan>,
//     amount: u64,
//     interest_rate: u64,
// ) -> Result<()> {
//     let listing = &mut ctx.accounts.listing;
//     listing.borrower = ctx.accounts.borrower.key();
//     listing.amount = amount;
//     listing.interest_rate_bps = interest_rate;
//     listing.status = LoanStatus::Pending;
//     listing.created_at = Clock::get()?.unix_timestamp;
//     msg!("Loan listing created for {} SOL", amount);
//     Ok(())
// }

// pub fn fund_loan(ctx: Context<FundLoan>) -> Result<()> {
//     let listing = &mut ctx.accounts.listing;
//     let _borrower = &mut ctx.accounts.borrower;
//     let _lender = &ctx.accounts.lender;
//     require!(listing.status == LoanStatus::Pending, ErrorCode::ListingNotActive);
//     let _fee_amount = (listing.amount * listing.interest_rate_bps) / 10000;
//     let _platform_fee = listing.amount * 100 / 10000;
//     listing.status = LoanStatus::Funded;
//     msg!("Loan funded! Platform fee collected.");
//     Ok(())
// }

use anchor_lang::prelude::*;
use crate::instructions::*; 
use crate::state::*;
use crate::error::ErrorCode;
use crate::constants::*;

// --- INITIALIZE ---
pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = admin;
    config.dblt_mint = ctx.accounts.dblt_mint.key();
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
    
    pool.current_amount = pool.current_amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    vault.total_deposited = vault.total_deposited.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    
    position.lender = ctx.accounts.lender.key();
    position.pool = pool.key();
    position.amount = position.amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

    msg!("Contribution made: {}", amount);
    Ok(())
}

// --- DISBURSE (WITH SCORE CHECK) ---
pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    let borrower_profile = &ctx.accounts.borrower_profile;

    // ✅ VALIDATE BORROWER'S FINANCIAL SCORE
    require!(borrower_profile.financial_score >= 50, ErrorCode::InsufficientCredit);

    vault.total_withdrawn = vault.total_withdrawn.checked_add(vault.total_deposited).ok_or(ErrorCode::MathOverflow)?;
    msg!("Loan disbursed to borrower with score: {}", borrower_profile.financial_score);
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
    require!(vault.total_repaid > 0, ErrorCode::InsufficientFunds);
    position.withdrawn = position.withdrawn.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
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
    _ctx: Context<CreateLoanPool>,
    _target_amount: u64,
    _term_offer_id: Pubkey,
    _years_data_hash: String,
    _years_covered: u8,
    _currency: String,
    _country: String,
) -> Result<()> {
    Ok(())
}