// use std::str::FromStr;
// use anchor_lang::prelude::Pubkey;

// #[test]
// fn declare_id_matches_anchor_localnet_entry() {
//     let expected = Pubkey::from_str(
//         "6fXix7yZxeoqyL3wNtAHpPZ8dXAXQe3DXbVPeqcH1Gny"
//     ).unwrap();

//     assert_eq!(dblt_lending::id(), expected);
// }

use std::str::FromStr;

use anchor_lang::prelude::Pubkey;
use dblt_lending::error::ErrorCode;
use dblt_lending::state::{PoolStatus, TermOffer, LoanPool};

/// 1. Verify the Program ID matches the declared ID in lib.rs
#[test]
fn declare_id_matches_anchor_localnet_entry() {let expected = Pubkey::from_str("6fXix7yZxeoqyL3wNtAHpPZ8dXAXQe3DXbVPeqcH1Gny").unwrap();
    assert_eq!(dblt_lending::id(), expected);
}

/// 2. Smoke Test: Verify Error Codes compile and are accessible
/// Ensures new errors (InsufficientCredit, PoolNotOpen, etc.) are correctly defined
#[test]
fn error_codes_compile_and_exist() {
    // Just instantiating them proves they exist in the enum
    let _err1 = ErrorCode::InvalidYearsCovered;
    let _err2 = ErrorCode::InsufficientCredit;
    let _err3 = ErrorCode::PoolNotOpen;
    let _err4 = ErrorCode::OverFunding;
    let _err5 = ErrorCode::PoolNotFunded;
    let _err6 = ErrorCode::InvalidInterestRate;
    let _err7 = ErrorCode::InvalidDuration;
    let _err8 = ErrorCode::InvalidAmount;
    
    // Verify original errors still exist
    let _orig1 = ErrorCode::InvalidComponent;
    let _orig2 = ErrorCode::LenderNoFinancials;

    // Assert they are distinct (basic sanity check)
    assert_ne!(_err1, _err2);
}

/// 3. Smoke Test: Verify State Enums compile
/// Ensures PoolStatus enum matches the new logic (Open, Funded, Active, etc.)
#[test]
fn pool_status_enum_exists() {
    let _open = PoolStatus::Open;
    let _funded = PoolStatus::Funded;
    let _active = PoolStatus::Active;
    let _completed = PoolStatus::Completed;
    let _defaulted = PoolStatus::Defaulted;
    
    // Verify we can cast to u8 as used in the handler
    let status_u8 = _open as u8;
    assert_eq!(status_u8, 0); // Open should be 0
}

/// 4. Smoke Test: Verify Struct Sizes (Basic Memory Check)
/// Ensures our new structs (TermOffer, LoanPool) have reasonable sizes
#[test]
fn new_structs_have_reasonable_sizes() {
    let term_offer_size = std::mem::size_of::<TermOffer>();
    let loan_pool_size = std::mem::size_of::<LoanPool>();
    
    // Sanity check: They should be larger than 0 and not absurdly huge (e.g., < 10KB)
    assert!(term_offer_size > 0 && term_offer_size < 10000);
    assert!(loan_pool_size > 0 && loan_pool_size < 10000);
    
    // Log sizes for debugging (optional)
    println!("TermOffer size: {} bytes", term_offer_size);
    println!("LoanPool size: {} bytes", loan_pool_size);
}

/// 5. Smoke Test: Verify Constants
#[test]
fn seeds_constants_exist() {
    use dblt_lending::constants::{SEED_PROFILE, SEED_LOAN};
    
    assert_eq!(SEED_PROFILE, b"profile");
    // Note: We updated SEED_LOAN to "pool" in constants.rs
    assert_eq!(SEED_LOAN, b"pool"); 
}