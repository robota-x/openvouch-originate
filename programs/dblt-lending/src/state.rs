// Updated code with new functions for term offers and loan pools, as well as contribution and finalization of pools.

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PoolStatus {
    Open,
    Funded,
    Active,
    Completed,
    Defaulted,
}

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub dblt_mint: Pubkey,
    pub platform_fee_bps: u16,
    pub total_borrowers: u64,
    pub total_lenders: u64,
}

#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub is_lender: bool,
    pub company_name: Option<String>,
    pub entity_name: Option<String>,
    pub identity_score: u8,
    pub max_score: u8,
    pub financial_score: u8,
    pub financial_max_score: u8,
    pub has_profile: bool,
}

#[account]
pub struct TermOffer {
    pub authority: Pubkey,
    pub min_interest_rate_bps: u64,
    pub max_duration_days: u64,
    pub collateral_required: bool,
    pub description: String,
    pub is_active: bool,
    pub created_at: i64,
}

#[account]
pub struct LoanPool {
    pub borrower: Pubkey,
    pub target_amount: u64,
    pub current_amount: u64,
    pub term_offer: Pubkey,
    pub years_data_hash: String,
    pub years_covered: u8,
    pub status: u8,
    pub created_at: i64,
}
