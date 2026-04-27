use anchor_lang::prelude::*;

#[error_code]
#[derive(PartialEq)]
pub enum ErrorCode {
    #[msg("String too long")]
    StringTooLong,
    #[msg("Invalid component type")]
    InvalidComponent,
    #[msg("Already verified")]
    AlreadyVerified,
    #[msg("Lender cannot have financial scores")]
    LenderNoFinancials,
    #[msg("Invalid interest rate")]
    InvalidInterestRate,
    #[msg("Invalid duration")]
    InvalidDuration,
    #[msg("Invalid years covered")]
    InvalidYearsCovered,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid currency code")]
    InvalidCurrencyCode,
    #[msg("Invalid country code")]
    InvalidCountryCode,
    #[msg("Insufficient credit score")]
    InsufficientCredit,
    #[msg("Pool not open")]
    PoolNotOpen,
    #[msg("Over funding")]
    OverFunding,
    #[msg("Pool not funded")]
    PoolNotFunded,
    #[msg("Nothing to withdraw")]
    NothingToWithdraw,
    #[msg("Invalid pool status")]
    InvalidPoolStatus,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("The vault has insufficient funds for this operation.")]
    InsufficientFunds,
    #[msg("Invalid number of installments")]
    InvalidNumInstallments,
    #[msg("Too many installments")]
    TooManyInstallments,
    #[msg("Invalid installment interval")]
    InvalidInstallmentInterval,
    #[msg("Late penalty too high")]
    PenaltyTooHigh,
    #[msg("Early repayment discount too high")]
    DiscountTooHigh,
    #[msg("Repayment schedule inactive")]
    ScheduleInactive,
    #[msg("Insufficient payment amount")]
    InsufficientPayment,
}