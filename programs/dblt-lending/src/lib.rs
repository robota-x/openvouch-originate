// updated code with new functions for term offers and loan pools, as well as contribution and finalization of pools.

use anchor_lang::prelude::*;
use anchor_spl::{
    token::{self, Token, TokenAccount, Mint},
    associated_token::AssociatedToken,
};

declare_id!("Fg6PaFpoGXkYsidMpW2BeZ7FEfcYkg476zPFsLnS");

pub mod constants;
pub mod error;
pub mod handlers;
pub mod state;

use crate::constants::{SEED_LOAN, SEED_PROFILE};
use crate::state::{Config, LoanPool, TermOffer, UserProfile};

#[program]
pub mod dblt_lending {
    use super::*;

    // Keep existing: initialize, register_borrower, register_lender, update_score
    // Add new functions below:
    
    pub fn create_term_offer(
        ctx: Context<CreateTermOffer>,
        min_interest_rate_bps: u64,
        max_duration_days: u64,
        collateral_required: bool,
        description: String,
    ) -> Result<()> {
        handlers::create_term_offer(ctx, min_interest_rate_bps, max_duration_days, collateral_required, description)
    }

    pub fn create_loan_pool(
        ctx: Context<CreateLoanPool>,
        target_amount: u64,
        term_offer_id: Pubkey,
        years_data_hash: String,
        years_covered: u8,
    ) -> Result<()> {
        handlers::create_loan_pool(ctx, target_amount, term_offer_id, years_data_hash, years_covered)
    }

    pub fn contribute_to_pool(ctx: Context<ContributeToPool>, amount: u64) -> Result<()> {
        handlers::contribute_to_pool(ctx, amount)
    }

    pub fn finalize_pool(ctx: Context<FinalizePool>) -> Result<()> {
        handlers::finalize_pool(ctx)
    }
}

// --- Account Contexts ---
#[derive(Accounts)]
pub struct CreateTermOffer<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<TermOffer>(),
        seeds = [b"offer", user.key().as_ref(), &min_interest_rate_bps.to_le_bytes()],
        bump
    )]
    pub term_offer: Account<'info, TermOffer>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(target_amount: u64)]
pub struct CreateLoanPool<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PROFILE, borrower.key().as_ref()],
        bump
    )]
    pub borrower_profile: Account<'info, UserProfile>,
    #[account(
        init,
        payer = borrower,
        space = 8 + std::mem::size_of::<LoanPool>(),
        seeds = [SEED_LOAN, borrower.key().as_ref(), &target_amount.to_le_bytes()],
        bump
    )]
    pub pool: Account<'info, LoanPool>,
    #[account(
        seeds = [b"offer", term_offer.authority.as_ref(),
        &term_offer.min_interest_rate_bps.to_le_bytes()],
        bump
    )]
    pub term_offer: Account<'info, TermOffer>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct ContributeToPool<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PROFILE, lender.key().as_ref()],
        bump
    )]
    pub lender_profile: Account<'info, UserProfile>,
    #[account(
        mut,
        seeds = [SEED_LOAN, pool.borrower.as_ref(), &pool.target_amount.to_le_bytes()],
        bump
    )]
    pub pool: Account<'info, LoanPool>,
}

#[derive(Accounts)]
pub struct FinalizePool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_LOAN, pool.borrower.as_ref(), &pool.target_amount.to_le_bytes()],
        bump
    )]
    pub pool: Account<'info, LoanPool>,
}

