use std::str::FromStr;
use anchor_lang::prelude::Pubkey;

#[test]
fn declare_id_matches_anchor_localnet_entry() {
    let expected = Pubkey::from_str(
        "6fXix7yZxeoqyL3wNtAHpPZ8dXAXQe3DXbVPeqcH1Gny"
    ).unwrap();

    assert_eq!(dblt_lending::id(), expected);
}
