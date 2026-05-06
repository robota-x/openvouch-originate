// use anchor_lang::prelude::*;

// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
// pub enum PoolStatus {
//     Open,
//     Funded,
//     Active,
//     Completed,
//     Defaulted,
//     Cancelled,
// }

// #[account]
// pub struct Config {
//     pub admin: Pubkey,
//     pub dblt_mint: Pubkey,
//     pub platform_fee_bps: u64,
//     pub total_borrowers: u64,
//     pub total_lenders: u64,
// }

// #[account]
// pub struct UserProfile {
//     pub authority: Pubkey,
//     pub is_lender: bool,
//     pub company_name: [u8; 64],
//     pub entity_name: [u8; 64],
//     pub name_len: u8,
//     pub identity_score: u8,
//     pub max_identity_score: u8,
//     pub financial_score: u8,
//     pub max_financial_score: u8,
//     pub financial_verified_flags: u8,
//     pub has_profile: bool,
// }

// #[account]
// pub struct TermOffer {
//     pub authority: Pubkey,
//     pub min_interest_rate_bps: u64,
//     pub max_duration_days: u64,
//     pub collateral_required: bool,
//     pub description: [u8; 256],
//     pub desc_len: u8,
//     pub is_active: bool,
//     pub created_at: i64,
// }

// #[account]
// pub struct LoanPool {
//     pub borrower: Pubkey,
//     pub target_amount: u64,
//     pub current_amount: u64,
//     pub term_offer: Pubkey,
//     pub status: u8,
//     pub created_at: i64,
// }

// #[account]
// pub struct LoanVault {
//     pub pool: Pubkey,
//     pub total_deposited: u64,
//     pub total_withdrawn: u64,
//     pub total_repaid: u64,
// }

// #[account]
// pub struct LenderPosition {
//     pub lender: Pubkey,
//     pub pool: Pubkey,
//     pub amount: u64,
//     pub withdrawn: u64,
// }

// #[account]
// pub struct RepaymentSchedule {
//     pub pool: Pubkey,
//     pub borrower: Pubkey,
//     pub total_repayable: u64,
//     pub total_repaid: u64,
//     pub current_installment: u8,
//     pub num_installments: u8,
//     pub installment_amount: u64,
//     pub installment_interval_days: u32,
//     pub start_date: i64,
//     pub next_due_date: i64,
//     pub late_penalty_bps: u64,
//     pub early_repayment_discount_bps: u64,
//     pub status: u8,
//     pub defaulted_installment: u8,
// }

// use anchor_lang::prelude::*;

// /// Represents the lifecycle stages of a loan pool
// #[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
// pub enum PoolStatus {
//     Open,
//     Funded,
//     Active,
//     Completed,
//     Defaulted,
//     Cancelled,
// }

// /// Global configuration for the lending protocol
// #[account]
// pub struct Config {
//     pub admin: Pubkey,
//     pub dblt_mint: Pubkey,
//     pub platform_fee_bps: u64,
//     pub total_borrowers: u64,
//     pub total_lenders: u64,
// }

// /// User profile storing identity and financial metrics
// #[account]
// pub struct UserProfile {
//     pub authority: Pubkey,
//     pub is_lender: bool,
//     pub company_name: [u8; 64],
//     pub entity_name: [u8; 64],
//     pub name_len: u8,
//     pub identity_score: u8,
//     pub max_identity_score: u8,
//     pub financial_score: u8,
//     pub max_financial_score: u8,
//     pub financial_verified_flags: u8,
//     pub has_profile: bool,
// }

// /// A specific term offer created by a lender
// #[account]
// pub struct TermOffer {
//     pub authority: Pubkey,
//     pub min_interest_rate_bps: u64,
//     pub max_duration_days: u64,
//     pub collateral_required: bool,
//     pub description: [u8; 256],
//     pub desc_len: u8,
//     pub is_active: bool,
//     pub created_at: i64,
// }

// /// The core loan pool where funds are aggregated
// #[account]
// pub struct LoanPool {
//     pub borrower: Pubkey,
//     pub target_amount: u64,
//     pub current_amount: u64,
//     pub term_offer: Pubkey,
//     pub status: u8, // Stored as u8 to match PoolStatus enum
//     pub created_at: i64,
// }

// /// Vault holding the pooled funds
// #[account]
// pub struct LoanVault {
//     pub pool: Pubkey,
//     pub total_deposited: u64,
//     pub total_withdrawn: u64,
//     pub total_repaid: u64,
// }

// /// Tracks individual lender contribution to a specific pool
// #[account]
// pub struct LenderPosition {
//     pub lender: Pubkey,
//     pub pool: Pubkey,
//     pub amount: u64,
//     pub withdrawn: u64,
// }

// /// Detailed repayment schedule and tracking
// #[account]
// pub struct RepaymentSchedule {
//     pub pool: Pubkey,
//     pub borrower: Pubkey,
//     pub total_repayable: u64,
//     pub total_repaid: u64,
//     pub current_installment: u8,
//     pub num_installments: u8,
//     pub installment_amount: u64,
//     pub installment_interval_days: u32,
//     pub start_date: i64,
//     pub next_due_date: i64,
//     pub late_penalty_bps: u64,
//     pub early_repayment_discount_bps: u64,
//     pub status: u8,
//     pub defaulted_installment: u8,
// }
// pub struct Review {
//     /// The user who wrote the review (Signer of the transaction)
//     pub reviewer: Pubkey,
    
//     /// The user being reviewed (Target)
//     pub target: Pubkey,
    
//     /// The specific loan pool this review relates to
//     pub pool: Pubkey,
    
//     /// Rating from 1 to 5
//     pub rating: u8,
    
//     /// The comment text (UTF-8 encoded bytes). 
//     /// Max logical length enforced by instruction logic (~150 words).
//     /// Using Vec<u8> saves rent compared to a fixed [u8; 600] array.
//     pub comment: Vec<u8>,
    
//     /// Timestamp of creation
//     pub created_at: i64,
    
//     /// Optional: Hash of the comment for integrity checks (SHA-256 truncated or full)
//     /// If you want to verify the comment hasn't been tampered with if stored off-chain.
//     pub comment_hash: [u8; 32],
// }

// impl Review {
//     /// Helper to validate rating range
//     pub fn is_valid_rating(rating: u8) -> bool {
//         rating >= 1 && rating <= 5
//     }

//     /// Helper to estimate word count from byte vector (rough approximation)
//     /// Assumes average word length of ~5 bytes + 1 space. 
//     /// Strict word counting requires parsing UTF-8 which is expensive on-chain.
//     pub fn approximate_word_count(comment: &[u8]) -> usize {
//         if comment.is_empty() {
//             return 0;
//         }
//         // Heuristic: Count spaces + 1. 
//         // This is a rough estimate to prevent massive strings.
//         // For strict 150-word limits, the backend/frontend should enforce it before submission.
//         comment.iter().filter(|&&b| b == b' ').count() + 1
//     }
// }

// /// Optional: Metadata to track review counts per user on-chain (if needed for fast lookups)
// /// This is not strictly necessary if you query via backend, but useful for on-chain stats.
// #[account]
// pub struct UserReviewStats {
//     pub authority: Pubkey,
//     pub total_received_reviews: u64,
//     pub sum_ratings: u64, // To calculate average
//     pub total_given_reviews: u64,
// }



use anchor_lang::prelude::*;

/// Represents the lifecycle stages of a loan pool
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PoolStatus {
    Open,
    Funded,
    Active,
    Completed,
    Defaulted,
    Cancelled,
}

/// Global configuration for the lending protocol
#[account]
pub struct Config {
    pub admin: Pubkey,
    pub dblt_mint: Pubkey,
    pub platform_fee_bps: u64,
    pub total_borrowers: u64,
    pub total_lenders: u64,
}

/// User profile storing identity and financial metrics
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

/// A specific term offer created by a lender
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

/// The core loan pool where funds are aggregated
#[account]
pub struct LoanPool {
    pub borrower: Pubkey,
    pub target_amount: u64,
    pub current_amount: u64,
    pub term_offer: Pubkey,
    pub status: u8, // Stored as u8 to match PoolStatus enum
    pub created_at: i64,
}

/// Vault holding the pooled funds
#[account]
pub struct LoanVault {
    pub pool: Pubkey,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub total_repaid: u64,
}

/// Tracks individual lender contribution to a specific pool
#[account]
pub struct LenderPosition {
    pub lender: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub withdrawn: u64,
}

/// Detailed repayment schedule and tracking
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
    pub late_penalty_bps: u64,
    pub early_repayment_discount_bps: u64,
    pub status: u8,
    pub defaulted_installment: u8,
}

// ---------------------------------------------------------------------------
// SOCIAL REVIEW SYSTEM
// ---------------------------------------------------------------------------

/// Stores a review given by a participant (lender or borrower) after a loan concludes.
/// 
/// NOTE: Do NOT add #[derive(Clone)] manually. The #[account] macro automatically 
/// implements Clone, Serialize, Deserialize, and Owner. Adding it manually causes a conflict.
#[account]
pub struct Review {
    /// The user who wrote the review (Signer of the transaction)
    pub reviewer: Pubkey,
    
    /// The user being reviewed (Target)
    pub target: Pubkey,
    
    /// The specific loan pool this review relates to
    pub pool: Pubkey,
    
    /// Rating from 1 to 5
    pub rating: u8,
    
    /// The comment text (UTF-8 encoded bytes). 
    /// Max logical length enforced by instruction logic (~150 words).
    /// Using Vec<u8> saves rent compared to a fixed [u8; 600] array.
    pub comment: Vec<u8>,
    
    /// Timestamp of creation
    pub created_at: i64,
    
    /// SHA-256 hash of the comment for integrity checks.
    /// Allows verification if the full text is stored off-chain.
    pub comment_hash: [u8; 32],
}

/// Optional: Metadata to track review counts per user on-chain.
/// Useful for fast lookups without querying all reviews.
#[account]
pub struct UserReviewStats {
    pub authority: Pubkey,
    pub total_received_reviews: u64,
    pub sum_ratings: u64, // To calculate average
    pub total_given_reviews: u64,
}

