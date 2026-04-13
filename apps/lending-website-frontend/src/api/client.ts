import type { Loan, Profile, AttestationProvider } from '../types'
import { openRequests, profiles, attestationProviders } from './fixtures'

// ---------------------------------------------------------------------------
// Backend client
//
// All methods return Promises so call-sites are insulated from the transport.
// Swap each method body for a real fetch() call once the API is live.
//
// Error path: reject with ApiError (see src/types.ts) so callers can branch
// on `instanceof ApiError` vs unknown network failures.
//
// Protected calls (loans mutation, profile PATCH, etc.) should attach:
//   Authorization: `Bearer ${useAuthStore().token}`
// when real fetch is wired — kept out of this file to avoid circular imports.
// ---------------------------------------------------------------------------

export const backendClient = {
  // ── Public data ──────────────────────────────────────────────────────────

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
  async challenge(_address: string): Promise<{ nonce: string }> {
    // TODO: fetch('/api/auth/challenge', { method: 'POST', body: JSON.stringify({ address: _address }) })
    return { nonce: crypto.randomUUID() }
  },

  /** POST /api/auth/verify — submit signed nonce, receive JWT. */
  async verify(_address: string, _nonce: string, _signature: string): Promise<{ token: string }> {
    // TODO: fetch('/api/auth/verify', { method: 'POST', body: JSON.stringify({ address, nonce, signature }) })
    return { token: `mock-token-${crypto.randomUUID()}` }
  },

  /** DELETE /api/auth/session — server-side teardown (stateless JWT: client must also discard token). */
  async logout(): Promise<void> {
    // TODO: fetch('/api/auth/session', { method: 'DELETE', headers: { Authorization: `Bearer <token>` } })
  },
}
