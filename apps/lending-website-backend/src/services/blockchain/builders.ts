import * as anchor from "@anchor-lang/core";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import type { BlockchainContext } from "./context.js";
import { deriveVaultPDA, derivePositionPDA, deriveProfilePDA, deriveSchedulePDA } from "./pdas.js";

/**
 * Serializes a transaction to a Base64 string for transmission to the frontend.
 * partialSigners are backend-controlled keypairs that must sign before the user does
 * (e.g. newly-created PDA accounts that the program requires as signers).
 */
async function serializeTx(
  ctx: BlockchainContext,
  tx: anchor.web3.Transaction,
  feePayer: PublicKey,
  partialSigners: anchor.web3.Keypair[] = [],
): Promise<string> {
  console.debug(`[Builders] Serializing transaction for fee payer: ${feePayer.toBase58()}`);
  try {
    let blockhash: string;
    if (ctx.connection) {
      const result = await ctx.connection.getLatestBlockhash('confirmed');
      blockhash = result.blockhash;
    } else {
      blockhash = '11111111111111111111111111111111';
    }

    tx.recentBlockhash = blockhash;
    tx.feePayer = feePayer;

    // Blockhash and feePayer must be set before partial signing.
    if (partialSigners.length > 0) {
      tx.partialSign(...partialSigners);
    }

    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    return btoa(String.fromCharCode(...new Uint8Array(serialized)));
  } catch (error) {
    console.error(`[Builders] Failed to serialize transaction: ${error instanceof Error ? error.message : String(error)}`);
    throw new Error(`Failed to serialize transaction for ${feePayer.toBase58()}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function buildCreateLoanPoolTx(
  ctx: BlockchainContext,
  borrower: PublicKey,
  targetAmount: BN,
  termOfferId: PublicKey,
  yearsDataHash: string,
  yearsCovered: number,
  currency: string,
  country: string,
): Promise<{ transaction: string; poolAddress: string }> {
  console.info(`[Builders] Building CreateLoanPool transaction for borrower: ${borrower.toBase58()}`);
  try {
    const poolKeypair = anchor.web3.Keypair.generate();
    const [vault] = await deriveVaultPDA(poolKeypair.publicKey, ctx);

    // Note: .signers() is a no-op with .transaction() — it only works with .rpc().
    // We partial-sign with poolKeypair explicitly in serializeTx instead.
    const tx = await ctx.program.methods
      .createLoanPool(
        targetAmount,
        termOfferId,
        yearsDataHash,
        yearsCovered,
        currency,
        country,
      )
      .accounts({
        borrower,
        pool: poolKeypair.publicKey,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    const transaction = await serializeTx(ctx, tx, borrower, [poolKeypair]);
    return { transaction, poolAddress: poolKeypair.publicKey.toBase58() };
  } catch (error) {
    throw new Error(`RPC Failure in buildCreateLoanPoolTx: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function buildContributeToPoolTx(
  ctx: BlockchainContext,
  pool: PublicKey,
  lender: PublicKey,
  amount: BN,
): Promise<string> {
  console.info(`[Builders] Building ContributeToPool transaction for pool: ${pool.toBase58()}, lender: ${lender.toBase58()}`);
  try {
    const [vault] = await deriveVaultPDA(pool, ctx);
    const [position] = await derivePositionPDA(pool, lender, ctx);

    const tx = await ctx.program.methods
      .contributeToPool(amount)
      .accounts({
        pool,
        vault,
        lender,
        position,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return serializeTx(ctx, tx, lender);
  } catch (error) {
    throw new Error(`RPC Failure in buildContributeToPoolTx: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function buildDisburseLoanTx(
  ctx: BlockchainContext,
  pool: PublicKey,
  borrower: PublicKey,
): Promise<string> {
  console.info(`[Builders] Building DisburseLoan transaction for pool: ${pool.toBase58()}`);
  try {
    const [vault] = await deriveVaultPDA(pool, ctx);

    const tx = await ctx.program.methods
      .disburseLoan()
      .accounts({
        pool,
        vault,
        borrower,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return serializeTx(ctx, tx, borrower);
  } catch (error) {
    throw new Error(`RPC Failure in buildDisburseLoanTx: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function buildRepaymentTx(
  ctx: BlockchainContext,
  pool: PublicKey,
  borrower: PublicKey,
  installmentNumber: number,
  amount: BN,
  isEarly: boolean,
  isLate: boolean,
): Promise<string> {
  console.info(`[Builders] Building Repayment transaction for pool: ${pool.toBase58()}, installment: ${installmentNumber}`);
  try {
    const [repaymentSchedule] = await deriveSchedulePDA(pool, ctx);
    const [vault] = await deriveVaultPDA(pool, ctx);

    const tx = await ctx.program.methods
      .makeRepayment(installmentNumber, amount, isEarly, isLate)
      .accounts({
        borrower,
        pool,
        repaymentSchedule,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    return serializeTx(ctx, tx, borrower);
  } catch (error) {
    throw new Error(`RPC Failure in buildRepaymentTx: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function buildCancelLoanTx(
  ctx: BlockchainContext,
  pool: PublicKey,
  borrower: PublicKey,
): Promise<string> {
  console.info(`[Builders] Building CancelLoan transaction for pool: ${pool.toBase58()}`);
  try {
    const tx = await ctx.program.methods
      .cancelLoan()
      .accounts({
        pool,
        borrower,
      })
      .transaction();

    return serializeTx(ctx, tx, borrower);
  } catch (error) {
    throw new Error(`RPC Failure in buildCancelLoanTx: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function buildTriggerDefaultTx(
  ctx: BlockchainContext,
  pool: PublicKey,
  authority: PublicKey,
  lenderPosition: PublicKey | null,
): Promise<string> {
  console.info(`[Builders] Building TriggerDefault transaction for pool: ${pool.toBase58()}`);
  try {
    const [repaymentSchedule] = await deriveSchedulePDA(pool, ctx);
    
    const builder = ctx.program.methods
      .markDefault()
      .accounts({
        authority,
        pool,
        repaymentSchedule,
      });

    if (lenderPosition) {
      builder.remainingAccounts([{
        pubkey: lenderPosition,
        isWritable: false,
        isSigner: false,
      }]);
    }

    const tx = await builder.transaction();
    return serializeTx(ctx, tx, authority);
  } catch (error) {
    throw new Error(`RPC Failure in buildTriggerDefaultTx: ${error instanceof Error ? error.message : String(error)}`);
  }
}
