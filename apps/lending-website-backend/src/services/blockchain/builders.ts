import * as anchor from "@anchor-lang/core";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import type { BlockchainContext } from "./context.js";
import { deriveVaultPDA, derivePositionPDA, deriveProfilePDA, deriveSchedulePDA } from "./pdas.js";

/**
 * Serializes a transaction to a Base64 string for transmission to the frontend.
 */
function serializeTx(tx: anchor.web3.Transaction): string {
  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });
  return btoa(String.fromCharCode(...new Uint8Array(serialized)));
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
): Promise<string> {
  const poolKeypair = anchor.web3.Keypair.generate();
  const [vault] = await deriveVaultPDA(poolKeypair.publicKey, ctx);

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
    .signers([poolKeypair])
    .transaction();

  return serializeTx(tx);
}

export async function buildContributeToPoolTx(
  ctx: BlockchainContext,
  pool: PublicKey,
  lender: PublicKey,
  amount: BN,
): Promise<string> {
  const [vault] = await deriveVaultPDA(pool, ctx);
  const [position] = await derivePositionPDA(pool, lender, ctx);
  const [lenderProfile] = await deriveProfilePDA(lender, ctx);

  const tx = await ctx.program.methods
    .contributeToPool(amount)
    .accounts({
      pool,
      vault,
      lender,
      lenderProfile,
      position,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return serializeTx(tx);
}

export async function buildDisburseLoanTx(
  ctx: BlockchainContext,
  pool: PublicKey,
  borrower: PublicKey,
): Promise<string> {
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

  return serializeTx(tx);
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

  return serializeTx(tx);
}

export async function buildCancelLoanTx(
  ctx: BlockchainContext,
  pool: PublicKey,
  borrower: PublicKey,
): Promise<string> {
  const tx = await ctx.program.methods
    .cancelLoan()
    .accounts({
      pool,
      borrower,
    })
    .transaction();

  return serializeTx(tx);
}

export async function buildTriggerDefaultTx(
  ctx: BlockchainContext,
  pool: PublicKey,
  authority: PublicKey,
  lenderPosition: PublicKey | null,
): Promise<string> {
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
  return serializeTx(tx);
}
