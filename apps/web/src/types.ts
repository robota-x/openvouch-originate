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
}

export interface Attestation {
  icon: string             // material symbol name, e.g. "account_balance"
  title: string
  status: string           // human-readable, e.g. "Verified", "Score: 850"
  verified?: boolean       // defaults to true when absent
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
