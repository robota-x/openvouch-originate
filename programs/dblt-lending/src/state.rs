use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum LoanStatus {
    Pending,
    Funded,
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
pub struct LoanListing {
    pub borrower: Pubkey,
    pub amount: u64,
    pub interest_rate_bps: u64,
    pub status: LoanStatus,
    pub created_at: i64,
}
