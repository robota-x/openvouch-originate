// ── Domain types ──────────────────────────────────────────────────────────────

export interface Loan {
  id: string               // server-assigned UUID (or fixture id)
  borrower: string         // wallet address, e.g. "7xKX..."
  nickname: string         // ENS / display name, e.g. "alice.sol"
  amount: number           // in `currency` units
  raisedAmount: number     // currently raised
  currency: string         // e.g. "USDC"
  apy: number              // percentage, e.g. 12.5
  duration: number         // days
  repaymentRate: number    // 0–100 (percentage of past loans repaid)
  attestationCount: number // number of on-chain attestations
  trustScore: number       // 0–1000, platform-computed credit trust score
}

export interface Attestation {
  icon: string         // material symbol name, e.g. "account_balance"
  title: string
  status: string       // human-readable, e.g. "Verified", "Score: 850"
  verified?: boolean   // defaults to true when absent

  // ── Per-claim detail ───────────────────────────────────────────────────────
  providerId?: string               // references AttestationProvider.id
  issuedAt?: string                 // ISO date — the only fixed per-claim field
  onChainRef?: string               // Solana tx signature; links to Solscan
  metadata?: Record<string, string> // type-specific key/value, shown as details
}

/** A 3rd-party service that can issue attestations. Returned by GET /api/attestation-providers. */
export interface AttestationProvider {
  id: string
  name: string
  wallet: string       // signing wallet address — on-chain identity proof
  website: string
  claimUrl: string     // URL template; "{address}" is replaced with the subject wallet
  description: string  // what this provider attests
}

export interface ProfileLoan {
  id: string
  amount: number        // original requested / borrowed amount
  raisedAmount: number  // currently raised
  currency: string
  apy: number
  duration: number      // days
  status: 'open' | 'active' | 'repaid' | 'defaulted'
  repaid: number        // 0 when unpaid/defaulted, full amount when repaid; no partials
  dueDate?: string      // ISO date; present for active/repaid/defaulted loans
  counterparty?: string // lender address; absent for open offers
}

/** A loan from the lender's perspective. Returned by the lending side of the portfolio. */
export interface LentLoan {
  id: string
  // Borrower info (denormalized — lender cares who has their money)
  borrower: string
  borrowerNickname: string
  borrowerTrustScore: number
  borrowerAttestationCount: number
  borrowerRepaymentRate: number   // 0–100, historical
  // Terms
  amount: number                  // The amount this specific lender contributed
  totalLoanAmount?: number        // The total size of the loan pool
  currency: string
  apy: number
  duration: number                // days
  // Lifecycle — no 'open' state; open offers haven't been funded yet
  status: 'active' | 'repaid' | 'defaulted'
  dueDate?: string                // ISO date
}

export interface Profile {
  address: string
  nickname: string
  trustScore: number
  attestations: Attestation[]
  loans: ProfileLoan[]            // loans where this address is the borrower
  lentLoans?: LentLoan[]          // loans where this address is the lender
}

// ── Contract modal view ────────────────────────────────────────────────────────
// Unified shape fed to ContractModal regardless of source (Loan or ProfileLoan).

export interface ContractView {
  id?: string                  // contract reference, if known

  // Borrower
  borrower: string
  borrowerNickname: string
  borrowerTrustScore: number
  borrowerAttestationCount: number
  borrowerRepaymentRate: number  // 0–100, historical rate

  // Lender (absent for open offers)
  lender?: string

  // Terms
  amount: number
  raisedAmount?: number
  currency: string
  apy: number
  duration: number             // days

  status: 'open' | 'active' | 'repaid' | 'defaulted'

  // Dates (absent for open offers)
  dueDate?: string             // ISO date
}

// ── API error ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly code: string
  readonly status: number | undefined

  constructor(message: string, code: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}
