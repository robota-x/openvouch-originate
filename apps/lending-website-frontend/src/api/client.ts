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
// ---------------------------------------------------------------------------

export const backendClient = {
  /** GET /api/loans/open — returns all currently open loan requests. */
  async getOpenRequests(): Promise<Loan[]> {
    return openRequests
  },

  /** GET /api/profile/:address — returns profile for the given wallet address.
   *  Falls back to a minimal empty profile for unknown addresses. */
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
}
