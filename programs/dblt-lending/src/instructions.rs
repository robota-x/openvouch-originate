use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Mint};

use crate::state::*;
use crate::constants::*;

// ==================== INITIALIZE ====================
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + 200)]
    pub config: Account<'info, Config>,

    pub dblt_mint: Account<'info, Mint>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ==================== USERS ====================
#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
}

// ==================== SCORE ====================
#[derive(Accounts)]
pub struct UpdateScore<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
}

// ==================== TERM OFFER ====================
#[derive(Accounts)]
pub struct CreateTermOffer<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
}

// ==================== LOAN POOL ====================
#[derive(Accounts)]
pub struct CreateLoanPool<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
}

// ==================== CONTRIBUTION ====================
#[derive(Accounts)]
pub struct ContributeToPool<'info> {
    #[account(mut)]
    pub pool: Account<'info, LoanPool>,

    #[account(mut, seeds=[SEED_VAULT, pool.key().as_ref()], bump)]
    pub vault: Account<'info, LoanVault>,

    #[account(mut)]
    pub lender: Signer<'info>,

    #[account(mut)]
    pub lender_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds=[SEED_POSITION, pool.key().as_ref(), lender.key().as_ref()], bump)]
    pub position: Account<'info, LenderPosition>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

// ==================== DISBURSE ====================
#[derive(Accounts)]
pub struct DisburseLoan<'info> {
    #[account(mut)]
    pub pool: Account<'info, LoanPool>,

    #[account(mut, seeds=[SEED_VAULT, pool.key().as_ref()], bump)]
    pub vault: Account<'info, LoanVault>,

    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(mut)]
    pub borrower_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ==================== FINALIZE ====================
#[derive(Accounts)]
pub struct FinalizePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub pool: Account<'info, LoanPool>,
}

// ==================== WITHDRAW ====================
#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    pub lender: Signer<'info>,

    #[account(mut)]
    pub pool: Account<'info, LoanPool>,

    #[account(mut, seeds=[SEED_VAULT, pool.key().as_ref()], bump)]
    pub vault: Account<'info, LoanVault>,

    #[account(mut)]
    pub lender_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account(mut, seeds=[SEED_POSITION, pool.key().as_ref(), lender.key().as_ref()], bump)]
    pub position: Account<'info, LenderPosition>,

    pub token_program: Program<'info, Token>,
}

// ==================== REPAYMENT ====================
#[derive(Accounts)]
pub struct CreateRepaymentSchedule<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(mut)]
    pub pool: Account<'info, LoanPool>,

    #[account(
        init,
        payer = borrower,
        space = 8 + 256,
        seeds = [b"schedule", pool.key().as_ref()],
        bump
    )]
    pub repayment_schedule: Account<'info, RepaymentSchedule>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MakeRepayment<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(mut)]
    pub pool: Account<'info, LoanPool>,

    #[account(mut, seeds=[b"schedule", pool.key().as_ref()], bump)]
    pub repayment_schedule: Account<'info, RepaymentSchedule>,

    #[account(mut, seeds=[SEED_VAULT, pool.key().as_ref()], bump)]
    pub vault: Account<'info, LoanVault>,

    #[account(mut)]
    pub borrower_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ==================== REPAYMENT EXTRA ====================
#[derive(Accounts)]
pub struct RecordLatePayment<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MarkDefault<'info> {
    pub authority: Signer<'info>,

    #[account(mut)]
    pub repayment_schedule: Account<'info, RepaymentSchedule>,
}

#[derive(Accounts)]
pub struct EarlyRepayAll<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,

    #[account(mut)]
    pub pool: Account<'info, LoanPool>,

    #[account(mut)]
    pub repayment_schedule: Account<'info, RepaymentSchedule>,

    #[account(mut, seeds=[SEED_VAULT, pool.key().as_ref()], bump)]
    pub vault: Account<'info, LoanVault>,

    #[account(mut)]
    pub borrower_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}