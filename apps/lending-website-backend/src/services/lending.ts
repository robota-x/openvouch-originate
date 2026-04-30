import { PublicKey, type Connection } from "@solana/web3.js";
import BN from "bn.js";
import { BorshCoder } from '@anchor-lang/core';
import { 
  getBlockchainContext, 
  buildCreateLoanPoolTx, 
  buildContributeToPoolTx,
  buildDisburseLoanTx,
  buildRepaymentTx,
  buildCancelLoanTx,
  buildTriggerDefaultTx,
} from "./blockchain/index.js";
import type { AppConfig } from "../config.js";
import { loanListings, loanContributions } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { getDbltLendingIdl } from '@openvouch/idl';
import { derivePositionPDA } from "./blockchain/pdas.js";

const idl = getDbltLendingIdl();
const coder = new BorshCoder(idl as any);

// Uses getSignatureStatuses (plain HTTP) instead of confirmTransaction (WebSocket)
// because Cloudflare Workers don't support outgoing WebSocket connections reliably.
// The transaction is already confirmed by the frontend before finalize is called.
async function assertTxSucceeded(connection: Connection, signature: string): Promise<void> {
  const { value: [status] } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
  if (!status) throw new Error(`Transaction ${signature} not found on-chain`);
  if (status.err) throw new Error(`Transaction ${signature} failed on-chain: ${JSON.stringify(status.err)}`);
}

/**
 * Initiates a loan cancellation.
 */
export async function initiateLoanCancellation(
  config: AppConfig,
  borrower: string,
  poolAddress: string,
) {
  console.info(`[LendingService] Initiating loan cancellation for borrower: ${borrower}, pool: ${poolAddress}`);
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const borrowerPubkey = new PublicKey(borrower);
  const poolPubkey = new PublicKey(poolAddress);

  const txBase64 = await buildCancelLoanTx(ctx, poolPubkey, borrowerPubkey);

  return { transaction: txBase64 };
}

/**
 * Finalizes loan cancellation in D1.
 */
export async function finalizeLoanCancellation(
  config: AppConfig,
  signature: string,
  loanId: string,
  db: any,
) {
  console.info(`[LendingService] Finalizing loan cancellation for loanId: ${loanId}, signature: ${signature}`);
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  await assertTxSucceeded(connection, signature);
  console.debug(`[LendingService] Transaction confirmed for cancellation: ${signature}`);

  await db.update(loanListings)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(loanListings.id, loanId));
  
  console.info(`[LendingService] Loan ${loanId} marked as cancelled in DB`);

  return { success: true };
}

/**
 * Initiates triggering default.
 */
export async function initiateTriggerDefault(
  config: AppConfig,
  authority: string,
  poolAddress: string,
) {
  console.info(`[LendingService] Initiating trigger default for pool: ${poolAddress}, authority: ${authority}`);
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const authorityPubkey = new PublicKey(authority);
  const poolPubkey = new PublicKey(poolAddress);

  // Derive potential lender position to pass as remaining account
  const [lenderPosition] = await derivePositionPDA(poolPubkey, authorityPubkey, ctx);
  
  // Check if position exists (optional but helps the builder)
  const posInfo = await ctx.connection.getAccountInfo(lenderPosition);

  const txBase64 = await buildTriggerDefaultTx(
    ctx, 
    poolPubkey, 
    authorityPubkey, 
    posInfo ? lenderPosition : null
  );

  return { transaction: txBase64 };
}

/**
 * Finalizes default in D1.
 */
export async function finalizeTriggerDefault(
  config: AppConfig,
  signature: string,
  loanId: string,
  db: any,
) {
  console.info(`[LendingService] Finalizing trigger default for loanId: ${loanId}, signature: ${signature}`);
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  await assertTxSucceeded(connection, signature);
  console.debug(`[LendingService] Transaction confirmed for default: ${signature}`);

  await db.update(loanListings)
    .set({ status: 'defaulted', updatedAt: new Date() })
    .where(eq(loanListings.id, loanId));
  
  console.info(`[LendingService] Loan ${loanId} marked as defaulted in DB`);

  return { success: true };
}

/**
 * Initiates a loan creation by building the Solana transaction.
 */
export async function initiateLoanCreation(
  config: AppConfig,
  borrower: string,
  amountLamports: bigint,
  currency: string,
  duration: number,
) {
  console.info(`[LendingService] Initiating loan creation for borrower: ${borrower}, amount: ${amountLamports}`);
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const borrowerPubkey = new PublicKey(borrower);
  
  // termOfferId is required by the contract - using a default for now
  const termOfferId = PublicKey.default; 
  const amountBN = new BN(amountLamports.toString());

  const { transaction, poolAddress } = await buildCreateLoanPoolTx(
    ctx,
    borrowerPubkey,
    amountBN,
    termOfferId,
    "",
    0,
    currency,
    "UK",
  );

  return { transaction, poolAddress };
}

/**
 * Verifies that a transaction signature corresponds to a valid loan operation on-chain.
 */
export async function verifyAndFinalizeLoan(
  config: AppConfig,
  signature: string,
) {
  console.info(`[LendingService] Verifying and finalizing loan for signature: ${signature}`);
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  await assertTxSucceeded(connection, signature);

  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    throw new Error(`Transaction ${signature} not found after successful confirmation`);
  }

  const programId = new PublicKey(config.programs.dbltLending);
  const isOurProgram = tx.transaction.message.staticAccountKeys.some(k => k.equals(programId));
  
  if (!isOurProgram) {
    throw new Error(`Transaction ${signature} does not involve the lending program ${config.programs.dbltLending}`);
  }

  // Extract the pool public key from the transaction instructions if needed
  // For now we trust the signature provided by the frontend

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
  amountLamports: bigint,
) {
  console.info(`[LendingService] Initiating loan contribution from lender: ${lender}, pool: ${poolAddress}, amount: ${amountLamports}`);
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const lenderPubkey = new PublicKey(lender);
  const poolPubkey = new PublicKey(poolAddress);
  
  const amountBN = new BN(amountLamports.toString());

  const txBase64 = await buildContributeToPoolTx(
    ctx,
    poolPubkey,
    lenderPubkey,
    amountBN,
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
  amountLamports: bigint,
  lender: string,
  db: any,
) {
  console.info(`[LendingService] Verifying contribution for loanId: ${loanId}, lender: ${lender}, signature: ${signature}`);
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  await assertTxSucceeded(connection, signature);

  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (tx) {
    const programId = config.programs.dbltLending;
    const instruction = tx.transaction.message.compiledInstructions.find(ix => 
        tx.transaction.message.staticAccountKeys[ix.programIdIndex].toBase58() === programId
    );

    if (instruction) {
        const decoded = coder.instruction.decode(Buffer.from(instruction.data), 'base58');
        if (decoded && decoded.name === 'contributeToPool') {
            const onChainAmountLamports = BigInt((decoded.data as any).amount.toString());
            if (onChainAmountLamports !== amountLamports) {
                console.warn(`[LendingService] Amount mismatch for loan ${loanId}: on-chain ${onChainAmountLamports}, reported ${amountLamports}`);
                amountLamports = onChainAmountLamports;
            }
        }
    }
  } else {
    console.warn(`[LendingService] Could not fetch transaction details for ${signature} to verify contribution amount`);
  }

  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, loanId));
  if (!loan) throw new Error(`Loan ${loanId} not found in database during contribution finalization`);

  const newRaisedAmount = BigInt(loan.raisedAmount) + amountLamports;

  // Update raised amount
  await db.update(loanListings)
    .set({
      raisedAmount: newRaisedAmount,
      updatedAt: new Date()
    })
    .where(eq(loanListings.id, loanId));

  // Insert contribution record
  await db.insert(loanContributions).values({
    id: crypto.randomUUID(),
    loanId,
    lender,
    amount: amountLamports,
    onChainRef: signature,
    createdAt: new Date(),
  });

  console.info(`[LendingService] Contribution of ${amountLamports} recorded for loan ${loanId}`);

  return { success: true };
}

/**
 * Initiates a loan disbursement.
 */
export async function initiateLoanDisbursement(
  config: AppConfig,
  borrower: string,
  poolAddress: string,
) {
  console.info(`[LendingService] Initiating loan disbursement for borrower: ${borrower}, pool: ${poolAddress}`);
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const borrowerPubkey = new PublicKey(borrower);
  const poolPubkey = new PublicKey(poolAddress);

  const txBase64 = await buildDisburseLoanTx(
    ctx,
    poolPubkey,
    borrowerPubkey,
  );

  return {
    transaction: txBase64,
  };
}

/**
 * Verifies a disbursement transaction and updates the D1 database.
 */
export async function verifyAndFinalizeDisbursement(
  config: AppConfig,
  signature: string,
  loanId: string,
  db: any,
) {
  console.info(`[LendingService] Verifying disbursement for loanId: ${loanId}, signature: ${signature}`);
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  await assertTxSucceeded(connection, signature);

  await db.update(loanListings)
    .set({ 
      status: 'active',
      updatedAt: new Date()
    })
    .where(eq(loanListings.id, loanId));

  console.info(`[LendingService] Loan ${loanId} marked as active (disbursed)`);

  return { success: true };
}

/**
 * Initiates a loan repayment.
 */
export async function initiateLoanRepayment(
  config: AppConfig,
  borrower: string,
  poolAddress: string,
  installmentNumber: number,
  amountLamports: bigint,
) {
  console.info(`[LendingService] Initiating loan repayment for borrower: ${borrower}, pool: ${poolAddress}, installment: ${installmentNumber}`);
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const borrowerPubkey = new PublicKey(borrower);
  const poolPubkey = new PublicKey(poolAddress);
  
  const amountBN = new BN(amountLamports.toString());

  const txBase64 = await buildRepaymentTx(
    ctx,
    poolPubkey,
    borrowerPubkey,
    installmentNumber,
    amountBN,
    false, // isEarly
    false, // isLate
  );

  return {
    transaction: txBase64,
  };
}

/**
 * Verifies a repayment transaction and updates the D1 database.
 */
export async function verifyAndFinalizeRepayment(
  config: AppConfig,
  signature: string,
  loanId: string,
  amountLamports: bigint,
  db: any,
) {
  console.info(`[LendingService] Verifying repayment for loanId: ${loanId}, signature: ${signature}, reported amount: ${amountLamports}`);
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  await assertTxSucceeded(connection, signature);

  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (tx) {
    const programId = config.programs.dbltLending;
    const instruction = tx.transaction.message.compiledInstructions.find(ix =>
        tx.transaction.message.staticAccountKeys[ix.programIdIndex].toBase58() === programId
    );

    if (instruction) {
        const decoded = coder.instruction.decode(Buffer.from(instruction.data), 'base58');
        if (decoded && decoded.name === 'makeRepayment') {
            const onChainAmountLamports = BigInt((decoded.data as any).amount.toString());
            if (onChainAmountLamports !== amountLamports) {
                console.warn(`[LendingService] Amount mismatch for repayment of loan ${loanId}: on-chain ${onChainAmountLamports}, reported ${amountLamports}`);
                amountLamports = onChainAmountLamports;
            }
        }
    }
  } else {
    console.warn(`[LendingService] Could not fetch transaction details for ${signature} to verify repayment amount`);
  }

  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, loanId));
  if (!loan) throw new Error(`Loan ${loanId} not found in database during repayment finalization`);

  const newRepaidAmount = BigInt(loan.repaid) + amountLamports;
  const newStatus = newRepaidAmount >= BigInt(loan.amount) ? 'repaid' : 'active';

  await db.update(loanListings)
    .set({ 
      repaid: newRepaidAmount,
      status: newStatus,
      updatedAt: new Date()
    })
    .where(eq(loanListings.id, loanId));

  console.info(`[LendingService] Repayment of ${amountLamports} recorded for loan ${loanId}. New status: ${newStatus}`);

  return { success: true };
}
