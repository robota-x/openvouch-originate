use anchor_lang::prelude::*;
use anchor_lang::system_program;
// [DEFERRED-SPL]
// use anchor_spl::token::{self, Transfer};
use crate::instructions::*; 
use crate::state::*;
use crate::error::ErrorCode;
use crate::constants::*;

pub fn create_repayment_schedule(
    ctx: Context<CreateRepaymentSchedule>,
    total_repayable: u64,
    num_installments: u8,
    installment_interval_days: u32,
    late_penalty_bps: u16,
    early_repayment_discount_bps: u16,
) -> Result<()> {
    let schedule = &mut ctx.accounts.repayment_schedule;
    let pool = &ctx.accounts.pool;

    let installment_amount = total_repayable
        .checked_div(num_installments as u64)
        .ok_or(ErrorCode::MathOverflow)?;

    let now = Clock::get()?.unix_timestamp;

    schedule.pool = pool.key();
    schedule.borrower = pool.borrower;
    schedule.total_repayable = total_repayable;
    schedule.total_repaid = 0;
    schedule.num_installments = num_installments;
    schedule.current_installment = 0;
    schedule.installment_amount = installment_amount;
    schedule.installment_interval_days = installment_interval_days;
    schedule.late_penalty_bps = late_penalty_bps;
    schedule.early_repayment_discount_bps = early_repayment_discount_bps;
    schedule.start_date = now;
    schedule.next_due_date = now.checked_add(installment_interval_days as i64 * 86400).ok_or(ErrorCode::MathOverflow)?;
    
    schedule.status = SCHEDULE_ACTIVE;
    Ok(())
}

pub fn make_repayment(
    ctx: Context<MakeRepayment>,
    _installment_number: u8,
    amount: u64,
    is_early: bool,
    is_late: bool,
) -> Result<()> {
    let schedule = &mut ctx.accounts.repayment_schedule;
    let pool = &mut ctx.accounts.pool;
    let vault = &mut ctx.accounts.vault;
    let borrower = &ctx.accounts.borrower;

    require!(schedule.status == SCHEDULE_ACTIVE, ErrorCode::ScheduleInactive);

    // Over-payment protection
    let remaining_repayable = schedule.total_repayable.checked_sub(schedule.total_repaid).ok_or(ErrorCode::MathOverflow)?;
    require!(amount <= remaining_repayable, ErrorCode::Overpayment);

    let mut expected = schedule.installment_amount;

    if is_early && schedule.early_repayment_discount_bps > 0 {
        expected = expected.checked_mul(10000 - schedule.early_repayment_discount_bps as u64).unwrap().checked_div(10000).unwrap();
    }

    if is_late && schedule.late_penalty_bps > 0 {
        let penalty = expected.checked_mul(schedule.late_penalty_bps as u64).unwrap().checked_div(10000).unwrap();
        expected = expected.checked_add(penalty).unwrap();
    }

    require!(amount >= expected || amount == remaining_repayable, ErrorCode::InsufficientPayment);

    // Transfer SOL from borrower to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: borrower.to_account_info(),
                to: vault.to_account_info(),
            },
        ),
        amount,
    )?;

    schedule.total_repaid = schedule.total_repaid.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    schedule.current_installment = schedule.current_installment.saturating_add(1);
    vault.total_repaid = vault.total_repaid.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

    if schedule.total_repaid >= schedule.total_repayable {
        schedule.status = SCHEDULE_COMPLETED;
        pool.status = PoolStatus::Completed as u8;
    }

    Ok(())
}

pub fn record_late_payment(_ctx: Context<RecordLatePayment>, _inst: u8, _amt: u64) -> Result<()> {
    Ok(())
}

pub fn mark_default(ctx: Context<MarkDefault>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let schedule = &mut ctx.accounts.repayment_schedule;
    let authority = &ctx.accounts.authority;
    let clock = Clock::get()?;

    // Access control: Authority must be borrower or a lender
    // In a production environment, we would use a more efficient way to verify participant status.
    // For the hackathon, we allow any lender with a position account passed in remaining_accounts.
    let is_borrower = authority.key() == pool.borrower;
    
    let is_lender = if ctx.remaining_accounts.is_empty() {
        false
    } else {
        let acc = &ctx.remaining_accounts[0];
        if acc.owner != ctx.program_id { 
            false 
        } else {
            // Manual check for LenderPosition
            // LenderPosition: lender (32), pool (32), amount (8), withdrawn (8)
            let data = acc.try_borrow_data()?;
            if data.len() < 8 + 32 + 32 { 
                false 
            } else {
                // Offset 8: lender (32 bytes), Offset 40: pool (32 bytes)
                let lender_in_acc = Pubkey::new_from_array(data[8..40].try_into().unwrap());
                let pool_in_acc = Pubkey::new_from_array(data[40..72].try_into().unwrap());
                lender_in_acc == authority.key() && pool_in_acc == pool.key()
            }
        }
    };

    require!(is_borrower || is_lender, ErrorCode::NotParticipant);
    require!(!is_borrower, ErrorCode::BorrowerCannotDefaultSelf);

    // Timing check: Next due date + 30 days
    let grace_period = 30 * 24 * 60 * 60;
    require!(clock.unix_timestamp > schedule.next_due_date.checked_add(grace_period).ok_or(ErrorCode::MathOverflow)?, ErrorCode::GracePeriodNotExceeded);

    schedule.status = SCHEDULE_DEFAULTED;
    pool.status = PoolStatus::Defaulted as u8;
    Ok(())
}

pub fn early_repay_all(ctx: Context<EarlyRepayAll>, amount: u64) -> Result<()> {
    let schedule = &mut ctx.accounts.repayment_schedule;
    let vault = &mut ctx.accounts.vault;
    let borrower = &ctx.accounts.borrower;
    
    // Transfer SOL from borrower to vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.key(),
            system_program::Transfer {
                from: borrower.to_account_info(),
                to: vault.to_account_info(),
            },
        ),
        amount,
    )?;

    schedule.total_repaid = schedule.total_repayable;
    schedule.status = SCHEDULE_COMPLETED;
    vault.total_repaid = vault.total_repaid.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    
    Ok(())
}
