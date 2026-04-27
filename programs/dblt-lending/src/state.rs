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
    pub company_name: [u8; 64],
    pub entity_name: [u8; 64],
    pub name_len: u8,
    pub identity_score: u8,
    pub max_identity_score: u8,
    pub financial_score: u8,
    pub max_financial_score: u8,
    pub financial_verified_flags: u8,
    pub has_profile: bool,
}

#[account]
pub struct TermOffer {
    pub authority: Pubkey,
    pub min_interest_rate_bps: u64,
    pub max_duration_days: u64,
    pub collateral_required: bool,
    pub description: [u8; 256],
    pub desc_len: u8,
    pub is_active: bool,
    pub created_at: i64,
}

#[account]
pub struct LoanPool {
    pub borrower: Pubkey,
    pub target_amount: u64,
    pub current_amount: u64,
    pub term_offer: Pubkey,
    pub status: u8,
    pub created_at: i64,
}

#[account]
pub struct LoanVault {
    pub pool: Pubkey,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub total_repaid: u64,
}

#[account]
pub struct LenderPosition {
    pub lender: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub withdrawn: u64,
}

#[account]
pub struct RepaymentSchedule {
    pub pool: Pubkey,
    pub borrower: Pubkey,
    pub total_repayable: u64,
    pub total_repaid: u64,
    pub current_installment: u8,
    pub num_installments: u8,
    pub installment_amount: u64,
    pub installment_interval_days: u32,
    pub start_date: i64,
    pub next_due_date: i64,
    pub late_penalty_bps: u16,
    pub early_repayment_discount_bps: u16,
    pub status: u8,
    pub defaulted_installment: u8,
}