import { PublicKey } from "@solana/web3.js";
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

/**
 * Initiates a loan cancellation.
 */
export async function initiateLoanCancellation(
  config: AppConfig,
  borrower: string,
  poolAddress: string,
) {
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
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  await connection.confirmTransaction(signature, "confirmed");

  await db.update(loanListings)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(loanListings.id, loanId));

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
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  await connection.confirmTransaction(signature, "confirmed");

  await db.update(loanListings)
    .set({ status: 'defaulted', updatedAt: new Date() })
    .where(eq(loanListings.id, loanId));

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
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const borrowerPubkey = new PublicKey(borrower);
  
  // termOfferId is required by the contract - using a default for now
  const termOfferId = PublicKey.default; 
  const amountBN = new BN(amountLamports.toString());

  const txBase64 = await buildCreateLoanPoolTx(
    ctx,
    borrowerPubkey,
    amountBN,
    termOfferId,
    "", 
    0,  
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
  
  const result = await connection.confirmTransaction(signature, "confirmed");
  if (result.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
  }

  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) {
    throw new Error("Transaction not found after confirmation");
  }

  const programId = new PublicKey(config.programs.dbltLending);
  const isOurProgram = tx.transaction.message.staticAccountKeys.some(k => k.equals(programId));
  
  if (!isOurProgram) {
    throw new Error("Transaction does not involve the lending program");
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
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  const result = await connection.confirmTransaction(signature, "confirmed");
  if (result.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
  }

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
                console.warn(`[LendingService] Amount mismatch: on-chain ${onChainAmountLamports}, reported ${amountLamports}`);
                amountLamports = onChainAmountLamports;
            }
        }
    }
  }

  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, loanId));
  if (!loan) throw new Error("Loan not found");

  const newRaisedAmount = BigInt(loan.raisedAmount) + amountLamports;

  await db.transaction(async (tx: any) => {
    await tx.update(loanListings)
      .set({ 
        raisedAmount: newRaisedAmount,
        updatedAt: new Date()
      })
      .where(eq(loanListings.id, loanId));

    await tx.insert(loanContributions).values({
      id: crypto.randomUUID(),
      loanId,
      lender,
      amount: amountLamports,
      onChainRef: signature,
      createdAt: new Date(),
    });
  });

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
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  const result = await connection.confirmTransaction(signature, "confirmed");
  if (result.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
  }

  await db.update(loanListings)
    .set({ 
      status: 'active',
      updatedAt: new Date()
    })
    .where(eq(loanListings.id, loanId));

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
  const { connection } = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  
  const result = await connection.confirmTransaction(signature, "confirmed");
  if (result.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
  }

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
                console.warn(`[LendingService] Amount mismatch: on-chain ${onChainAmountLamports}, reported ${amountLamports}`);
                amountLamports = onChainAmountLamports;
            }
        }
    }
  }

  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, loanId));
  if (!loan) throw new Error("Loan not found");

  const newRepaidAmount = BigInt(loan.repaid) + amountLamports;
  const newStatus = newRepaidAmount >= BigInt(loan.amount) ? 'repaid' : 'active';

  await db.update(loanListings)
    .set({ 
      repaid: newRepaidAmount,
      status: newStatus,
      updatedAt: new Date()
    })
    .where(eq(loanListings.id, loanId));

  return { success: true };
}
