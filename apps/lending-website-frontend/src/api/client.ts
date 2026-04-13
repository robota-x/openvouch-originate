import type { Loan, Profile, AttestationProvider } from '../types'
import { ApiError } from '../types'
import { openRequests, profiles, attestationProviders } from './fixtures'

// ---------------------------------------------------------------------------
// Backend client
//
// VITE_API_BASE_URL controls where API calls go:
//   - Unset / empty string: same-origin (works when Vite proxy or CF Pages
//     routes /api/* to the Worker, or when frontend and backend share a domain)
//   - http://localhost:3000: direct to local backend (used via Vite dev proxy)
//   - https://openvouch-originate-backend-staging.workers.dev: explicit staging
//
// The Vite dev server proxies /api/* to VITE_API_BASE_URL so the browser never
// makes a cross-origin request during development (no CORS preflight).
//
// Error path: non-2xx responses are thrown as ApiError so callers can branch on
// `instanceof ApiError` vs unknown network failures.
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    let message = res.statusText
    try { message = ((await res.json()) as { error?: string }).error ?? message } catch { /* non-JSON body */ }
    throw new ApiError(message, `HTTP_${res.status}`, res.status)
  }
  return res
}

export const backendClient = {
  // ── Public data ──────────────────────────────────────────────────────────
  // These endpoints are still 501 on the backend (data layer not yet wired).
  // Fixtures are served locally until the backend implements them.

  /** GET /api/loans — returns all currently open loan requests. */
  async getOpenRequests(): Promise<Loan[]> {
    return openRequests
  },

  /** GET /api/profiles/:address — returns profile for the given wallet address. */
  async getProfile(address: string): Promise<Profile> {
    return profiles[address] ?? {
      address,
      nickname:     address.slice(0, 8),
      trustScore:   0,
      attestations: [],
      loans:        [],
    }
  },

  /** GET /api/attestation-providers — returns all registered attestation providers. */
  async getAttestationProviders(): Promise<AttestationProvider[]> {
    return attestationProviders
  },

  // ── Auth ─────────────────────────────────────────────────────────────────

  /** POST /api/auth/challenge — request a nonce for the given wallet address. */
  async challenge(address: string): Promise<{ nonce: string }> {
    const res = await apiFetch('/api/auth/challenge', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ address }),
    })
    return res.json() as Promise<{ nonce: string }>
  },

  /** POST /api/auth/verify — submit signed nonce, receive JWT. */
  async verify(address: string, nonce: string, signature: string): Promise<{ token: string }> {
    const res = await apiFetch('/api/auth/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ address, nonce, signature }),
    })
    return res.json() as Promise<{ token: string }>
  },

  /** DELETE /api/auth/session — server-side teardown (stateless JWT: client must also discard token). */
  async logout(token: string): Promise<void> {
    await apiFetch('/api/auth/session', {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
