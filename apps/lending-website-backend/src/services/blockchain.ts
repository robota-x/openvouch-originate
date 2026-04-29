import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";

// ✅ FIX: use named imports from Registry
import { Registry } from "@openvouch/idl";
const idl = Registry.getIdl("dblt_lending");

const PROGRAM_ID = "6fXix7yZxeoqyL3wNtAHpPZ8dXAXQe3DXbVPeqcH1Gny";

/**
 * ⚠️ NOTE:
 * This service MUST run in a Node-compatible environment
 * (NOT Cloudflare Workers runtime).
 */
export class BlockchainService {
  private connection: Connection;
  private program: anchor.Program;
  private providerWallet: anchor.Wallet;

  constructor(rpcUrl: string, providerWallet: anchor.Wallet) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.providerWallet = providerWallet;

    const provider = new anchor.AnchorProvider(this.connection, providerWallet, {
      commitment: "confirmed",
    });

    // ⚠️ Anchor expects full IDL object (now imported safely)
    this.program = new anchor.Program(
      idl as anchor.Idl,
      provider,
    );
  }

  // ==================== PDA DERIVATION HELPERS ====================

  async deriveProfilePDA(userAddress: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from("profile"), userAddress.toBuffer()],
      this.program.programId,
    );
  }

  async deriveVaultPDA(poolAddress: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from("vault"), poolAddress.toBuffer()],
      this.program.programId,
    );
  }

  async derivePositionPDA(
    poolAddress: PublicKey,
    lenderAddress: PublicKey,
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
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
    return PublicKey.findProgramAddress(
      [Buffer.from("schedule"), poolAddress.toBuffer()],
      this.program.programId,
    );
  }

  // ==================== LOAN POOL OPERATIONS ====================

  async createLoanPool(
    borrower: PublicKey,
    targetAmount: anchor.BN,
    termOfferId: PublicKey,
    yearsDataHash: string,
    yearsCovered: number,
    currency: string,
    country: string,
  ): Promise<string> {
    try {
      return await this.program.methods
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
    } catch (error) {
      console.error("Error creating loan pool:", error);
      throw error;
    }
  }

  async contributeToPool(
    poolAddress: PublicKey,
    lender: PublicKey,
    amount: anchor.BN,
    lenderTokenAccount: PublicKey,
    vaultTokenAccount: PublicKey,
  ): Promise<string> {
    try {
      const [vaultPDA] = await this.deriveVaultPDA(poolAddress);
      const [positionPDA] = await this.derivePositionPDA(poolAddress, lender);
      const [lenderProfilePDA] = await this.deriveProfilePDA(lender);

      return await this.program.methods
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
    } catch (error) {
      console.error("Error contributing to pool:", error);
      throw error;
    }
  }

  async disburseLoan(
    poolAddress: PublicKey,
    borrower: PublicKey,
    borrowerTokenAccount: PublicKey,
    vaultTokenAccount: PublicKey,
  ): Promise<string> {
    try {
      const [vaultPDA] = await this.deriveVaultPDA(poolAddress);
      const [borrowerProfilePDA] = await this.deriveProfilePDA(borrower);

      return await this.program.methods
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
    } catch (error) {
      console.error("Error disburse loan:", error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  async getOrCreateTokenAccount(
    owner: PublicKey,
    mint: PublicKey,
  ): Promise<PublicKey> {
    const associatedTokenAddress = await anchor.utils.token.associatedAddress(
      {
        mint,
        owner,
      },
    );

    const accountInfo = await this.connection.getAccountInfo(
      associatedTokenAddress,
    );

    if (!accountInfo) {
      console.warn(
        `Token account ${associatedTokenAddress.toBase58()} does not exist`,
      );
    }

    return associatedTokenAddress;
  }

  async getTokenBalance(tokenAccount: PublicKey): Promise<number> {
    const info = await this.connection.getTokenAccountBalance(tokenAccount);
    return info.value.uiAmount ?? 0;
  }
}
