// pub mod constants;
// pub mod error;
// pub mod instructions;
// pub mod state;

// use anchor_lang::prelude::*;

// pub use constants::*;
// pub use instructions::*;
// pub use state::*;

// declare_id!("AXdWprPxpre9hbCJpryiwktSYgBKKaoFHHTufwGRTfLQ");

// #[program]
// pub mod dblt_lending {
//     use super::*;

//     pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
//         initialize::handler(ctx)
//     }
// }

use anchor_lang::prelude::*;
use anchor_spl::{
token::{self, Token, TokenAccount, Mint},
associated_token::AssociatedToken,
};
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"); // Replace with your actual
Program ID
#[program]
pub mod dblt_lending {
use super::*;
// Initialize the protocol admin and set the DBLT mint address
pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
let config = &mut ctx.accounts.config;
config.admin = admin;
config.dblt_mint = ctx.accounts.dblt_mint.key();
config.platform_fee_bps = 100; // 1% fee (100 basis points)
config.total_borrowers = 0;
config.total_lenders = 0;
Ok(())
}
// Register a Borrower
pub fn register_borrower(ctx: Context<RegisterUser>, company_name: String) -> Result<()> {
let borrower = &mut ctx.accounts.borrower;
borrower.authority = ctx.accounts.user.key();
borrower.company_name = company_name;
borrower.is_lender = false;
// Initial Score: 0
borrower.identity_score = 0;
borrower.financial_score = 0;
borrower.max_score = 4; // Identity: Active, KYC, AML, Face
borrower.financial_max_score = 4; // Assets, Liab, Income, Cashflow
// Create a profile account for this user
borrower.has_profile = true;
msg!("Borrower registered: {}", borrower.company_name);
Ok(())
}
// Register a Lender
pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
let lender = &mut ctx.accounts.lender;
lender.authority = ctx.accounts.user.key();
lender.entity_name = entity_name;
lender.is_lender = true;
lender.identity_score = 0;
lender.max_score = 4; // Same identity checks, no financials
lender.has_profile = true;
msg!("Lender registered: {}", lender.entity_name);
Ok(())
}
// Update Identity Score (Called by Frontend after API/KYC verification)
// component_type: 1=CompaniesHouse, 2=KYC, 3=AML, 4=FaceCam
pub fn update_identity_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
let user = &mut ctx.accounts.user_profile;
require!(component_type >= 1 && component_type <= 4, ErrorCode::InvalidComponent);
require!(user.identity_score < user.max_score, ErrorCode::AlreadyVerified);
// In a real app, you'd verify a signature from the verifier here.
// For hackathon demo, we trust the caller (frontend) to have done the work.
user.identity_score += 1;
msg!("Identity score updated to: {}", user.identity_score);
Ok(())
}
// Update Financial Score (Borrowers only)
// component_type: 1=Assets, 2=Liabilities, 3=Income, 4=CashFlow
pub fn update_financial_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
let user = &mut ctx.accounts.user_profile;
require!(!user.is_lender, ErrorCode::LenderNoFinancials);
require!(component_type >= 1 && component_type <= 4, ErrorCode::InvalidComponent);
require!(user.financial_score < user.financial_max_score, ErrorCode::AlreadyVerified);
user.financial_score += 1;
msg!("Financial score updated to: {}", user.financial_score);
Ok(())
}
// Create a Loan Listing (Borrower)
pub fn create_loan_listing(ctx: Context<CreateLoan>, amount: u64, interest_rate: u64) -> Result<()> {
let listing = &mut ctx.accounts.listing;
listing.borrower = ctx.accounts.borrower.key();
listing.amount = amount;
listing.interest_rate_bps = interest_rate;
listing.status = LoanStatus::Pending;
listing.created_at = Clock::get()?.unix_timestamp;
// Fee logic: Charge a small DBLT fee to list (simulating platform cost)
// In a real scenario, you'd transfer DBLT from user to platform vault
// For now, we just log it.
msg!("Loan listing created for {} SOL", amount);
Ok(())
}
// Execute Loan (Lender accepts)
pub fn fund_loan(ctx: Context<FundLoan>) -> Result<()> {
let listing = &mut ctx.accounts.listing;
let borrower = &mut ctx.accounts.borrower;
let lender = &mut ctx.accounts.lender;
require!(listing.status == LoanStatus::Pending, ErrorCode::ListingNotActive);
// Calculate Fee
let fee_amount = (listing.amount * listing.interest_rate_bps) / 10000;
// Note: Usually fee is on principal, but for demo let's say fee is % of principal
// Let's assume a flat 1% fee on the loan amount for the platform
let platform_fee = listing.amount * 100 / 10000; // 1%
// Transfer logic would go here (SOL or Token)
// In Anchor, you'd use Cpi to transfer tokens/SOL
listing.status = LoanStatus::Funded;
msg!("Loan funded! Platform fee collected.");
Ok(())
}
}
// --- Accounts ---
#[account]
pub struct Config {
pub admin: Pubkey,
pub dblink_mint: Pubkey,
pub platform_fee_bps: u16,
pub total_borrowers: u64,
pub total_lenders: u64,
}
#[account]
pub struct UserProfile {
pub authority: Pubkey,
pub is_lender: bool,
// Borrower specific
pub company_name: Option<String>, // None if lender
pub entity_name: Option<String>, // None if borrower
// Scoring
pub identity_score: u8,
pub max_score: u8,
pub financial_score: u8,
pub financial_max_score: u8,
pub has_profile: bool,
}
#[account]
pub struct LoanListing {
pub borrower: Pubkey,
pub amount: u64,
pub interest_rate_bps: u64,
pub status: u8, // 0=Pending, 1=Funded, 2=Completed, 3=Defaulted
pub created_at: i64,
}
// --- Contexts ---
#[derive(Accounts)]
pub struct Initialize<'info> {
#[account(init, payer = user, space = 8 + std::mem::size_of::<Config>())]
pub config: Account<'info, Config>,
#[account(mut)]
pub user: Signer<'info>,
pub system_program: Program<'info, System>,
pub dblink_mint: Account<'info, Mint>, // The DBLT token mint
}
#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct RegisterUser<'info> {
#[account(mut)]
pub user: Signer<'info>,
#[account(
init,
payer = user,
space = 8 + std::mem::size_of::<UserProfile>(),
seeds = [b"profile", user.key().as_ref()],
bump
)]
pub borrower: Account<'info, UserProfile>, // Renamed to generic 'borrower' but used for both
pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct UpdateScore<'info> {
#[account(mut)]
pub user: Signer<'info>,
#[account(
mut,
seeds = [b"profile", user.key().as_ref()],
bump
)]
pub user_profile: Account<'info, UserProfile>,
}
#[derive(Accounts)]
pub struct CreateLoan<'info> {
#[account(mut)]
pub borrower: Signer<'info>,
#[account(
mut,
seeds = [b"profile", borrower.key().as_ref()],
bump
)]
pub borrower_profile: Account<'info, UserProfile>,
#[account(
init
init,
payer = borrower,
space = 8 + std::mem::size_of::<LoanListing>(),
seeds = [b"loan", borrower.key().as_ref(), &amount.to_le_bytes()],
bump
)]
pub listing: Account<'info, LoanListing>,
pub system_program: Program<'info, System>,
}
#[derive(Accounts)]
pub struct FundLoan<'info> {
#[account(mut)]
pub lender: Signer<'info>,
#[account(
mut,
seeds = [b"profile", lender.key().as_ref()],
bump
)]
pub lender_profile: Account<'info, UserProfile>,
#[account(
mut,
seeds = [b"loan", borrower.key().as_ref(), &listing.amount.to_le_bytes()],
bump
)]
pub listing: Account<'info, LoanListing>,
#[account(
mut,
seeds = [b"profile", borrower.key().as_ref()],
bump
)]
pub borrower: Account<'info, UserProfile>,
}
// --- Errors ---
#[error_code]
pub enum ErrorCode {
#[msg("Invalid verification component type")]
InvalidComponent,
#[msg("Already verified for this component")]
AlreadyVerified,
#[msg("Lenders do not need financial verification")]
LenderNoFinancials,
#[msg("Listing is not active")]
ListingNotActive,
}
