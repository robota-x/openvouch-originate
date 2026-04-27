use anchor_lang::prelude::*;

pub mod instructions;
pub mod handlers;
pub mod repayment;
pub mod state;
pub mod error;
pub mod constants;

// Re-export structs for IDL generation
use instructions::*;

declare_id!("6fXix7yZxeoqyL3wNtAHpPZ8dXAXQe3DXbVPeqcH1Gny");

#[program]
pub mod dblt_lending {
    use super::*;

    // --- INITIALIZATION ---
    pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
        handlers::initialize(ctx, admin)
    }

    // --- USER REGISTRATION ---
    pub fn register_borrower(ctx: Context<RegisterUser>, company_name: String) -> Result<()> {
        handlers::register_borrower(ctx, company_name)
    }

    pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
        handlers::register_lender(ctx, entity_name)
    }

    // --- CREDIT SCORING ---
    pub fn update_identity_score(ctx: Context<UpdateScore>, new_score: u8) -> Result<()> {
        handlers::update_identity_score(ctx, new_score)
    }

    pub fn update_financial_score(ctx: Context<UpdateScore>, new_score: u8) -> Result<()> {
        handlers::update_financial_score(ctx, new_score)
    }

    // --- LENDING OFFERS ---
    pub fn create_term_offer(
        ctx: Context<CreateTermOffer>,
        min_interest_rate_bps: u64,
        max_duration_days: u64,
        collateral_required: bool,
        description: String,
    ) -> Result<()> {
        handlers::create_term_offer(ctx, min_interest_rate_bps, max_duration_days, collateral_required, description)
    }

    // --- POOL MANAGEMENT ---
    pub fn create_loan_pool(
        ctx: Context<CreateLoanPool>,
        target_amount: u64,
        term_offer_id: Pubkey,
        years_data_hash: String,
        years_covered: u8,
        currency: String,
        country: String,
    ) -> Result<()> {
        handlers::create_loan_pool(ctx, target_amount, term_offer_id, years_data_hash, years_covered, currency, country)
    }

    pub fn contribute_to_pool(ctx: Context<ContributeToPool>, amount: u64) -> Result<()> {
        handlers::contribute_to_pool(ctx, amount)
    }

    pub fn finalize_pool(ctx: Context<FinalizePool>) -> Result<()> {
        handlers::finalize_pool(ctx)
    }

    // --- DISBURSEMENT & WITHDRAWAL ---
    pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
        handlers::disburse_loan(ctx)
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
        handlers::withdraw_funds(ctx)
    }

    // --- REPAYMENT SYSTEM ---
    pub fn create_repayment_schedule(
        ctx: Context<CreateRepaymentSchedule>,
        total_repayable: u64,
        num_installments: u8,
        installment_interval_days: u32,
        late_penalty_bps: u16,
        early_repayment_discount_bps: u16,
    ) -> Result<()> {
        repayment::create_repayment_schedule(ctx, total_repayable, num_installments, installment_interval_days, late_penalty_bps, early_repayment_discount_bps)
    }

    pub fn make_repayment(
        ctx: Context<MakeRepayment>,
        installment_number: u8,
        amount: u64,
        is_early: bool,
        is_late: bool,
    ) -> Result<()> {
        repayment::make_repayment(ctx, installment_number, amount, is_early, is_late)
    }

    pub fn record_late_payment(ctx: Context<RecordLatePayment>, inst: u8, amt: u64) -> Result<()> {
        repayment::record_late_payment(ctx, inst, amt)
    }

    pub fn mark_default(ctx: Context<MarkDefault>) -> Result<()> {
        repayment::mark_default(ctx)
    }

    pub fn early_repay_all(ctx: Context<EarlyRepayAll>, amount: u64) -> Result<()> {
        repayment::early_repay_all(ctx, amount)
    }
}