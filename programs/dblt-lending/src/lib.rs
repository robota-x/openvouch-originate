use anchor_lang::prelude::*;

// Modules for handling various program functionalities
pub mod instructions;
pub mod handlers;
pub mod repayment;
pub mod state;
pub mod error;
pub mod constants;

// Re-export structs for IDL generation
use instructions::*;

// Declare the program ID
declare_id!("22bmZ5cp4DdUitMt8okSwygWP1f9oWpG6zXGkVBrgCtV");

#[program]
pub mod dblt_lending {
    use super::*;

    // --- INITIALIZATION ---
    /// Initializes the program with an admin's public key.
    pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
        handlers::initialize(ctx, admin)
    }

    // --- USER REGISTRATION ---
    /// Registers a borrower with a company name.
    pub fn register_borrower(ctx: Context<RegisterUser>, company_name: String) -> Result<()> {
        handlers::register_borrower(ctx, company_name)
    }

    /// Registers a lender with an entity name.
    pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
        handlers::register_lender(ctx, entity_name)
    }

    // --- CREDIT SCORING ---
    /// Updates the borrower's identity score.
    pub fn update_identity_score(ctx: Context<UpdateScore>, new_score: u8) -> Result<()> {
        handlers::update_identity_score(ctx, new_score)
    }

    /// Updates the borrower's financial score.
    pub fn update_financial_score(ctx: Context<UpdateScore>, new_score: u8) -> Result<()> {
        handlers::update_financial_score(ctx, new_score)
    }

    // --- POOL MANAGEMENT ---
    /// Creates a loan pool with the target amount and associated term offer.
    pub fn create_loan_pool(
        ctx: Context<CreateLoanPool>,
        target_amount: u64,
        term_offer_id: Pubkey,
        years_data_hash: String,
        years_covered: u8,
        currency: String,
        country: String,
    ) -> Result<()> {
        handlers::create_loan_pool(
            ctx, 
            target_amount, 
            term_offer_id, 
            years_data_hash, 
            years_covered, 
            currency, 
            country
        )
    }

    /// Contributes to an existing loan pool with a specified amount.
    pub fn contribute_to_pool(ctx: Context<ContributeToPool>, amount: u64) -> Result<()> {
        handlers::contribute_to_pool(ctx, amount)
    }

    /// Finalizes a loan pool, making it available for lending.
    pub fn finalize_pool(ctx: Context<FinalizePool>) -> Result<()> {
        handlers::finalize_pool(ctx)
    }

    /// Cancels a loan pool and allows refunds.
    pub fn cancel_loan(ctx: Context<CancelLoan>) -> Result<()> {
        handlers::cancel_loan(ctx)
    }

    // --- DISBURSEMENT & WITHDRAWAL ---
    /// Disburses a loan to a borrower.
    pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
        handlers::disburse_loan(ctx)
    }

    /// Withdraws funds from a pool or a user's account.
    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        handlers::withdraw_funds(ctx)
    }

    // --- REPAYMENT SYSTEM ---
    /// Creates a repayment schedule for a borrower with multiple installments.
    pub fn create_repayment_schedule(
        ctx: Context<CreateRepaymentSchedule>,
        total_repayable: u64,
        num_installments: u8,
        installment_interval_days: u32,
        late_penalty_bps: u64,
        early_repayment_discount_bps: u64,
    ) -> Result<()> {
        repayment::create_repayment_schedule(
            ctx, 
            total_repayable, 
            num_installments, 
            installment_interval_days, 
            late_penalty_bps, 
            early_repayment_discount_bps
        )
    }

    /// Makes a repayment for a specific installment.
    pub fn make_repayment(
        ctx: Context<MakeRepayment>,
        installment_number: u8,
        amount: u64,
        is_early: bool,
        is_late: bool,
    ) -> Result<()> {
        repayment::make_repayment(ctx, installment_number, amount, is_early, is_late)
    }

    /// Marks a borrower as defaulted if repayments are not made.
    pub fn mark_default(ctx: Context<MarkDefault>) -> Result<()> {
        repayment::mark_default(ctx)
    }

    /// Allows early repayment of all outstanding debt.
    pub fn early_repay_all(ctx: Context<EarlyRepayAll>, amount: u64) -> Result<()> {
        repayment::early_repay_all(ctx, amount)
    }
}