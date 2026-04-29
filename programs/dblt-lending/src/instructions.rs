use anchor_lang::prelude::*;
// [DEFERRED-SPL]
// use anchor_spl::token::{Token, TokenAccount, Mint};

use crate::state::*;
use crate::constants::*;

// ==================== INITIALIZE ====================
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + 200)]
    pub config: Account<'info, Config>,
    // [DEFERRED-SPL]
    // pub dblt_mint: Account<'info, Mint>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ==================== USERS ====================
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
    pub user_profile: Account<'info, UserProfile>,
    pub system_program: Program<'info, System>,
}

// ==================== SCORE ====================
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

    #[account(
        init,
        payer = borrower,
        space = 8 + std::mem::size_of::<LoanPool>(),
    )]
    pub pool: Account<'info, LoanPool>,

    #[account(
        init,
        payer = borrower,
        space = 8 + std::mem::size_of::<LoanVault>(),
        seeds = [SEED_VAULT, pool.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, LoanVault>,

    pub system_program: Program<'info, System>,
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
    #[account(
        mut,
        seeds = [SEED_PROFILE, lender.key().as_ref()],
        bump
    )]
    pub lender_profile: Account<'info, UserProfile>,
    
    // [DEFERRED-SPL]
    // #[account(mut)]
    // pub lender_token_account: Account<'info, TokenAccount>,
    // #[account(mut)]
    // pub vault_token_account: Account<'info, TokenAccount>,
    // pub token_program: Program<'info, Token>,

    #[account(
        init_if_needed,
        payer = lender,
        space = 8 + std::mem::size_of::<LenderPosition>(),
        seeds = [SEED_POSITION, pool.key().as_ref(), lender.key().as_ref()],
        bump
    )]
    pub position: Account<'info, LenderPosition>,
    
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
    
    pub system_program: Program<'info, System>,
}

// ==================== FINALIZE ====================
#[derive(Accounts)]
pub struct FinalizePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, LoanPool>,
}

// ==================== CANCEL ====================
#[derive(Accounts)]
pub struct CancelLoan<'info> {
    #[account(mut)]
    pub borrower: Signer<'info>,
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
    
    // [DEFERRED-SPL]
    // #[account(mut)]
    // pub lender_token_account: Account<'info, TokenAccount>,
    // #[account(mut)]
    // pub vault_token_account: Account<'info, TokenAccount>,
    // pub token_program: Program<'info, Token>,

    #[account(mut, seeds=[SEED_POSITION, pool.key().as_ref(), lender.key().as_ref()], bump)]
    pub position: Account<'info, LenderPosition>,
    pub system_program: Program<'info, System>,
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
        space = 8 + std::mem::size_of::<RepaymentSchedule>(),
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
    
    // [DEFERRED-SPL]
    // #[account(mut)]
    // pub borrower_token_account: Account<'info, TokenAccount>,
    // #[account(mut)]
    // pub vault_token_account: Account<'info, TokenAccount>,
    // pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordLatePayment<'info> {
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct MarkDefault<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub pool: Account<'info, LoanPool>,
    #[account(mut, seeds=[b"schedule", pool.key().as_ref()], bump)]
    pub repayment_schedule: Account<'info, RepaymentSchedule>,
}

#[derive(Accounts)]
pub struct GetParticipantPosition<'info> {
    pub pool: Account<'info, LoanPool>,
    #[account(
        seeds = [SEED_POSITION, pool.key().as_ref(), participant.key().as_ref()],
        bump
    )]
    pub position: Option<Account<'info, LenderPosition>>,
    pub participant: Signer<'info>,
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
    
    // [DEFERRED-SPL]
    // #[account(mut)]
    // pub borrower_token_account: Account<'info, TokenAccount>,
    // #[account(mut)]
    // pub vault_token_account: Account<'info, TokenAccount>,
    // pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}
