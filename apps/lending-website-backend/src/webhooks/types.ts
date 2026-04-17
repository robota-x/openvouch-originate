// Manual Helius enhanced-transaction webhook types.
// Intentionally hand-written — no helius-sdk import (supply-chain hygiene).
// Source: https://www.helius.dev/docs/api-reference/webhooks/create-webhook
// Re-sync this file when upgrading Helius webhook version.

// ── Instruction-level types ───────────────────────────────────────────────────

export interface InnerInstruction {
  accounts: string[]
  data: string        // base58-encoded instruction data
  programId: string
}

export interface Instruction {
  accounts: string[]
  data: string        // base58-encoded instruction data; first 8 bytes = Anchor discriminator
  programId: string
  innerInstructions: InnerInstruction[]
}

// ── Account / transfer types ──────────────────────────────────────────────────

export interface TokenTransfer {
  fromUserAccount: string
  toUserAccount: string
  fromTokenAccount: string
  toTokenAccount: string
  tokenAmount: number
  mint: string
  tokenStandard: string
}

export interface NativeTransfer {
  fromUserAccount: string
  toUserAccount: string
  amount: number
}

export interface AccountData {
  account: string
  nativeBalanceChange: number
  tokenBalanceChanges: TokenBalanceChange[]
}

export interface TokenBalanceChange {
  userAccount: string
  tokenAccount: string
  mint: string
  rawTokenAmount: { tokenAmount: string; decimals: number }
}

// ── Top-level enhanced transaction ───────────────────────────────────────────

/**
 * A single parsed transaction from a Helius enhanced webhook delivery.
 *
 * For programs Helius does not recognise (e.g. our custom Anchor programs)
 * `type` will be "UNKNOWN" and `source` will be "UNKNOWN". The raw
 * instruction bytes are always present in `instructions[].data`.
 */
export interface EnhancedTransaction {
  signature: string
  slot: number
  timestamp: number       // Unix seconds (same as blockTime)
  fee: number
  feePayer: string
  type: string            // "UNKNOWN" for custom programs
  source: string          // "UNKNOWN" for custom programs
  description: string
  accountData: AccountData[]
  instructions: Instruction[]
  nativeTransfers: NativeTransfer[]
  tokenTransfers: TokenTransfer[]
  transactionError: string | null
}

/**
 * Helius delivers webhooks as a JSON array of transactions (batch).
 * POST body is always an array even for single-transaction deliveries.
 */
export type HeliusWebhookPayload = EnhancedTransaction[]
