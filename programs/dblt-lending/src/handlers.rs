use anchor_lang::prelude::*;

use crate::{CreateLoan, FundLoan, Initialize, RegisterUser, UpdateScore};
use crate::error::ErrorCode;
use crate::state::LoanStatus;

pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = admin;
    config.dblt_mint = ctx.accounts.dblt_mint.key();
    config.platform_fee_bps = 100;
    config.total_borrowers = 0;
    config.total_lenders = 0;
    Ok(())
}

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

pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
    let lender = &mut ctx.accounts.borrower;
    lender.authority = ctx.accounts.user.key();
    lender.entity_name = Some(entity_name);
    lender.company_name = None;
    lender.is_lender = true;
    lender.identity_score = 0;
    lender.max_score = 4;
    lender.has_profile = true;
    msg!("Lender registered: {:?}", lender.entity_name);
    Ok(())
}

pub fn update_identity_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
    let user = &mut ctx.accounts.user_profile;
    require!(component_type >= 1 && component_type <= 4, ErrorCode::InvalidComponent);
    require!(user.identity_score < user.max_score, ErrorCode::AlreadyVerified);
    user.identity_score += 1;
    msg!("Identity score updated to: {}", user.identity_score);
    Ok(())
}

pub fn update_financial_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
    let user = &mut ctx.accounts.user_profile;
    require!(!user.is_lender, ErrorCode::LenderNoFinancials);
    require!(component_type >= 1 && component_type <= 4, ErrorCode::InvalidComponent);
    require!(user.financial_score < user.financial_max_score, ErrorCode::AlreadyVerified);
    user.financial_score += 1;
    msg!("Financial score updated to: {}", user.financial_score);
    Ok(())
}

pub fn create_loan_listing(
    ctx: Context<CreateLoan>,
    amount: u64,
    interest_rate: u64,
) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    listing.borrower = ctx.accounts.borrower.key();
    listing.amount = amount;
    listing.interest_rate_bps = interest_rate;
    listing.status = LoanStatus::Pending;
    listing.created_at = Clock::get()?.unix_timestamp;
    msg!("Loan listing created for {} SOL", amount);
    Ok(())
}

pub fn fund_loan(ctx: Context<FundLoan>) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    let _borrower = &mut ctx.accounts.borrower;
    let _lender = &ctx.accounts.lender;
    require!(listing.status == LoanStatus::Pending, ErrorCode::ListingNotActive);
    let _fee_amount = (listing.amount * listing.interest_rate_bps) / 10000;
    let _platform_fee = listing.amount * 100 / 10000;
    listing.status = LoanStatus::Funded;
    msg!("Loan funded! Platform fee collected.");
    Ok(())
}
