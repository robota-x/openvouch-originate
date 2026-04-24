/** Cloudflare Workers bindings available via c.env */
export type Bindings = {
  CH_API_KEY?:   string
  SENDGRID_KEY?: string
  EMAIL_FROM?:   string
}

/** Hono environment type threaded through the entire app */
export type AppEnv = {
  Bindings: Bindings
}

// ── Session ───────────────────────────────────────────────────────────────────

export type SessionStatus = 'pending' | 'email_verified' | 'attested'

export interface Session {
  id: string
  walletAddress: string
  companyNumber: string
  directorName: string
  companyEmail: string
  challengeMessage: string
  otp: string
  otpExpiresAt: number // unix ms
  status: SessionStatus
  createdAt: number // unix ms
}

// ── Attestation ───────────────────────────────────────────────────────────────

export interface Attestation {
  walletAddress: string
  companyNumber: string
  companyName: string
  directorName: string
  verified: boolean
  issuedAt: number // unix s
  expiresAt: number // unix s (issuedAt + 365 days)
  revoked: boolean
  attestationAddress: string // deterministic address derived from wallet + company
}

// ── Companies House ───────────────────────────────────────────────────────────

export interface Director {
  name: string
  role: string
  appointedOn: string
}

export interface CompanyDetails {
  companyNumber: string
  companyName: string
  status: string
  registeredOfficeAddress: Record<string, string>
  directors: Director[]
}
