// ── Domain types ──────────────────────────────────────────────────────────────

export interface Loan {
  borrower: string         // wallet address, e.g. "0x71C7..."
  nickname: string         // ENS / display name, e.g. "alice.eth"
  amount: number           // in `currency` units
  currency: string         // e.g. "USDC"
  apy: number              // percentage, e.g. 12.5
  duration: number         // days
  repaymentRate: number    // 0–100 (percentage of past loans repaid)
  attestationCount: number // number of on-chain attestations
  trustScore: number       // 0–1000, platform-computed credit trust score
}

export interface Attestation {
  icon: string             // material symbol name, e.g. "account_balance"
  title: string
  status: string           // human-readable, e.g. "Verified", "Score: 850"
  verified?: boolean       // defaults to true when absent
}

export interface ProfileLoan {
  id: string
  amount: number        // original requested / borrowed amount
  currency: string
  apy: number
  duration: number      // days
  status: 'open' | 'active' | 'closed'
  repaid: number        // 0 (unpaid/defaulted) or full amount (repaid); no partials
  dueDate?: string      // ISO date; present for active and closed loans
  counterparty?: string // lender address; absent for open offers
}

export interface Profile {
  address: string
  nickname: string
  trustScore: number
  attestations: Attestation[]
  loans: ProfileLoan[]
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
  currency: string
  apy: number
  duration: number             // days

  // Status (more explicit than ProfileLoan's 'closed')
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
