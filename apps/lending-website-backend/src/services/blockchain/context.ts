import * as anchor from "@coral-xyz/anchor";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getDbltLendingIdl } from "@openvouch/idl";

export interface BlockchainContext {
  connection: Connection;
  program: anchor.Program;
}

/**
 * Initializes and returns the blockchain context (connection and program).
 * Uses a dummy wallet to satisfy the Anchor provider requirement for backend building.
 */
export function getBlockchainContext(rpcUrl: string, programId?: string): BlockchainContext {
  const connection = new Connection(rpcUrl, "confirmed");
  const idl = getDbltLendingIdl();

  const dummyKeypair = anchor.web3.Keypair.generate();
  const dummyWallet: anchor.Wallet & { payer: anchor.web3.Keypair } = {
    publicKey: dummyKeypair.publicKey,
    payer: dummyKeypair,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => tx,
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => txs,
  };

  const provider = new anchor.AnchorProvider(connection, dummyWallet, {
    commitment: "confirmed",
  });

  const program = new anchor.Program(idl as anchor.Idl, provider);
  
  // If a custom program ID is provided (e.g. from config), override the IDL's default
  if (programId) {
    // Note: In newer Anchor versions, we might need to be careful with how we override this
    // but for builder purposes, setting the programId on the instance is usually sufficient.
    (program as any)._programId = new anchor.web3.PublicKey(programId);
  }

  return { connection, program };
}
