// use anchor_lang::prelude::*;
// use anchor_spl::token::Mint;

// declare_id!("6fXix7yZxeoqyL3wNtAHpPZ8dXAXQe3DXbVPeqcH1Gny");

// pub mod constants;
// pub mod error;
// pub mod handlers;
// pub mod state;

// use crate::constants::{SEED_LOAN, SEED_PROFILE};
// use crate::state::{Config, LoanListing, UserProfile};

// #[program]
// pub mod dblt_lending {
//     use anchor_lang::prelude::*;

//     use crate::handlers;
//     use crate::{
//         CreateLoan, FundLoan, Initialize, RegisterUser, UpdateScore,
//     };

//     pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
//         handlers::initialize(ctx, admin)
//     }

//     pub fn register_borrower(ctx: Context<RegisterUser>, company_name: String) -> Result<()> {
//         handlers::register_borrower(ctx, company_name)
//     }

//     pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
//         handlers::register_lender(ctx, entity_name)
//     }

//     pub fn update_identity_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
//         handlers::update_identity_score(ctx, component_type)
//     }

//     pub fn update_financial_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
//         handlers::update_financial_score(ctx, component_type)
//     }

//     pub fn create_loan_listing(
//         ctx: Context<CreateLoan>,
//         amount: u64,
//         interest_rate: u64,
//     ) -> Result<()> {
//         handlers::create_loan_listing(ctx, amount, interest_rate)
//     }

//     pub fn fund_loan(ctx: Context<FundLoan>) -> Result<()> {
//         handlers::fund_loan(ctx)
//     }
// }

// #[derive(Accounts)]
// pub struct Initialize<'info> {
//     #[account(init, payer = user, space = 8 + std::mem::size_of::<Config>())]
//     pub config: Account<'info, Config>,
//     #[account(mut)]
//     pub user: Signer<'info>,
//     pub system_program: Program<'info, System>,
//     pub dblt_mint: Account<'info, Mint>,
// }

// #[derive(Accounts)]
// pub struct RegisterUser<'info> {
//     #[account(mut)]
//     pub user: Signer<'info>,
//     #[account(
//         init,
//         payer = user,
//         space = 8 + std::mem::size_of::<UserProfile>(),
//         seeds = [SEED_PROFILE, user.key().as_ref()],
//         bump
//     )]
//     pub borrower: Account<'info, UserProfile>,
//     pub system_program: Program<'info, System>,
// }

// #[derive(Accounts)]
// pub struct UpdateScore<'info> {
//     #[account(mut)]
//     pub user: Signer<'info>,
//     #[account(
//         mut,
//         seeds = [SEED_PROFILE, user.key().as_ref()],
//         bump
//     )]
//     pub user_profile: Account<'info, UserProfile>,
// }

// #[derive(Accounts)]
// #[instruction(amount: u64, interest_rate: u64)]
// pub struct CreateLoan<'info> {
//     #[account(mut)]
//     pub borrower: Signer<'info>,
//     #[account(
//         mut,
//         seeds = [SEED_PROFILE, borrower.key().as_ref()],
//         bump
//     )]
//     pub borrower_profile: Account<'info, UserProfile>,
//     #[account(
//         init,
//         payer = borrower,
//         space = 8 + std::mem::size_of::<LoanListing>(),
//         seeds = [SEED_LOAN, borrower.key().as_ref(), &amount.to_le_bytes()],
//         bump
//     )]
//     pub listing: Account<'info, LoanListing>,
//     pub system_program: Program<'info, System>,
// }

// #[derive(Accounts)]
// pub struct FundLoan<'info> {
//     #[account(mut)]
//     pub lender: Signer<'info>,
//     #[account(
//         mut,
//         seeds = [SEED_PROFILE, lender.key().as_ref()],
//         bump
//     )]
//     pub lender_profile: Account<'info, UserProfile>,
//     #[account(
//         mut,
//         seeds = [SEED_LOAN, borrower.key().as_ref(), &listing.amount.to_le_bytes()],
//         bump
//     )]
//     pub listing: Account<'info, LoanListing>,
//     #[account(
//         mut,
//         seeds = [SEED_PROFILE, borrower.key().as_ref()],
//         bump
//     )]
//     pub borrower: Account<'info, UserProfile>,
// }

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