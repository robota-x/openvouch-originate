import * as anchor from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "bn.js";

// ✅ FIX: use named imports from Registry
import { Registry } from "@openvouch/idl";
const idl = Registry.getIdl("dblt_lending");

const PROGRAM_ID = "6fXix7yZxeoqyL3wNtAHpPZ8dXAXQe3DXbVPeqcH1Gny";

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

    const provider = new anchor.AnchorProvider(this.connection, providerWallet, {
      commitment: "confirmed",
    });

    // ⚠️ Anchor expects full IDL object (now imported safely)
    this.program = new anchor.Program(
      idl as anchor.Idl,
      provider,
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
    targetAmount: anchor.BN,
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
    amount: anchor.BN,
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
    const associatedTokenAddress = await anchor.utils.token.associatedAddress(
      {
        mint,
        owner,
      },
    );

    const info = await this.connection.getAccountInfo(ata);

    if (!info) {
      console.warn(`⚠️ ATA missing: ${ata.toBase58()}`);
    }

    return ata;
  }

  async getTokenBalance(tokenAccount: PublicKey): Promise<number> {
    const info = await this.connection.getTokenAccountBalance(tokenAccount);
    return info.value.uiAmount ?? 0;
  }
}
