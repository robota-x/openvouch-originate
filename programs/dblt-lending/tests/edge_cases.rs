use anchor_lang::prelude::*;
use dblt_lending::error::ErrorCode;
use dblt_lending::state::{PoolStatus};

#[test]
fn test_status_transitions() {
    assert_eq!(PoolStatus::Open as u8, 0);
    assert_eq!(PoolStatus::Funded as u8, 1);
    assert_eq!(PoolStatus::Active as u8, 2);
    assert_eq!(PoolStatus::Completed as u8, 3);
    assert_eq!(PoolStatus::Defaulted as u8, 4);
    assert_eq!(PoolStatus::Cancelled as u8, 5);
}

#[test]
fn test_error_definitions() {
    let _err1 = ErrorCode::OverFunding;
    let _err2 = ErrorCode::Overpayment;
    let _err3 = ErrorCode::BorrowerCannotDefaultSelf;
    let _err4 = ErrorCode::NotParticipant;
    let _err5 = ErrorCode::GracePeriodNotExceeded;
}
