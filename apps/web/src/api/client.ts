import type { Loan } from '../types'
import { openRequests } from './fixtures'

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
}
