use std::str::FromStr;
use anchor_lang::prelude::*;
use anchor_lang::InstructionData;
use solana_program_test::*;
use solana_sdk::{
    instruction::{Instruction, AccountMeta as SdkAccountMeta},
    pubkey::Pubkey as SdkPubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
    system_instruction,
};
use dblt_lending::state::{LoanPool, RepaymentSchedule, PoolStatus};

// Bridge the Clock type mismatch
use solana_sdk::{
    clock::Clock as SdkClock,
};

fn to_sdk_pubkey(p: Pubkey) -> SdkPubkey {
    SdkPubkey::from_str(&p.to_string()).unwrap()
}

fn from_sdk_pubkey(p: SdkPubkey) -> Pubkey {
    Pubkey::from_str(&p.to_string()).unwrap()
}

fn to_sdk_account_meta(m: AccountMeta) -> SdkAccountMeta {
    SdkAccountMeta {
        pubkey: to_sdk_pubkey(m.pubkey),
        is_signer: m.is_signer,
        is_writable: m.is_writable,
    }
}

fn sys_prog() -> Pubkey {
    Pubkey::from_str("11111111111111111111111111111111").unwrap()
}

async fn setup_test() -> (ProgramTestContext, Keypair) {
    let program_id_str = dblt_lending::id().to_string();
    let program_id = SdkPubkey::from_str(&program_id_str).unwrap();
    
    let program_test = ProgramTest::new(
        "dblt_lending",
        program_id,
        None,
    );
    
    (program_test.start_with_context().await, Keypair::new())
}

async fn airdrop(context: &mut ProgramTestContext, receiver: &SdkPubkey, amount: u64) {
    let tx = Transaction::new_signed_with_payer(
        &[system_instruction::transfer(&context.payer.pubkey(), receiver, amount)],
        Some(&context.payer.pubkey()),
        &[&context.payer],
        context.last_blockhash,
    );
    context.banks_client.process_transaction(tx).await.unwrap();
}

#[tokio::test]
async fn test_full_loan_lifecycle_and_safety_rails() {
    let (mut context, borrower) = setup_test().await;
    let program_id = dblt_lending::id();
    let sdk_program_id = to_sdk_pubkey(program_id);

    airdrop(&mut context, &borrower.pubkey(), 5_000_000_000).await;

    // 1. Register Borrower
    let (borrower_profile_pda, _) = Pubkey::find_program_address(&[b"profile", from_sdk_pubkey(borrower.pubkey()).as_ref()], &program_id);
    let reg_borrower_ix = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::RegisterUser {
            user: from_sdk_pubkey(borrower.pubkey()),
            user_profile: borrower_profile_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::RegisterBorrower { company_name: "B".to_string() }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[reg_borrower_ix], Some(&borrower.pubkey()), &[&borrower], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 2. Create Pool
    let pool_keypair = Keypair::new();
    let (vault_pda, _) = Pubkey::find_program_address(&[b"vault", from_sdk_pubkey(pool_keypair.pubkey()).as_ref()], &program_id);
    let create_ix = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::CreateLoanPool {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::CreateLoanPool {
            target_amount: 1_000_000_000,
            term_offer_id: Pubkey::new_unique(),
            years_data_hash: "".to_string(),
            years_covered: 1,
            currency: "SOL".to_string(),
            country: "UK".to_string(),
        }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[create_ix], Some(&borrower.pubkey()), &[&borrower, &pool_keypair], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 3. Contribute (Lender 1)
    let lender1 = Keypair::new();
    airdrop(&mut context, &lender1.pubkey(), 2_000_000_000).await;
    let (l1_profile_pda, _) = Pubkey::find_program_address(&[b"profile", from_sdk_pubkey(lender1.pubkey()).as_ref()], &program_id);
    let (pos1_pda, _) = Pubkey::find_program_address(&[b"position", from_sdk_pubkey(pool_keypair.pubkey()).as_ref(), from_sdk_pubkey(lender1.pubkey()).as_ref()], &program_id);
    
    let reg_l1_ix = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::RegisterUser {
            user: from_sdk_pubkey(lender1.pubkey()),
            user_profile: l1_profile_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::RegisterLender { entity_name: "L1".to_string() }.data(),
    };
    let contribute_ix = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::ContributeToPool {
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            lender: from_sdk_pubkey(lender1.pubkey()),
            lender_profile: l1_profile_pda,
            position: pos1_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::ContributeToPool { amount: 500_000_000 }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[reg_l1_ix, contribute_ix], Some(&lender1.pubkey()), &[&lender1], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 4. Test Cancellation window
    let cancel_ix = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::CancelLoan {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::CancelLoan {}.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[cancel_ix.clone()], Some(&borrower.pubkey()), &[&borrower], context.last_blockhash);
    let result = context.banks_client.process_transaction(tx).await;
    assert!(result.is_err()); 

    // 5. Warp 8 Days
    let mut clock: SdkClock = context.banks_client.get_sysvar().await.unwrap();
    clock.unix_timestamp += 8 * 24 * 60 * 60;
    context.set_sysvar(&clock);
    context.warp_to_slot(100).unwrap(); 

    // 6. Cancel Request
    let tx = Transaction::new_signed_with_payer(&[cancel_ix], Some(&borrower.pubkey()), &[&borrower], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    let pool_account = context.banks_client.get_account(pool_keypair.pubkey()).await.unwrap().unwrap();
    let pool_data: LoanPool = LoanPool::try_deserialize(&mut &pool_account.data[..]).unwrap();
    assert_eq!(pool_data.status, PoolStatus::Cancelled as u8);

    // 7. Lender 1 Reclaims principal
    let withdraw_ix = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::WithdrawFunds {
            lender: from_sdk_pubkey(lender1.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            position: pos1_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::WithdrawFunds {}.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[withdraw_ix], Some(&lender1.pubkey()), &[&lender1], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();
}

#[tokio::test]
async fn test_repayment_precision_and_rounding() {
    let (mut context, borrower) = setup_test().await;
    let program_id = dblt_lending::id();
    let sdk_program_id = to_sdk_pubkey(program_id);

    airdrop(&mut context, &borrower.pubkey(), 5_000_000_000).await;

    // 1. Setup pool and fund it
    let pool_keypair = Keypair::new();
    let (vault_pda, _) = Pubkey::find_program_address(&[b"vault", from_sdk_pubkey(pool_keypair.pubkey()).as_ref()], &program_id);
    let (schedule_pda, _) = Pubkey::find_program_address(&[b"schedule", from_sdk_pubkey(pool_keypair.pubkey()).as_ref()], &program_id);
    
    // Register & Create Pool
    let (b_prof, _) = Pubkey::find_program_address(&[b"profile", from_sdk_pubkey(borrower.pubkey()).as_ref()], &program_id);
    let reg_b = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::RegisterUser {
            user: from_sdk_pubkey(borrower.pubkey()),
            user_profile: b_prof,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::RegisterBorrower { company_name: "B".to_string() }.data(),
    };
    let create = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::CreateLoanPool {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::CreateLoanPool {
            target_amount: 100_000_000,
            term_offer_id: Pubkey::new_unique(),
            years_data_hash: "".to_string(),
            years_covered: 1,
            currency: "SOL".to_string(),
            country: "UK".to_string(),
        }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[reg_b, create], Some(&borrower.pubkey()), &[&borrower, &pool_keypair], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // Fund
    let lender = Keypair::new();
    airdrop(&mut context, &lender.pubkey(), 1_000_000_000).await;
    let (l_prof, _) = Pubkey::find_program_address(&[b"profile", from_sdk_pubkey(lender.pubkey()).as_ref()], &program_id);
    let (pos, _) = Pubkey::find_program_address(&[b"position", from_sdk_pubkey(pool_keypair.pubkey()).as_ref(), from_sdk_pubkey(lender.pubkey()).as_ref()], &program_id);
    let reg_l = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::RegisterUser {
            user: from_sdk_pubkey(lender.pubkey()),
            user_profile: l_prof,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::RegisterLender { entity_name: "L".to_string() }.data(),
    };
    let fund = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::ContributeToPool {
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            lender: from_sdk_pubkey(lender.pubkey()),
            lender_profile: l_prof,
            position: pos,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::ContributeToPool { amount: 100_000_000 }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[reg_l, fund], Some(&lender.pubkey()), &[&lender], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // Disburse
    let disburse = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::DisburseLoan {
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            borrower: from_sdk_pubkey(borrower.pubkey()),
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::DisburseLoan {}.data(),
    };
    
    // 2. Create Repayment Schedule with 3 installments
    // 100,000,001 / 3 = 33,333,333.666... -> installment_amount = 33,333,333
    // Installment 1: 33,333,333
    // Installment 2: 33,333,333
    // Installment 3 (Last): 100,000,001 - 33,333,333 - 33,333,333 = 33,333,335
    let sched = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::CreateRepaymentSchedule {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            repayment_schedule: schedule_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::CreateRepaymentSchedule {
            total_repayable: 100_000_001,
            num_installments: 3,
            installment_interval_days: 30,
            late_penalty_bps: 1000, // 10%
            early_repayment_discount_bps: 500, // 5%
        }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[disburse, sched], Some(&borrower.pubkey()), &[&borrower], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 3. Make 1st repayment (Normal)
    let repay_ix = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::MakeRepayment {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            repayment_schedule: schedule_pda,
            vault: vault_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::MakeRepayment {
            installment_number: 0,
            amount: 33_333_333,
            is_early: false,
            is_late: false,
        }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[repay_ix], Some(&borrower.pubkey()), &[&borrower], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 4. Make 2nd repayment (Early with discount)
    // expected = 33,333,333 * (10000 - 500) / 10000 = 33,333,333 * 0.95 = 31,666,666.35 -> 31,666,666
    let repay_ix_early = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::MakeRepayment {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            repayment_schedule: schedule_pda,
            vault: vault_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::MakeRepayment {
            installment_number: 1,
            amount: 31_666_666,
            is_early: true,
            is_late: false,
        }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[repay_ix_early], Some(&borrower.pubkey()), &[&borrower], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 5. Make 3rd repayment (Late with penalty)
    // Remaining repayable = 100,000,001 - 33,333,333 - 31,666,666 = 35,000,002
    // expected = 35,000,002
    // penalty = 35,000,002 * 1000 / 10000 = 3,500,000.2 -> 3,500,000
    // total expected = 35,000,002 + 3,500,000 = 38,500,002
    let repay_ix_late = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::MakeRepayment {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            repayment_schedule: schedule_pda,
            vault: vault_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::MakeRepayment {
            installment_number: 2,
            amount: 38_500_002,
            is_early: false,
            is_late: true,
        }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[repay_ix_late], Some(&borrower.pubkey()), &[&borrower], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    let sched_account = context.banks_client.get_account(to_sdk_pubkey(schedule_pda)).await.unwrap().unwrap();
    let sched_data: RepaymentSchedule = RepaymentSchedule::try_deserialize(&mut &sched_account.data[..]).unwrap();
    assert_eq!(sched_data.status, 2); // Completed
}

#[tokio::test]
async fn test_default_flow() {
    let (mut context, borrower) = setup_test().await;
    let program_id = dblt_lending::id();
    let sdk_program_id = to_sdk_pubkey(program_id);

    airdrop(&mut context, &borrower.pubkey(), 5_000_000_000).await;

    // 1. Create & Fund
    let pool_keypair = Keypair::new();
    let (vault_pda, _) = Pubkey::find_program_address(&[b"vault", from_sdk_pubkey(pool_keypair.pubkey()).as_ref()], &program_id);
    let (schedule_pda, _) = Pubkey::find_program_address(&[b"schedule", from_sdk_pubkey(pool_keypair.pubkey()).as_ref()], &program_id);
    
    let (b_prof, _) = Pubkey::find_program_address(&[b"profile", from_sdk_pubkey(borrower.pubkey()).as_ref()], &program_id);
    let reg_b = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::RegisterUser {
            user: from_sdk_pubkey(borrower.pubkey()),
            user_profile: b_prof,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::RegisterBorrower { company_name: "B".to_string() }.data(),
    };
    let create = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::CreateLoanPool {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::CreateLoanPool {
            target_amount: 100_000_000,
            term_offer_id: Pubkey::new_unique(),
            years_data_hash: "".to_string(),
            years_covered: 1,
            currency: "SOL".to_string(),
            country: "UK".to_string(),
        }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[reg_b, create], Some(&borrower.pubkey()), &[&borrower, &pool_keypair], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 2. Fund
    let lender = Keypair::new();
    airdrop(&mut context, &lender.pubkey(), 1_000_000_000).await;
    let (l_prof, _) = Pubkey::find_program_address(&[b"profile", from_sdk_pubkey(lender.pubkey()).as_ref()], &program_id);
    let (pos, _) = Pubkey::find_program_address(&[b"position", from_sdk_pubkey(pool_keypair.pubkey()).as_ref(), from_sdk_pubkey(lender.pubkey()).as_ref()], &program_id);
    
    let reg_l = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::RegisterUser {
            user: from_sdk_pubkey(lender.pubkey()),
            user_profile: l_prof,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::RegisterLender { entity_name: "L".to_string() }.data(),
    };
    let fund = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::ContributeToPool {
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            lender: from_sdk_pubkey(lender.pubkey()),
            lender_profile: l_prof,
            position: pos,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::ContributeToPool { amount: 100_000_000 }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[reg_l, fund], Some(&lender.pubkey()), &[&lender], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 3. Disburse & Schedule
    let disburse = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::DisburseLoan {
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            borrower: from_sdk_pubkey(borrower.pubkey()),
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::DisburseLoan {}.data(),
    };
    let sched = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::CreateRepaymentSchedule {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            repayment_schedule: schedule_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::CreateRepaymentSchedule {
            total_repayable: 110_000_000,
            num_installments: 1,
            installment_interval_days: 1,
            late_penalty_bps: 0,
            early_repayment_discount_bps: 0,
        }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[disburse, sched], Some(&borrower.pubkey()), &[&borrower], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 4. Warp 32 Days
    let mut clock: SdkClock = context.banks_client.get_sysvar().await.unwrap();
    clock.unix_timestamp += 32 * 24 * 60 * 60;
    context.set_sysvar(&clock);
    context.warp_to_slot(200).unwrap();

    // 5. Trigger Default (Signer: Lender)
    let default_ix = Instruction {
        program_id: sdk_program_id,
        accounts: vec![
            SdkAccountMeta::new(lender.pubkey(), true), // authority
            SdkAccountMeta::new(to_sdk_pubkey(from_sdk_pubkey(pool_keypair.pubkey())), false), // pool (Not signer!)
            SdkAccountMeta::new(to_sdk_pubkey(schedule_pda), false), // schedule
            SdkAccountMeta::new_readonly(to_sdk_pubkey(pos), false), // remaining: position
        ],
        data: dblt_lending::instruction::MarkDefault {}.data(),
    };
    
    let tx = Transaction::new_signed_with_payer(&[default_ix], Some(&lender.pubkey()), &[&lender], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    let pool_account = context.banks_client.get_account(pool_keypair.pubkey()).await.unwrap().unwrap();
    let pool_data: LoanPool = LoanPool::try_deserialize(&mut &pool_account.data[..]).unwrap();
    assert_eq!(pool_data.status, PoolStatus::Defaulted as u8);
}

#[tokio::test]
async fn test_funded_clawback_protection() {
    let (mut context, borrower) = setup_test().await;
    let program_id = dblt_lending::id();
    let sdk_program_id = to_sdk_pubkey(program_id);

    airdrop(&mut context, &borrower.pubkey(), 2_000_000_000).await;

    // 1. Create Pool
    let pool_keypair = Keypair::new();
    let (vault_pda, _) = Pubkey::find_program_address(&[b"vault", from_sdk_pubkey(pool_keypair.pubkey()).as_ref()], &program_id);
    let create = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::CreateLoanPool {
            borrower: from_sdk_pubkey(borrower.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::CreateLoanPool {
            target_amount: 100_000_000,
            term_offer_id: Pubkey::new_unique(),
            years_data_hash: "".to_string(),
            years_covered: 1,
            currency: "SOL".to_string(),
            country: "UK".to_string(),
        }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[create], Some(&borrower.pubkey()), &[&borrower, &pool_keypair], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // 2. Fully Fund
    let lender = Keypair::new();
    airdrop(&mut context, &lender.pubkey(), 1_000_000_000).await;
    let (l_prof, _) = Pubkey::find_program_address(&[b"profile", from_sdk_pubkey(lender.pubkey()).as_ref()], &program_id);
    let (pos, _) = Pubkey::find_program_address(&[b"position", from_sdk_pubkey(pool_keypair.pubkey()).as_ref(), from_sdk_pubkey(lender.pubkey()).as_ref()], &program_id);
    
    let reg_l = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::RegisterUser {
            user: from_sdk_pubkey(lender.pubkey()),
            user_profile: l_prof,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::RegisterLender { entity_name: "L".to_string() }.data(),
    };
    let fund = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::ContributeToPool {
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            lender: from_sdk_pubkey(lender.pubkey()),
            lender_profile: l_prof,
            position: pos,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::ContributeToPool { amount: 100_000_000 }.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[reg_l, fund], Some(&lender.pubkey()), &[&lender], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // Status is now Funded
    let pool_account = context.banks_client.get_account(pool_keypair.pubkey()).await.unwrap().unwrap();
    let pool_data: LoanPool = LoanPool::try_deserialize(&mut &pool_account.data[..]).unwrap();
    assert_eq!(pool_data.status, PoolStatus::Funded as u8);

    // 3. Warp 8 days - Borrower refuses to disburse
    let mut clock: SdkClock = context.banks_client.get_sysvar().await.unwrap();
    clock.unix_timestamp += 8 * 24 * 60 * 60;
    context.set_sysvar(&clock);
    context.warp_to_slot(300).unwrap();

    // 4. Lender should be able to clawback even though status is "Funded"
    let withdraw_ix = Instruction {
        program_id: sdk_program_id,
        accounts: anchor_lang::ToAccountMetas::to_account_metas(&dblt_lending::accounts::WithdrawFunds {
            lender: from_sdk_pubkey(lender.pubkey()),
            pool: from_sdk_pubkey(pool_keypair.pubkey()),
            vault: vault_pda,
            position: pos,
            system_program: sys_prog(),
        }, None).into_iter().map(to_sdk_account_meta).collect(),
        data: dblt_lending::instruction::WithdrawFunds {}.data(),
    };
    let tx = Transaction::new_signed_with_payer(&[withdraw_ix], Some(&lender.pubkey()), &[&lender], context.last_blockhash);
    context.banks_client.process_transaction(tx).await.unwrap();

    // Success! Principal returned.
    let balance = context.banks_client.get_balance(lender.pubkey()).await.unwrap();
    assert!(balance > 900_000_000); 
}
