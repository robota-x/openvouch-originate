import { PublicKey } from "@solana/web3.js";
import type { BlockchainContext } from "./context.js";

const encoder = new TextEncoder();

export async function deriveProfilePDA(user: PublicKey, ctx: BlockchainContext) {
  return PublicKey.findProgramAddress(
    [encoder.encode("profile"), user.toBytes()],
    ctx.program.programId,
  );
}

export async function deriveVaultPDA(pool: PublicKey, ctx: BlockchainContext) {
  return PublicKey.findProgramAddress(
    [encoder.encode("vault"), pool.toBytes()],
    ctx.program.programId,
  );
}

export async function derivePositionPDA(pool: PublicKey, lender: PublicKey, ctx: BlockchainContext) {
  return PublicKey.findProgramAddress(
    [encoder.encode("position"), pool.toBytes(), lender.toBytes()],
    ctx.program.programId,
  );
}

export async function deriveSchedulePDA(pool: PublicKey, ctx: BlockchainContext) {
  return PublicKey.findProgramAddress(
    [encoder.encode("schedule"), pool.toBytes()],
    ctx.program.programId,
  );
}
