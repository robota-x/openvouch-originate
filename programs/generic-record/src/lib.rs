use anchor_lang::prelude::*;

declare_id!("11111111111111111111111111111112");

#[program]
pub mod generic_record {
    use super::*;

    /// Records a two-signer attestation on-chain.
    ///
    /// Both signer1 and signer2 must co-sign the transaction.
    /// The record is a PDA seeded on [b"record", signer1, signer2] so each
    /// pair can have at most one record; re-initialisation requires closing
    /// the account first (not implemented — sufficient for the hackathon).
    pub fn create_record(
        ctx: Context<CreateRecord>,
        tx_link: Option<String>,
        external_url: Option<String>,
        text: String,
    ) -> Result<()> {
        require!(text.len() <= 256, RecordError::TextTooLong);
        if let Some(ref s) = tx_link {
            require!(s.len() <= 100, RecordError::TxLinkTooLong);
        }
        if let Some(ref s) = external_url {
            require!(s.len() <= 200, RecordError::ExternalUrlTooLong);
        }

        let record = &mut ctx.accounts.record;
        record.signer1 = ctx.accounts.signer1.key();
        record.signer2 = ctx.accounts.signer2.key();
        record.tx_link = tx_link;
        record.external_url = external_url;
        record.timestamp = Clock::get()?.unix_timestamp;
        record.text = text;
        Ok(())
    }
}

// ── Account contexts ──────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct CreateRecord<'info> {
    #[account(mut)]
    pub signer1: Signer<'info>,
    pub signer2: Signer<'info>,

    #[account(
        init,
        payer = signer1,
        space = 8 + RecordEntry::INIT_SPACE,
        seeds = [b"record", signer1.key().as_ref(), signer2.key().as_ref()],
        bump
    )]
    pub record: Account<'info, RecordEntry>,
    pub system_program: Program<'info, System>,
}

// ── Account state ─────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct RecordEntry {
    pub signer1: Pubkey,        // 32
    pub signer2: Pubkey,        // 32
    #[max_len(100)]
    pub tx_link: Option<String>,
    #[max_len(200)]
    pub external_url: Option<String>,
    pub timestamp: i64,         // Unix timestamp from Clock::get()
    #[max_len(256)]
    pub text: String,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum RecordError {
    #[msg("text must be 256 characters or fewer")]
    TextTooLong,
    #[msg("tx_link must be 100 characters or fewer")]
    TxLinkTooLong,
    #[msg("external_url must be 200 characters or fewer")]
    ExternalUrlTooLong,
}
