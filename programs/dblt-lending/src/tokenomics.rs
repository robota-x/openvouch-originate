use anchor_lang::prelude::*;

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
) {
    position.amount += amount;
    pool.total_staked += amount;
}

pub fn distribute_staking_rewards(
    pool: &mut StakingPool,
    config: &TokenomicsConfig,
) {
    let rewards = pool.total_staked * config.staking_reward_rate;
    pool.reward_pool += rewards;
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
) {
    let duration = current_time - position.last_update;
    if duration <= 0 {
        return;
    }

    let reward = (position.amount_lent as u64)
        * (duration as u64)
        * config.base_lender_reward_rate;

    position.accumulated_rewards += reward;
    position.last_update = current_time;
}

/// Optional ve-style boost (token locking multiplier)
pub fn apply_lock_boost(base_reward: DbltAmount, lock_multiplier: u64) -> DbltAmount {
    base_reward * lock_multiplier
}

/// -------------------------------
//// Borrower Incentives
/// -------------------------------
pub fn reward_borrower_on_repayment(
    borrower: &mut BorrowerProfile,
    config: &TokenomicsConfig,
) {
    let reward = config.borrower_reward_rate * borrower.credit_score as u64;
    borrower.rewards_earned += reward;
    borrower.loans_repaid += 1;
}

/// -------------------------------
//// Governance & Utility
/// -------------------------------
pub fn calculate_voting_power(position: &GovernancePosition, current_time: i64) -> u64 {
    if current_time > position.lock_end {
        return 0;
    }

    let lock_duration = position.lock_end - current_time;
    position.locked_tokens * lock_duration as u64
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
) -> DbltAmount {
    // Higher rewards for lower credit score (riskier loans)
    let risk_multiplier = 100 - credit_score as u64;
    base_reward * (1 + risk_multiplier / 100)
}

/// Reward lenders for funding safer loans (alternative model)
pub fn safe_lending_bonus(
    base_reward: DbltAmount,
    credit_score: u8,
) -> DbltAmount {
    let safety_multiplier = credit_score as u64;
    base_reward * (1 + safety_multiplier / 100)
}