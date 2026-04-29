import type { AppConfig } from './config.js'

/** Cloudflare Workers bindings available via c.env */
export type Bindings = {
  DB:            D1Database
  COMPANIES_HOUSE_UK_API_KEY?: string
  IDENTITY_SERVICE_URL?: string
}

/** Per-request context variables set by middleware and read by handlers */
export type Variables = {
  config: AppConfig
}

/** Hono environment type threaded through the entire app */
export type AppEnv = {
  Bindings:  Bindings
  Variables: Variables
}

// ── Session ───────────────────────────────────────────────────────────────────

export type SessionStatus = 'pending' | 'attested'

export interface Session {
  id: string
  walletAddress: string
  companyNumber: string
  directorName: string
  challengeMessage: string
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
  dob?: string
  country?: string
}

export interface CompanyDetails {
  companyNumber: string
  companyName: string
  status: string
  registeredOfficeAddress: Record<string, string>
  directors: Director[]
}
