// Updated errors
use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    // --- Original Errors ---
    #[msg("Invalid verification component type")]
    InvalidComponent,
    
    #[msg("Already verified for this component")]
    AlreadyVerified,
    
    #[msg("Lenders do not need financial verification")]
    LenderNoFinancials,
    
    #[msg("Listing is not active")]
    ListingNotActive,

    // --- New Errors for Term Offers & Pools ---
    
    #[msg("Invalid years covered (must be 1-3)")]
    InvalidYearsCovered,
    
    #[msg("Insufficient credit score to list (Identity + Financial must be > 0)")]
    InsufficientCredit,
    
    #[msg("Pool is not open for contributions")]
    PoolNotOpen,
    
    #[msg("Cannot overfund the pool")]
    OverFunding,
    
    #[msg("Pool is not fully funded yet")]
    PoolNotFunded,
    
    #[msg("Invalid interest rate (must be between 0 and 10000 bps)")]
    InvalidInterestRate,
    
    #[msg("Invalid duration (must be greater than 0 days)")]
    InvalidDuration,
    
    #[msg("Invalid target amount (must be greater than 0)")]
    InvalidAmount,
    
    #[msg("Unauthorized action")]
    Unauthorized,
}

