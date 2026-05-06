// import type { AppConfig } from './config.js'

// /** Cloudflare Workers bindings available via c.env */
// export type Bindings = {
//   DB:              D1Database
//   JWT_SECRET:      string
//   SOLANA_RPC_URL:  string
//   SOLANA_PROGRAM_ID?: string
//   /** Set to "true" in .dev.vars to serve fixture data instead of querying D1. */
//   FIXTURES_ENABLED?: string
// }

// /** Per-request context variables set by middleware and read by handlers */
// export type Variables = {
//   user:   { address: string }
//   config: AppConfig
// }

// /** Hono environment type threaded through the entire app */
// export type AppEnv = {
//   Bindings: Bindings
//   Variables: Variables
// }

// export interface Loan {
//   id:               string
//   borrower:         string
//   nickname:         string
//   amount:           string
//   raisedAmount:     string
//   currency:         string
//   apy:              string
//   duration:         number
//   trustScore:       number
//   repaymentRate:    number
//   attestationCount: number
// }

// export interface ContractView {
//   id:                       string
//   borrower:                 string
//   borrowerNickname:         string
//   borrowerTrustScore:       number
//   borrowerAttestationCount: number
//   borrowerRepaymentRate:    number
//   lender?:                  string
//   amount:                   string
//   raisedAmount:             string
//   repaid:                   string
//   currency:                 string
//   apy:                      string
//   duration:                 number
//   status:                   string
//   dueDate?:                 string
//   onChainRef?:              string
// }

// apps/lending-website-backend/src/types.ts

import type { AppConfig } from "./config.js";
import type { D1Database } from "@cloudflare/workers-types";

/** Cloudflare Workers bindings available via c.env */
export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  SOLANA_RPC_URL: string;
  SOLANA_PROGRAM_ID?: string;
  /** Set to "true" in .dev.vars to serve fixture data instead of querying D1. */
  FIXTURES_ENABLED?: string;
};

/** Per-request context variables set by middleware and read by handlers */
export type Variables = {
  user: { address: string };
  config: AppConfig;
};

/** Hono environment type threaded through the entire app */
export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

// ==========================================
// Hono Context Extension
// ==========================================

/**
 * Extend Hono's Context types to allow direct access to user address.
 * This enables: const addr = c.get('userAddress')
 *
 * We map this to the existing `user.address` structure for consistency.
 */
declare module "hono" {
  interface ContextVariableMap {
    userAddress: string; // The authenticated wallet address (alias for user.address)
    userId?: string; // Optional internal user ID if needed later
  }
}

// ==========================================
// Domain Models
// ==========================================

export interface Loan {
  id: string;
  borrower: string;
  nickname: string;
  amount: string;
  raisedAmount: string;
  currency: string;
  apy: string;
  duration: number;
  trustScore: number;
  repaymentRate: number;
  attestationCount: number;
}

export interface ContractView {
  id: string;
  borrower: string;
  borrowerNickname: string;
  borrowerTrustScore: number;
  borrowerAttestationCount: number;
  borrowerRepaymentRate: number;
  lender?: string;
  amount: string;
  raisedAmount: string;
  repaid: string;
  currency: string;
  apy: string;
  duration: number;
  status: string;
  dueDate?: string;
  onChainRef?: string;
}
