use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer};
use crate::instructions::*; 
// use crate::state::*;
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
    let vault = &mut ctx.accounts.vault;

    require!(schedule.status == SCHEDULE_ACTIVE, ErrorCode::ScheduleInactive);

    let mut expected = schedule.installment_amount;

    if is_early && schedule.early_repayment_discount_bps > 0 {
        expected = expected.checked_mul(10000 - schedule.early_repayment_discount_bps as u64).unwrap().checked_div(10000).unwrap();
    }

    if is_late && schedule.late_penalty_bps > 0 {
        let penalty = expected.checked_mul(schedule.late_penalty_bps as u64).unwrap().checked_div(10000).unwrap();
        expected = expected.checked_add(penalty).unwrap();
    }

    require!(amount >= expected, ErrorCode::InsufficientPayment);

    let cpi_accounts = Transfer {
        from: ctx.accounts.borrower_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.borrower.to_account_info(),
    };

    token::transfer(
        CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts),
        amount,
    )?;

    schedule.total_repaid = schedule.total_repaid.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    schedule.current_installment = schedule.current_installment.saturating_add(1);
    vault.total_repaid = vault.total_repaid.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;

    if schedule.total_repaid >= schedule.total_repayable {
        schedule.status = SCHEDULE_COMPLETED;
    }

    Ok(())
}

pub fn record_late_payment(_ctx: Context<RecordLatePayment>, _inst: u8, _amt: u64) -> Result<()> {
    Ok(())
}

pub fn mark_default(ctx: Context<MarkDefault>) -> Result<()> {
    let schedule = &mut ctx.accounts.repayment_schedule;
    schedule.status = SCHEDULE_DEFAULTED;
    Ok(())
}

pub fn early_repay_all(ctx: Context<EarlyRepayAll>, amount: u64) -> Result<()> {
    let schedule = &mut ctx.accounts.repayment_schedule;
    let vault = &mut ctx.accounts.vault;
    
    let cpi_accounts = Transfer {
        from: ctx.accounts.borrower_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.borrower.to_account_info(),
    };

    token::transfer(
        CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts),
        amount,
    )?;

    schedule.total_repaid = schedule.total_repayable;
    schedule.status = SCHEDULE_COMPLETED;
    vault.total_repaid = vault.total_repaid.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
    
    Ok(())
}