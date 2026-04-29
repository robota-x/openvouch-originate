import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import type { BlockchainContext } from "./context.js";
import { deriveVaultPDA, derivePositionPDA, deriveProfilePDA } from "./pdas.js";

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
    })
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
  const [borrowerProfile] = await deriveProfilePDA(borrower, ctx);

  const tx = await ctx.program.methods
    .disburseLoan()
    .accounts({
      pool,
      vault,
      borrower,
      borrowerProfile,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  return serializeTx(tx);
}
