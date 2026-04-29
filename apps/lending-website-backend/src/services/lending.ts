import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { BorshCoder } from '@anchor-lang/core';
import { 
  getBlockchainContext, 
  buildCreateLoanPoolTx, 
  buildContributeToPoolTx,
  buildDisburseLoanTx,
  buildRepaymentTx,
} from "./blockchain/index.js";
import type { AppConfig } from "../config.js";
import { loanListings, loanContributions } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { getDbltLendingIdl } from '@openvouch/idl';

const idl = getDbltLendingIdl();
const coder = new BorshCoder(idl as any);

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
  const amountLamports = new BN(amount * 1e9);

  const txBase64 = await buildCreateLoanPoolTx(
    ctx,
    borrowerPubkey,
    amountLamports,
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
  amount: number,
) {
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const lenderPubkey = new PublicKey(lender);
  const poolPubkey = new PublicKey(poolAddress);
  
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
            const onChainAmount = (decoded.data as any).amount.toNumber() / 1e9;
            if (Math.abs(onChainAmount - amount) > 0.0001) {
                console.warn(`[LendingService] Amount mismatch: on-chain ${onChainAmount}, reported ${amount}`);
                amount = onChainAmount;
            }
        }
    }
  }

  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, loanId));
  if (!loan) throw new Error("Loan not found");

  const newRaisedAmount = loan.raisedAmount + amount;

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
      amount,
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
  amount: number,
) {
  const ctx = getBlockchainContext(config.blockchain.rpcUrl, config.programs.dbltLending);
  const borrowerPubkey = new PublicKey(borrower);
  const poolPubkey = new PublicKey(poolAddress);
  
  const amountLamports = new BN(amount * 1e9);

  const txBase64 = await buildRepaymentTx(
    ctx,
    poolPubkey,
    borrowerPubkey,
    installmentNumber,
    amountLamports,
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
  amount: number,
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
            const onChainAmount = (decoded.data as any).amount.toNumber() / 1e9;
            if (Math.abs(onChainAmount - amount) > 0.0001) {
                console.warn(`[LendingService] Amount mismatch: on-chain ${onChainAmount}, reported ${amount}`);
                amount = onChainAmount;
            }
        }
    }
  }

  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, loanId));
  if (!loan) throw new Error("Loan not found");

  const newRepaidAmount = loan.repaid + amount;
  const newStatus = newRepaidAmount >= loan.amount ? 'repaid' : 'active';

  await db.update(loanListings)
    .set({ 
      repaid: newRepaidAmount,
      status: newStatus,
      updatedAt: new Date()
    })
    .where(eq(loanListings.id, loanId));

  return { success: true };
}
