import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load the IDL
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const idlPath = path.join(__dirname, "../idl/dblt_lending.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

const PROGRAM_ID = "6fXix7yZxeoqyL3wNtAHpPZ8dXAXQe3DXbVPeqcH1Gny";

export class BlockchainService {
  private connection: Connection;
  private program: anchor.Program;
  private providerWallet: anchor.Wallet;

  constructor(rpcUrl: string, providerWallet: anchor.Wallet) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.providerWallet = providerWallet;
    this.program = new anchor.Program(
      idl as anchor.Idl,
      PROGRAM_ID,
      providerWallet,
    );
  }

  // ==================== PDA DERIVATION HELPERS ====================

  async deriveProfilePDA(userAddress: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("profile"), userAddress.toBuffer()],
      this.program.programId,
    );
  }

  async deriveVaultPDA(poolAddress: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("vault"), poolAddress.toBuffer()],
      this.program.programId,
    );
  }

  async derivePositionPDA(
    poolAddress: PublicKey,
    lenderAddress: PublicKey,
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from("position"),
        poolAddress.toBuffer(),
        lenderAddress.toBuffer(),
      ],
      this.program.programId,
    );
  }

  async deriveSchedulePDA(
    poolAddress: PublicKey,
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("schedule"), poolAddress.toBuffer()],
      this.program.programId,
    );
  }

  // ==================== LOAN POOL OPERATIONS ====================

  /**
   * Create a new loan pool on-chain
   * Note: This is a placeholder - you need to implement the actual instruction call
   * based on your contract's create_loan_pool signature
   */
  async createLoanPool(
    borrower: PublicKey,
    targetAmount: BN,
    termOfferId: PublicKey,
    yearsDataHash: string,
    yearsCovered: number,
    currency: string,
    country: string,
  ): Promise<string> {
    try {
      const tx = await this.program.methods
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
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error creating loan pool:", error);
      throw error;
    }
  }

  /**
   * Lender contributes to a pool
   */
  async contributeToPool(
    poolAddress: PublicKey,
    lender: PublicKey,
    amount: BN,
    lenderTokenAccount: PublicKey,
    vaultTokenAccount: PublicKey,
  ): Promise<string> {
    try {
      const [vaultPDA] = await this.deriveVaultPDA(poolAddress);
      const [positionPDA] = await this.derivePositionPDA(poolAddress, lender);
      const [lenderProfilePDA] = await this.deriveProfilePDA(lender);

      const tx = await this.program.methods
        .contributeToPool(amount)
        .accounts({
          pool: poolAddress,
          vault: vaultPDA,
          lender,
          lenderProfile: lenderProfilePDA,
          lenderTokenAccount,
          vaultTokenAccount,
          position: positionPDA,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error contributing to pool:", error);
      throw error;
    }
  }

  /**
   * Disburse loan to borrower (after pool is funded)
   */
  async disburseLoan(
    poolAddress: PublicKey,
    borrower: PublicKey,
    borrowerTokenAccount: PublicKey,
    vaultTokenAccount: PublicKey,
  ): Promise<string> {
    try {
      const [vaultPDA] = await this.deriveVaultPDA(poolAddress);
      const [borrowerProfilePDA] = await this.deriveProfilePDA(borrower);

      const tx = await this.program.methods
        .disburseLoan()
        .accounts({
          pool: poolAddress,
          vault: vaultPDA,
          borrower,
          borrowerProfile: borrowerProfilePDA,
          borrowerTokenAccount,
          vaultTokenAccount,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error disburse loan:", error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get or create a token account for a given mint
   */
  async getOrCreateTokenAccount(
    owner: PublicKey,
    mint: PublicKey,
  ): Promise<PublicKey> {
    // This is a simplified version - you'll need to implement the full logic
    // to check if the account exists and create it if not
    const [associatedTokenAddress] = await anchor.utils.token.associatedAddress(
      {
        mint,
        owner,
      },
    );

    // Check if account exists
    const accountInfo = await this.connection.getAccountInfo(
      associatedTokenAddress,
    );
    if (!accountInfo) {
      // Account doesn't exist - you'll need to create it via transaction
      // This is a placeholder - implement proper creation logic
      console.warn(
        `Token account ${associatedTokenAddress.toBase58()} does not exist`,
      );
    }

    return associatedTokenAddress;
  }

  /**
   * Get the balance of a token account
   */
  async getTokenBalance(tokenAccount: PublicKey): Promise<number> {
    const info = await this.connection.getTokenAccountBalance(tokenAccount);
    return parseFloat(info.value.uiAmount || "0");
  }
}
