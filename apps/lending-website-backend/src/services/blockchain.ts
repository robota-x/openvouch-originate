import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import BN from "bn.js";
import { getDbltLendingIdl, Registry } from "@openvouch/idl";

/**
 * ⚠️ Backend-only transaction builder
 * - NO signing
 * - NO payer wallet
 * - frontend signs everything
 */

export class BlockchainService {
  private connection: Connection;
  private program: anchor.Program;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");

    const idl = getDbltLendingIdl();

    /**
     * ✅ FIX: NO NodeWallet, NO payer required
     * We only satisfy Anchor type system
     */
    const dummyKeypair = anchor.web3.Keypair.generate();
    const dummyWallet: anchor.Wallet & { payer: anchor.web3.Keypair } = {
      publicKey: dummyKeypair.publicKey,
      payer: dummyKeypair,

      signTransaction: async <T extends Transaction | VersionedTransaction>(
        tx: T,
      ): Promise<T> => tx,

      signAllTransactions: async <T extends Transaction | VersionedTransaction>(
        txs: T[],
      ): Promise<T[]> => txs,
    };

    // Use the correct explicit AnchorProvider type
    const provider: anchor.AnchorProvider = new anchor.AnchorProvider(
      this.connection,
      dummyWallet,
      { commitment: "confirmed" },
    );

    this.program = new anchor.Program(idl as anchor.Idl, provider);
  }

  // ================= PDA DERIVATION =================

  async deriveProfilePDA(user: PublicKey) {
    return PublicKey.findProgramAddress(
      [Buffer.from("profile"), user.toBuffer()],
      this.program.programId,
    );
  }

  async deriveVaultPDA(pool: PublicKey) {
    return PublicKey.findProgramAddress(
      [Buffer.from("vault"), pool.toBuffer()],
      this.program.programId,
    );
  }

  async derivePositionPDA(pool: PublicKey, lender: PublicKey) {
    return PublicKey.findProgramAddress(
      [Buffer.from("position"), pool.toBuffer(), lender.toBuffer()],
      this.program.programId,
    );
  }

  async deriveSchedulePDA(pool: PublicKey) {
    return PublicKey.findProgramAddress(
      [Buffer.from("schedule"), pool.toBuffer()],
      this.program.programId,
    );
  }

  // ================= TX BUILDERS =================

  /**
   * Create loan pool (borrower signs)
   */
  async buildCreateLoanPoolTx(
    borrower: PublicKey,
    targetAmount: BN,
    termOfferId: PublicKey,
    yearsDataHash: string,
    yearsCovered: number,
    currency: string,
    country: string,
  ): Promise<Transaction> {
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
      .transaction();
  }

  /**
   * Lender contributes to pool
   */
  async buildContributeToPoolTx(
    pool: PublicKey,
    lender: PublicKey,
    amount: BN,
    lenderTokenAccount: PublicKey,
    vaultTokenAccount: PublicKey,
  ): Promise<Transaction> {
    const [vault] = await this.deriveVaultPDA(pool);
    const [position] = await this.derivePositionPDA(pool, lender);
    const [lenderProfile] = await this.deriveProfilePDA(lender);

    return await this.program.methods
      .contributeToPool(amount)
      .accounts({
        pool,
        vault,
        lender,
        lenderProfile,
        lenderTokenAccount,
        vaultTokenAccount,
        position,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .transaction();
  }

  /**
   * Borrower receives funds
   */
  async buildDisburseLoanTx(
    pool: PublicKey,
    borrower: PublicKey,
    borrowerTokenAccount: PublicKey,
    vaultTokenAccount: PublicKey,
  ): Promise<Transaction> {
    const [vault] = await this.deriveVaultPDA(pool);
    const [borrowerProfile] = await this.deriveProfilePDA(borrower);

    return await this.program.methods
      .disburseLoan()
      .accounts({
        pool,
        vault,
        borrower,
        borrowerProfile,
        borrowerTokenAccount,
        vaultTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .transaction();
  }

  // ================= TOKEN HELPERS =================

  async getOrCreateTokenAccount(
    owner: PublicKey,
    mint: PublicKey,
  ): Promise<PublicKey> {
    const ata = await anchor.utils.token.associatedAddress({
      mint,
      owner,
    });

    const info = await this.connection.getAccountInfo(ata);

    if (!info) {
      console.warn(`⚠️ ATA missing: ${ata.toBase58()}`);
    }

    return ata;
  }

  async getTokenBalance(tokenAccount: PublicKey): Promise<number> {
    const res = await this.connection.getTokenAccountBalance(tokenAccount);

    // FIX: safe conversion (no "0" string issues)
    return Number(res.value.uiAmount ?? 0);
  }
}
