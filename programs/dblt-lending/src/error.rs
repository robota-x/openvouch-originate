use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid verification component type")]
    InvalidComponent,
    #[msg("Already verified for this component")]
    AlreadyVerified,
    #[msg("Lenders do not need financial verification")]
    LenderNoFinancials,
    #[msg("Listing is not active")]
    ListingNotActive,
}
