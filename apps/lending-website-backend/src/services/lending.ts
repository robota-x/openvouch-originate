import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { 
  getBlockchainContext, 
  buildCreateLoanPoolTx, 
  buildContributeToPoolTx,
  deriveVaultPDA,
} from "./blockchain/index.js";
import type { AppConfig } from "../config.js";
import { loanListings } from "../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * Initiates a loan creation by building the Solana transaction.
 */
export async function initiateLoanCreation(
  config: AppConfig,
  borrower: string,
  amount: number,
  currency: string,
  duration: number,
) {
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const borrowerPubkey = new PublicKey(borrower);
  
  // termOfferId is required by the contract - using a default for now
  const termOfferId = PublicKey.default; 

  // Convert SOL to lamports
  const amountLamports = new BN(amount * 1e9);

  const txBase64 = await buildCreateLoanPoolTx(
    ctx,
    borrowerPubkey,
    amountLamports,
    termOfferId,
    "", // yearsDataHash
    0,  // yearsCovered
    currency,
    "UK",
  );

  return {
    transaction: txBase64,
  };
}

/**
 * Verifies that a transaction signature corresponds to a valid loan operation on-chain.
 */
export async function verifyAndFinalizeLoan(
  config: AppConfig,
  signature: string,
) {
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  // 1. Wait for confirmation
  const result = await connection.confirmTransaction(signature, "confirmed");
  if (result.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
  }

  // 2. Fetch transaction details
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    throw new Error("Transaction not found after confirmation");
  }

  // 3. Verify it's interacting with our program
  const programId = new PublicKey(config.programs.dbltLending);
  const isOurProgram = tx.transaction.message.staticAccountKeys.some(k => k.equals(programId));
  
  if (!isOurProgram) {
    throw new Error("Transaction does not involve the lending program");
  }

  return { 
    success: true,
    slot: tx.slot,
    timestamp: tx.blockTime
  };
}

/**
 * Initiates a contribution to a loan pool.
 */
export async function initiateLoanContribution(
  config: AppConfig,
  lender: string,
  poolAddress: string,
  amount: number,
) {
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const lenderPubkey = new PublicKey(lender);
  const poolPubkey = new PublicKey(poolAddress);
  
  // Convert SOL to lamports
  const amountLamports = new BN(amount * 1e9);

  const txBase64 = await buildContributeToPoolTx(
    ctx,
    poolPubkey,
    lenderPubkey,
    amountLamports,
  );

  return {
    transaction: txBase64,
  };
}

/**
 * Verifies a contribution transaction and updates the D1 database.
 */
export async function verifyAndFinalizeContribution(
  config: AppConfig,
  signature: string,
  loanId: string,
  amount: number,
  db: any,
) {
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  // 1. Wait for confirmation
  const result = await connection.confirmTransaction(signature, "confirmed");
  if (result.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
  }

  // 2. Update D1
  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, loanId));
  if (!loan) throw new Error("Loan not found");

  const newRaisedAmount = loan.raisedAmount + amount;
  const newStatus = newRaisedAmount >= loan.amount ? 'active' : 'open';

  await db.update(loanListings)
    .set({ 
      raisedAmount: newRaisedAmount,
      status: newStatus,
      updatedAt: new Date()
    })
    .where(eq(loanListings.id, loanId));

  return { success: true };
}
