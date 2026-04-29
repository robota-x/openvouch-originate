use anchor_lang::prelude::*;
use crate::error::ErrorCode;
use crate::constants::BPS_DIVIDER;

/// Mock representation of DBLT token amounts (since no SPL mint yet)
pub type DbltAmount = u64;

/// Global config for tokenomics
#[account]
pub struct TokenomicsConfig {
    pub listing_fee: DbltAmount,
    pub base_lender_reward_rate: u64, // tokens per unit liquidity*time
    pub borrower_reward_rate: u64,
    pub staking_reward_rate: u64,
}

/// Tracks staking pool for safety module
#[account]
pub struct StakingPool {
    pub total_staked: DbltAmount,
    pub reward_pool: DbltAmount,
}

/// Individual staker position
#[account]
pub struct StakePosition {
    pub owner: Pubkey,
    pub amount: DbltAmount,
    pub reward_debt: DbltAmount,
}

/// Lender position for reward calculation
#[account]
pub struct LenderPosition {
    pub owner: Pubkey,
    pub amount_lent: u64,
    pub interest_earned: u64,
    pub last_update: i64,
    pub accumulated_rewards: DbltAmount,
}

/// Borrower profile for incentives
#[account]
pub struct BorrowerProfile {
    pub owner: Pubkey,
    pub credit_score: u8, // 0–100
    pub loans_repaid: u64,
    pub rewards_earned: DbltAmount,
}

/// Governance voting power
#[account]
pub struct GovernancePosition {
    pub owner: Pubkey,
    pub locked_tokens: DbltAmount,
    pub lock_end: i64,
}

/// -------------------------------
//// Listing Fee Logic
/// -------------------------------
pub fn charge_listing_fee(config: &TokenomicsConfig) -> DbltAmount {
    config.listing_fee
}

/// -------------------------------
//// Staking / Safety Module
/// -------------------------------
pub fn stake_tokens(
    pool: &mut StakingPool,
    position: &mut StakePosition,
    amount: DbltAmount,
) -> Result<()> {
    position.amount = position.amount.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    pool.total_staked = pool.total_staked.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    Ok(())
}

pub fn distribute_staking_rewards(
    pool: &mut StakingPool,
    config: &TokenomicsConfig,
) -> Result<()> {
    let rewards = (pool.total_staked as u128)
        .checked_mul(config.staking_reward_rate as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BPS_DIVIDER as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;
    pool.reward_pool = pool.reward_pool.checked_add(rewards).ok_or(ErrorCode::MathOverflow)?;
    Ok(())
}

/// Covers protocol shortfall using staked funds
pub fn cover_default(pool: &mut StakingPool, loss: DbltAmount) {
    pool.total_staked = pool.total_staked.saturating_sub(loss);
}

/// -------------------------------
//// Lender Incentives
/// -------------------------------
pub fn update_lender_rewards(
    position: &mut LenderPosition,
    config: &TokenomicsConfig,
    current_time: i64,
) -> Result<()> {
    let duration = current_time.checked_sub(position.last_update).ok_or(ErrorCode::MathOverflow)?;
    if duration <= 0 {
        return Ok(());
    }

    let reward = (position.amount_lent as u128)
        .checked_mul(duration as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_mul(config.base_lender_reward_rate as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BPS_DIVIDER as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    position.accumulated_rewards = position.accumulated_rewards.checked_add(reward).ok_or(ErrorCode::MathOverflow)?;
    position.last_update = current_time;
    Ok(())
}

/// Optional ve-style boost (token locking multiplier)
pub fn apply_lock_boost(base_reward: DbltAmount, lock_multiplier_bps: u64) -> Result<DbltAmount> {
    base_reward
        .checked_mul(lock_multiplier_bps)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BPS_DIVIDER)
        .ok_or(ErrorCode::MathOverflow.into())
}

/// -------------------------------
//// Borrower Incentives
/// -------------------------------
pub fn reward_borrower_on_repayment(
    borrower: &mut BorrowerProfile,
    config: &TokenomicsConfig,
) -> Result<()> {
    let reward = config.borrower_reward_rate
        .checked_mul(borrower.credit_score as u64)
        .ok_or(ErrorCode::MathOverflow)?;
    
    borrower.rewards_earned = borrower.rewards_earned.checked_add(reward).ok_or(ErrorCode::MathOverflow)?;
    borrower.loans_repaid = borrower.loans_repaid.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
    Ok(())
}

/// -------------------------------
//// Governance & Utility
/// -------------------------------
pub fn calculate_voting_power(position: &GovernancePosition, current_time: i64) -> Result<u64> {
    if current_time > position.lock_end {
        return Ok(0);
    }

    let lock_duration = position.lock_end.checked_sub(current_time).ok_or(ErrorCode::MathOverflow)?;
    position.locked_tokens
        .checked_mul(lock_duration as u64)
        .ok_or(ErrorCode::MathOverflow.into())
}

/// Fee discount based on token holdings
pub fn fee_discount(token_balance: DbltAmount) -> u64 {
    match token_balance {
        0..=1_000 => 0,
        1_001..=10_000 => 5,   // 5% discount
        10_001..=100_000 => 10,
        _ => 20,
    }
}

/// -------------------------------
//// Risk-Weighted Rewards
/// -------------------------------
pub fn risk_weighted_reward(
    base_reward: DbltAmount,
    credit_score: u8,
) -> Result<DbltAmount> {
    // Higher rewards for lower credit score (riskier loans)
    // multiplier = (100 - score) % -> in BPS is (100 - score) * 100
    let risk_multiplier_bps = (100u64).checked_sub(credit_score as u64).ok_or(ErrorCode::MathOverflow)?
        .checked_mul(100).ok_or(ErrorCode::MathOverflow)?;
    
    let bonus = (base_reward as u128)
        .checked_mul(risk_multiplier_bps as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BPS_DIVIDER as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    base_reward.checked_add(bonus).ok_or(ErrorCode::MathOverflow.into())
}

/// Reward lenders for funding safer loans (alternative model)
pub fn safe_lending_bonus(
    base_reward: DbltAmount,
    credit_score: u8,
) -> Result<DbltAmount> {
    // Safety multiplier = score % -> in BPS is score * 100
    let safety_multiplier_bps = (credit_score as u64).checked_mul(100).ok_or(ErrorCode::MathOverflow)?;
    
    let bonus = (base_reward as u128)
        .checked_mul(safety_multiplier_bps as u128)
        .ok_or(ErrorCode::MathOverflow)?
        .checked_div(BPS_DIVIDER as u128)
        .ok_or(ErrorCode::MathOverflow)? as u64;

    base_reward.checked_add(bonus).ok_or(ErrorCode::MathOverflow.into())
}