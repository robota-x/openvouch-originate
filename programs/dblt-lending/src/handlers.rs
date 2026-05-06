// use anchor_lang::prelude::*;
// use anchor_lang::system_program;
// use crate::instructions::*; 
// use crate::state::*;
// use crate::error::ErrorCode;

// // --- INITIALIZE ---
// pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
//     let config = &mut ctx.accounts.config;
//     config.admin = admin;
//     // [DEFERRED-SPL]
//     // config.dblt_mint = ctx.accounts.dblt_mint.key();
//     config.platform_fee_bps = 50;
//     config.total_borrowers = 0;
//     config.total_lenders = 0;
//     Ok(())
// }

// // --- USERS ---
// pub fn register_borrower(ctx: Context<RegisterUser>, company_name: String) -> Result<()> {
//     let user_profile = &mut ctx.accounts.user_profile;
//     let user = &ctx.accounts.user;

//     user_profile.authority = user.key();
//     user_profile.is_lender = false;
//     user_profile.identity_score = 0; 
//     user_profile.financial_score = 0; 
//     user_profile.max_identity_score = 100;
//     user_profile.max_financial_score = 100;
//     user_profile.has_profile = true;
//     user_profile.financial_verified_flags = 0;

//     let name_bytes = company_name.as_bytes();
//     let len = name_bytes.len().min(64);
//     user_profile.company_name[..len].copy_from_slice(&name_bytes[..len]);
//     user_profile.name_len = len as u8;
//     user_profile.entity_name = [0u8; 64];

//     msg!("Borrower registered: {}", user_profile.key());
//     Ok(())
// }

// pub fn register_lender(ctx: Context<RegisterUser>, entity_name: String) -> Result<()> {
//     let user_profile = &mut ctx.accounts.user_profile;
//     let user = &ctx.accounts.user;

//     user_profile.authority = user.key();
//     user_profile.is_lender = true;
//     user_profile.identity_score = 0; 
//     user_profile.financial_score = 0; 
//     user_profile.max_identity_score = 100;
//     user_profile.max_financial_score = 100;
//     user_profile.has_profile = true;
//     user_profile.financial_verified_flags = 0;

//     let name_bytes = entity_name.as_bytes();
//     let len = name_bytes.len().min(64);
//     user_profile.entity_name[..len].copy_from_slice(&name_bytes[..len]);
//     user_profile.name_len = len as u8;
//     user_profile.company_name = [0u8; 64];

//     msg!("Lender registered: {}", user_profile.key());
//     Ok(())
// }

// // --- SCORE ---
// pub fn update_identity_score(ctx: Context<UpdateScore>, new_score: u8) -> Result<()> {
//     let user_profile = &mut ctx.accounts.user_profile;
//     require!(new_score <= 100, ErrorCode::InvalidComponent);
//     if user_profile.is_lender { return Err(ErrorCode::LenderNoFinancials.into()); }
//     user_profile.identity_score = new_score;
//     msg!("Identity score updated: {}", new_score);
//     Ok(())
// }

// pub fn update_financial_score(ctx: Context<UpdateScore>, new_score: u8) -> Result<()> {
//     let user_profile = &mut ctx.accounts.user_profile;
//     require!(new_score <= 100, ErrorCode::InvalidComponent);
//     if user_profile.is_lender { return Err(ErrorCode::LenderNoFinancials.into()); }
//     user_profile.financial_score = new_score;
//     msg!("Financial score updated: {}", new_score);
//     Ok(())
// }

// // --- CONTRIBUTION ---
// pub fn contribute_to_pool(ctx: Context<ContributeToPool>, amount: u64) -> Result<()> {
//     let pool = &mut ctx.accounts.pool;
//     let vault = &mut ctx.accounts.vault;
//     let position = &mut ctx.accounts.position;
    
//     // Check pool status
//     require!(pool.status == PoolStatus::Open as u8, ErrorCode::ListingNotOpen);

//     // Over-funding protection
//     let remaining = pool.target_amount.checked_sub(pool.current_amount).ok_or(ErrorCode::MathOverflow)?;
//     require!(amount <= remaining, ErrorCode::OverFunding);

//     // Transfer SOL from lender to vault
//     system_program::transfer(
//         CpiContext::new(
//             ctx.accounts.system_program.key(),
//             system_program::Transfer {
//                 from: ctx.accounts.lender.to_account_info(),
//                 to: vault.to_account_info(),
//             },
//         ),
//         amount,
//     )?;

//     pool.current_amount = pool.current_amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
//     vault.total_deposited = vault.total_deposited.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    
//     position.lender = ctx.accounts.lender.key();
//     position.pool = pool.key();
//     position.amount = position.amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

//     // If target reached, mark as funded
//     if pool.current_amount >= pool.target_amount {
//         pool.status = PoolStatus::Funded as u8;
//     }

//     msg!("Contribution made: {}", amount);
//     Ok(())
// }

// // --- DISBURSE ---
// pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
//     let pool = &mut ctx.accounts.pool;
//     let vault = &mut ctx.accounts.vault;
//     let borrower = &ctx.accounts.borrower;

//     require!(pool.status == PoolStatus::Funded as u8, ErrorCode::PoolNotFunded);

//     // TODO [PRODUCTION]: Schedule creation should ideally be atomic with finalization/disbursement 
//     // to prevent funds being locked without repayment rules.

//     let amount = vault.total_deposited;
    
//     // Transfer SOL from vault to borrower
//     // Since vault is a PDA carrying data, we manually adjust lamports
//     let vault_info = vault.to_account_info();
//     let borrower_info = borrower.to_account_info();

//     **vault_info.try_borrow_mut_lamports()? = vault_info.lamports()
//         .checked_sub(amount)
//         .ok_or(ErrorCode::MathOverflow)?;
        
//     **borrower_info.try_borrow_mut_lamports()? = borrower_info.lamports()
//         .checked_add(amount)
//         .ok_or(ErrorCode::MathOverflow)?;

//     vault.total_withdrawn = vault.total_withdrawn.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
//     pool.status = PoolStatus::Active as u8;

//     msg!("Loan disbursed to borrower: {}", borrower.key());
//     Ok(())
// }

// // --- FINALIZE ---
// pub fn finalize_pool(ctx: Context<FinalizePool>) -> Result<()> {
//     let pool = &mut ctx.accounts.pool;
//     pool.status = PoolStatus::Funded as u8; 
//     Ok(())
// }

// // --- CANCEL ---
// pub fn cancel_loan(ctx: Context<CancelLoan>) -> Result<()> {
//     let pool = &mut ctx.accounts.pool;

//     // Allow cancellation if Open or Funded (but not yet Disbursed/Active)
//     require!(
//         pool.status == PoolStatus::Open as u8 || pool.status == PoolStatus::Funded as u8, 
//         ErrorCode::InvalidPoolStatus
//     );
    
//     require!(pool.borrower == ctx.accounts.borrower.key(), ErrorCode::Unauthorized);

//     pool.status = PoolStatus::Cancelled as u8;
//     Ok(())
// }

// // --- WITHDRAW ---
// pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
//     let position = &mut ctx.accounts.position;
//     let vault = &mut ctx.accounts.vault;
//     let pool = &ctx.accounts.pool;
//     let lender = &ctx.accounts.lender;
//     let clock = Clock::get()?;

//     let is_cancelled = pool.status == PoolStatus::Cancelled as u8;
//     // Stale check includes Open and Funded (if borrower didn't disburse)
//     let is_stale = (pool.status == PoolStatus::Open as u8 || pool.status == PoolStatus::Funded as u8) && 
//         clock.unix_timestamp >= pool.created_at.checked_add(7 * 24 * 60 * 60).ok_or(ErrorCode::MathOverflow)?;

//     let claimable = if is_cancelled || is_stale {
//         // Full principal refund
//         position.amount.saturating_sub(position.withdrawn)
//     } else {
//         // Pro-rata withdrawal logic:
//         // (Lender Position / Total Pool Target) * Total Repaid into Vault
//         // Calculation uses integer division which truncates (rounds down), protecting the vault.
//         let share = (position.amount as u128)
//             .checked_mul(vault.total_repaid as u128)
//             .ok_or(ErrorCode::MathOverflow)?
//             .checked_div(pool.target_amount as u128)
//             .ok_or(ErrorCode::MathOverflow)? as u64;

//         share.saturating_sub(position.withdrawn)
//     };

//     require!(claimable > 0, ErrorCode::InsufficientFunds);
    
//     // Transfer SOL from vault to lender
//     // Since vault is a PDA carrying data, we manually adjust lamports
//     let vault_info = vault.to_account_info();
//     let lender_info = lender.to_account_info();

//     **vault_info.try_borrow_mut_lamports()? = vault_info.lamports()
//         .checked_sub(claimable)
//         .ok_or(ErrorCode::MathOverflow)?;
        
//     **lender_info.try_borrow_mut_lamports()? = lender_info.lamports()
//         .checked_add(claimable)
//         .ok_or(ErrorCode::MathOverflow)?;

//     position.withdrawn = position.withdrawn.checked_add(claimable).ok_or(ErrorCode::MathOverflow)?;
//     Ok(())
// }

// pub fn create_loan_pool(
//     ctx: Context<CreateLoanPool>,
//     target_amount: u64,
//     term_offer_id: Pubkey,
//     _years_data_hash: String,
//     _years_covered: u8,
//     _currency: String,
//     _country: String,
// ) -> Result<()> {
//     let pool = &mut ctx.accounts.pool;
//     let vault = &mut ctx.accounts.vault;
//     let clock = Clock::get()?;

//     pool.borrower = ctx.accounts.borrower.key();
//     pool.target_amount = target_amount;
//     pool.current_amount = 0;
//     pool.term_offer = term_offer_id;
//     pool.status = 0; // Open
//     pool.created_at = clock.unix_timestamp;

//     vault.pool = pool.key();
//     vault.total_deposited = 0;
//     vault.total_withdrawn = 0;
//     vault.total_repaid = 0;

//     Ok(())
// }


use anchor_lang::prelude::*;
use anchor_lang::system_program;
use sha2::{Sha256, Digest};
use crate::instructions::*; 
use crate::state::*;
use crate::error::ErrorCode;

// --- INITIALIZE ---
pub fn initialize(ctx: Context<Initialize>, admin: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = admin;
    
    // FIX: The 'dblt_mint' account was commented out in the Initialize context.
    // We cannot access ctx.accounts.dblt_mint. 
    // Option A: Set to default if not used yet.
    config.dblt_mint = Pubkey::default(); 
    
    // Option B: If you plan to use it later, uncomment the 'dblt_mint' field in 
    // instructions.rs::Initialize and uncomment the line below:
    // config.dblt_mint = ctx.accounts.dblt_mint.key();

    config.platform_fee_bps = 50;
    config.total_borrowers = 0;
    config.total_lenders = 0;
    msg!("Config initialized by admin: {}", admin);
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
    if user_profile.is_lender { 
        return Err(ErrorCode::LenderNoFinancials.into()); 
    }
    user_profile.identity_score = new_score;
    msg!("Identity score updated: {}", new_score);
    Ok(())
}

pub fn update_financial_score(ctx: Context<UpdateScore>, new_score: u8) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    require!(new_score <= 100, ErrorCode::InvalidComponent);
    if user_profile.is_lender { 
        return Err(ErrorCode::LenderNoFinancials.into()); 
    }
    user_profile.financial_score = new_score;
    msg!("Financial score updated: {}", new_score);
    Ok(())
}

// --- CONTRIBUTION ---
pub fn contribute_to_pool(ctx: Context<ContributeToPool>, amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault = &mut ctx.accounts.vault;
    let position = &mut ctx.accounts.position;
    
    // Check pool status
    require!(pool.status == PoolStatus::Open as u8, ErrorCode::ListingNotOpen);

    // Over-funding protection
    let remaining = pool.target_amount.checked_sub(pool.current_amount).ok_or(ErrorCode::MathOverflow)?;
    require!(amount <= remaining, ErrorCode::OverFunding);

    // Transfer SOL from lender to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: ctx.accounts.lender.to_account_info(),
                to: vault.to_account_info(),
            },
        ),
        amount,
    )?;

    pool.current_amount = pool.current_amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    vault.total_deposited = vault.total_deposited.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    
    // Initialize or update position
    position.lender = ctx.accounts.lender.key();
    position.pool = pool.key();
    position.amount = position.amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

    // If target reached, mark as funded
    if pool.current_amount >= pool.target_amount {
        pool.status = PoolStatus::Funded as u8;
    }

    msg!("Contribution made: {}", amount);
    Ok(())
}

// --- DISBURSE ---
pub fn disburse_loan(ctx: Context<DisburseLoan>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault = &mut ctx.accounts.vault;
    let borrower = &ctx.accounts.borrower;

    require!(pool.status == PoolStatus::Funded as u8, ErrorCode::PoolNotFunded);

    let amount = vault.total_deposited;
    
    // Transfer SOL from vault to borrower
    let vault_info = vault.to_account_info();
    let borrower_info = borrower.to_account_info();

    **vault_info.try_borrow_mut_lamports()? = vault_info.lamports()
        .checked_sub(amount)
        .ok_or(ErrorCode::MathOverflow)?;
        
    **borrower_info.try_borrow_mut_lamports()? = borrower_info.lamports()
        .checked_add(amount)
        .ok_or(ErrorCode::MathOverflow)?;

    vault.total_withdrawn = vault.total_withdrawn.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    pool.status = PoolStatus::Active as u8;

    msg!("Loan disbursed to borrower: {}", borrower.key());
    Ok(())
}

// --- FINALIZE ---
pub fn finalize_pool(ctx: Context<FinalizePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    // Transition logic if needed
    pool.status = PoolStatus::Funded as u8; 
    msg!("Pool finalized");
    Ok(())
}

// --- CANCEL ---
pub fn cancel_loan(ctx: Context<CancelLoan>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Allow cancellation if Open or Funded (but not yet Disbursed/Active)
    require!(
        pool.status == PoolStatus::Open as u8 || pool.status == PoolStatus::Funded as u8, 
        ErrorCode::InvalidPoolStatus
    );
    
    require!(pool.borrower == ctx.accounts.borrower.key(), ErrorCode::Unauthorized);

    pool.status = PoolStatus::Cancelled as u8;
    msg!("Loan cancelled by borrower");
    Ok(())
}

// --- WITHDRAW ---
pub fn withdraw_funds(ctx: Context<WithdrawFunds>) -> Result<()> {
    let position = &mut ctx.accounts.position;
    let vault = &mut ctx.accounts.vault;
    let pool = &ctx.accounts.pool;
    let lender = &ctx.accounts.lender;
    let clock = Clock::get()?;

    let is_cancelled = pool.status == PoolStatus::Cancelled as u8;
    // Stale check includes Open and Funded (if borrower didn't disburse)
    let is_stale = (pool.status == PoolStatus::Open as u8 || pool.status == PoolStatus::Funded as u8) && 
        clock.unix_timestamp >= pool.created_at.checked_add(7 * 24 * 60 * 60).ok_or(ErrorCode::MathOverflow)?;

    let claimable = if is_cancelled || is_stale {
        // Full principal refund
        position.amount.saturating_sub(position.withdrawn)
    } else {
        // Pro-rata withdrawal logic:
        // (Lender Position / Total Pool Target) * Total Repaid into Vault
        let share = (position.amount as u128)
            .checked_mul(vault.total_repaid as u128)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(pool.target_amount as u128)
            .ok_or(ErrorCode::MathOverflow)? as u64;

        share.saturating_sub(position.withdrawn)
    };

    require!(claimable > 0, ErrorCode::InsufficientFunds);
    
    // Transfer SOL from vault to lender
    let vault_info = vault.to_account_info();
    let lender_info = lender.to_account_info();

    **vault_info.try_borrow_mut_lamports()? = vault_info.lamports()
        .checked_sub(claimable)
        .ok_or(ErrorCode::MathOverflow)?;
        
    **lender_info.try_borrow_mut_lamports()? = lender_info.lamports()
        .checked_add(claimable)
        .ok_or(ErrorCode::MathOverflow)?;

    position.withdrawn = position.withdrawn.checked_add(claimable).ok_or(ErrorCode::MathOverflow)?;
    msg!("Funds withdrawn: {}", claimable);
    Ok(())
}

pub fn create_loan_pool(
    ctx: Context<CreateLoanPool>,
    target_amount: u64,
    term_offer_id: Pubkey,
    _years_data_hash: String,
    _years_covered: u8,
    _currency: String,
    _country: String,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let vault = &mut ctx.accounts.vault;
    let clock = Clock::get()?;

    pool.borrower = ctx.accounts.borrower.key();
    pool.target_amount = target_amount;
    pool.current_amount = 0;
    pool.term_offer = term_offer_id;
    pool.status = 0; // Open
    pool.created_at = clock.unix_timestamp;

    vault.pool = pool.key();
    vault.total_deposited = 0;
    vault.total_withdrawn = 0;
    vault.total_repaid = 0;

    msg!("Loan pool created: {}", pool.key());
    Ok(())
}

// --- REVIEW SYSTEM ---

/// Handles the submission of a review (rating + comment) for a completed loan.
pub fn submit_review(
    ctx: Context<SubmitReview>,
    rating: u8,
    comment: String,
) -> Result<()> {
    // 1. Validate Rating (1-5)
    require!(rating >= 1 && rating <= 5, ErrorCode::InvalidRating);

    // 2. Validate Comment Length
    // We enforce a byte limit here as a safety net. 
    // Strict 150-word counting is expensive on-chain; frontend/backend should enforce it primarily.
    // 150 words * ~5 bytes/word + spaces ~ 900 bytes max.
    require!(comment.len() <= 1000, ErrorCode::CommentTooLong);

    // 3. Check Loan Status (Must be Completed or Defaulted)
    let pool = &ctx.accounts.pool;
    require!(
        pool.status == PoolStatus::Completed as u8 || pool.status == PoolStatus::Defaulted as u8,
        ErrorCode::LoanNotFinished
    );

    // 4. Verify Participant
    // The reviewer must be either the borrower OR the lender associated with this position.
    let reviewer_key = ctx.accounts.reviewer.key();
    let is_borrower = reviewer_key == pool.borrower;
    
    // FIX: Changed 'reviewer_position' to 'position' to match instructions.rs
    let is_lender = reviewer_key == ctx.accounts.position.lender;
    
    require!(is_borrower || is_lender, ErrorCode::NotParticipant);

    // 5. Determine Target (Who is being reviewed?)
    let target_key = if is_borrower {
        // Borrower is reviewing the Lender
        // FIX: Changed 'reviewer_position' to 'position'
        ctx.accounts.position.lender
    } else {
        // Lender is reviewing the Borrower
        pool.borrower
    };

    // 6. Calculate Comment Hash for Integrity
    let mut hasher = Sha256::new();
    hasher.update(comment.as_bytes());
    let hash_result = hasher.finalize();
    let mut comment_hash = [0u8; 32];
    comment_hash.copy_from_slice(&hash_result);

    // 7. Initialize Review Account
    let review = &mut ctx.accounts.review;
    review.reviewer = reviewer_key;
    review.target = target_key;
    review.pool = pool.key();
    review.rating = rating;
    review.comment = comment.into_bytes(); // Store as Vec<u8>
    review.comment_hash = comment_hash;
    review.created_at = Clock::get()?.unix_timestamp;

    msg!("Review submitted for pool {} by {}", pool.key(), reviewer_key);
    Ok(())
}