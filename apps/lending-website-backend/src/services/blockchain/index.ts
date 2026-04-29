export * from "./context.js";
export * from "./pdas.js";
export * from "./builders.js";

import { Connection, PublicKey } from "@solana/web3.js";

export async function getSolBalance(connection: Connection, address: string): Promise<number> {
  const pubkey = new PublicKey(address);
  const balance = await connection.getBalance(pubkey);
  return balance / 1e9; // Convert lamports to SOL
}
