use std::str::FromStr;

use anchor_lang::prelude::Pubkey;

#[test]
fn declare_id_matches_anchor_localnet_entry() {
    let expected =
        Pubkey::from_str("AXdWprPxpre9hbCJpryiwktSYgBKKaoFHHTufwGRTfLQ").unwrap();
    assert_eq!(dblt_lending::id(), expected);
}
