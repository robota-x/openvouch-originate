use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

declare_id!("6fXix7yZxeoqyL3wNtAHpPZ8dXAXQe3DXbVPeqcH1Gny");

pub mod constants;
pub mod error;
pub mod handlers;
pub mod state;

use crate::constants::{SEED_LOAN, SEED_PROFILE};
use crate::state::{Config, LoanListing, UserProfile};

#[program]
pub mod dblt_lending {
    use anchor_lang::prelude::*;

    use crate::handlers;
    use crate::{
        CreateLoan, FundLoan, Initialize, RegisterUser, UpdateScore,
    };

    pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
        handlers::initialize(ctx, admin)
    }

    pub fn register_borrower(ctx: Context<RegisterUser>, company_name: String) -> Result<()> {
        handlers::register_borrower(ctx, company_name)
    }

    pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
        handlers::register_lender(ctx, entity_name)
    }

    pub fn update_identity_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
        handlers::update_identity_score(ctx, component_type)
    }

    pub fn update_financial_score(ctx: Context<UpdateScore>, component_type: u8) -> Result<()> {
        handlers::update_financial_score(ctx, component_type)
    }

    pub fn create_loan_listing(
        ctx: Context<CreateLoan>,
        amount: u64,
        interest_rate: u64,
    ) -> Result<()> {
        handlers::create_loan_listing(ctx, amount, interest_rate)
    }

    pub fn fund_loan(ctx: Context<FundLoan>) -> Result<()> {
        handlers::fund_loan(ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user, space = 8 + std::mem::size_of::<Config>())]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub dblt_mint: Account<'info, Mint>,
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + std::mem::size_of::<UserProfile>(),
        seeds = [SEED_PROFILE, user.key().as_ref()],
        bump
    )]
    pub borrower: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateScore<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [SEED_PROFILE, user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
}

#[derive(Accounts)]
#[instruction(amount: u64, interest_rate: u64)]
pub struct CreateLoan<'info> {
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
        space = 8 + std::mem::size_of::<LoanListing>(),
        seeds = [SEED_LOAN, borrower.key().as_ref(), &amount.to_le_bytes()],
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
        seeds = [SEED_PROFILE, lender.key().as_ref()],
        bump
    )]
    pub lender_profile: Account<'info, UserProfile>,
    #[account(
        mut,
        seeds = [SEED_LOAN, borrower.key().as_ref(), &listing.amount.to_le_bytes()],
        bump
    )]
    pub listing: Account<'info, LoanListing>,
    #[account(
        mut,
        seeds = [SEED_PROFILE, borrower.key().as_ref()],
        bump
    )]
    pub borrower: Account<'info, UserProfile>,
}
