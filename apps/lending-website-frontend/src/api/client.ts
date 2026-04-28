// import type { Loan, Profile, AttestationProvider, ProfileLoan } from '../types'
// import { ApiError } from '../types'

// // ---------------------------------------------------------------------------
// // Backend client
// //
// // VITE_API_BASE_URL controls where API calls go:
// //   - Unset / empty string: same-origin (works when Vite proxy or CF Pages
// //     routes /api/* to the Worker, or when frontend and backend share a domain)
// //   - http://localhost:8787: direct to local wrangler dev (used via Vite dev proxy)
// //   - https://openvouch-originate-backend-staging.workers.dev: explicit staging
// //
// // The Vite dev server proxies /api/* to VITE_API_BASE_URL so the browser never
// // makes a cross-origin request during development (no CORS preflight).
// //
// // Error path: non-2xx responses are thrown as ApiError so callers can branch on
// // `instanceof ApiError` vs unknown network failures.
// // ---------------------------------------------------------------------------

// const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

// async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
//   const res = await fetch(`${API_BASE}${path}`, init)

//   if (!res.ok) {
//     let message = res.statusText
//     try {
//       const body = await res.json() as { error?: string }
//       message = body.error ?? message
//     } catch {
//       /* non-JSON body */
//     }
//     const error = new ApiError(message, `HTTP_${res.status}`, res.status)
//     console.error(`[apiFetch] Error ${res.status} on ${path}:`, error)
//     throw error
//   }

//   // Check if we actually got JSON back. If we got HTML (e.g. 404/SPA fallback),
//   // res.json() will throw a confusing "Unexpected token <" error.
//   const contentType = res.headers.get('Content-Type')
//   if (contentType && !contentType.includes('application/json')) {
//     const error = new ApiError(
//       `Expected JSON but received ${contentType.split(';')[0]}. The API route might be missing or misconfigured.`,
//       'INVALID_RESPONSE_TYPE',
//       res.status
//     )
//     console.error(`[apiFetch] Type Mismatch on ${path}:`, error)
//     throw error
//   }

//   return res
// }

// export const backendClient = {
//   // ── Public data ──────────────────────────────────────────────────────────

//   /** GET /api/loans — returns all currently open loan requests. */
//   async getOpenRequests(): Promise<Loan[]> {
//     const res = await apiFetch('/api/loans')
//     return res.json() as Promise<Loan[]>
//   },

//   /** GET /api/profiles/:address — returns profile for the given wallet address. */
//   async getProfile(address: string): Promise<Profile> {
//     const res = await apiFetch(`/api/profiles/${encodeURIComponent(address)}`)
//     return res.json() as Promise<Profile>
//   },

//   /** GET /api/attestation-providers — returns all registered attestation providers. */
//   async getAttestationProviders(): Promise<AttestationProvider[]> {
//     const res = await apiFetch('/api/attestation-providers')
//     return res.json() as Promise<AttestationProvider[]>
//   },

//   // ── Loan CRUD (authenticated) ─────────────────────────────────────────────

//   /** POST /api/loans — borrower posts a new open loan offer. */
//   async createLoan(
//     token: string,
//     offer: { amount: number; currency: string; apy: number; duration: number },
//   ): Promise<ProfileLoan> {
//     const res = await apiFetch('/api/loans', {
//       method:  'POST',
//       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//       body:    JSON.stringify(offer),
//     })
//     return res.json() as Promise<ProfileLoan>
//   },

//   /** GET /api/loans/:id — single loan listing. */
//   async getLoan(id: string): Promise<ProfileLoan> {
//     const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}`)
//     return res.json() as Promise<ProfileLoan>
//   },

//   /** PATCH /api/loans/:id — update terms of an open offer (borrower only). */
//   async updateLoan(
//     token: string,
//     id: string,
//     patch: Partial<{ amount: number; currency: string; apy: number; duration: number }>,
//   ): Promise<ProfileLoan> {
//     const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}`, {
//       method:  'PATCH',
//       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//       body:    JSON.stringify(patch),
//     })
//     return res.json() as Promise<ProfileLoan>
//   },

//   /** DELETE /api/loans/:id — cancel an open offer (borrower only). */
//   async cancelLoan(token: string, id: string): Promise<void> {
//     await apiFetch(`/api/loans/${encodeURIComponent(id)}`, {
//       method:  'DELETE',
//       headers: { Authorization: `Bearer ${token}` },
//     })
//   },

//   /**
//    * POST /api/loans/:id/fund — notify the backend that a lending contract was
//    * signed on-chain. The backend will verify against the chain before updating
//    * the listing status. Returns 204; poll GET /api/loans/:id to see the update.
//    */
//   async notifyFund(token: string, id: string): Promise<void> {
//     await apiFetch(`/api/loans/${encodeURIComponent(id)}/fund`, {
//       method:  'POST',
//       headers: { Authorization: `Bearer ${token}` },
//     })
//   },

//   // ── Auth ─────────────────────────────────────────────────────────────────

//   /** POST /api/auth/challenge — request a nonce for the given wallet address. */
//   async challenge(address: string): Promise<{ nonce: string }> {
//     const res = await apiFetch('/api/auth/challenge', {
//       method:  'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body:    JSON.stringify({ address }),
//     })
//     return res.json() as Promise<{ nonce: string }>
//   },

//   /** POST /api/auth/verify — submit signed nonce, receive JWT. */
//   async verify(address: string, nonce: string, signature: string): Promise<{ token: string }> {
//     const res = await apiFetch('/api/auth/verify', {
//       method:  'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body:    JSON.stringify({ address, nonce, signature }),
//     })
//     return res.json() as Promise<{ token: string }>
//   },

//   /** DELETE /api/auth/session — server-side teardown (stateless JWT: client must also discard token). */
//   async logout(token: string): Promise<void> {
//     await apiFetch('/api/auth/session', {
//       method:  'DELETE',
//       headers: { Authorization: `Bearer ${token}` },
//     })
//   },
// }

import type { Loan, Profile, AttestationProvider, ProfileLoan } from "../types";
import { ApiError } from "../types";

// ---------------------------------------------------------------------------
// Backend client
//
// VITE_API_BASE_URL controls where lending API calls go:
//   - Unset / empty string: same-origin (works when Vite proxy or CF Pages
//     routes /api/* to the Worker, or when frontend and backend share a domain)
//   - http://localhost:8787: direct to local lending backend wrangler dev
//   - https://openvouch-originate-backend-staging.robota.dev: explicit staging
//
// The Vite dev server proxies /api/* to VITE_API_BASE_URL so the browser never
// makes a cross-origin request during development (no CORS preflight).
//
// Error path: non-2xx responses are thrown as ApiError so callers can branch on
// `instanceof ApiError` vs unknown network failures.
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
const IDENTITY_API_BASE =
  (import.meta.env.VITE_IDENTITY_API_BASE_URL as string | undefined) ?? '/identity-api'
const ATTESTATION_API_BASE =
  (import.meta.env.VITE_ATTESTATION_API_BASE_URL as string | undefined) ?? '/attestation-api'

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, init);

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      /* non-JSON body */
    }

    const error = new ApiError(message, `HTTP_${res.status}`, res.status);
    console.error(`[apiFetch] Error ${res.status} on ${path}:`, error);
    throw error;
  }

  const contentType = res.headers.get("Content-Type");
  if (contentType && !contentType.includes("application/json")) {
    const error = new ApiError(
      `Expected JSON but received ${contentType.split(";")[0]}. The API route might be missing or misconfigured.`,
      "INVALID_RESPONSE_TYPE",
      res.status,
    );

    console.error(`[apiFetch] Type Mismatch on ${path}:`, error);
    throw error;
  }

  return res;
}

async function identityFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${IDENTITY_API_BASE}${path}`, init)

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json() as { error?: string }
      message = body.error ?? message
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(message, `HTTP_${res.status}`, res.status)
  }

  return res
}

async function attestationFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${ATTESTATION_API_BASE}${path}`, init)

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json() as { error?: string }
      message = body.error ?? message
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(message, `HTTP_${res.status}`, res.status)
  }

  return res
}

export const backendClient = {
  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC DATA
  // ───────────────────────────────────────────────────────────────────────────

  async getOpenRequests(): Promise<Loan[]> {
    const res = await apiFetch("/api/loans");
    return res.json() as Promise<Loan[]>;
  },

  async getProfile(address: string): Promise<Profile> {
    const res = await apiFetch(`/api/profiles/${encodeURIComponent(address)}`);
    return res.json() as Promise<Profile>;
  },

  async getAttestationProviders(): Promise<AttestationProvider[]> {
    const res = await apiFetch("/api/attestation-providers");
    return res.json() as Promise<AttestationProvider[]>;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // LOANS (AUTHENTICATED)
  // ───────────────────────────────────────────────────────────────────────────

  async createLoan(
    token: string,
    offer: {
      amount: number;
      currency: string;
      apy: number;
      duration: number;
    },
  ): Promise<ProfileLoan> {
    const res = await apiFetch("/api/loans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(offer),
    });

    return res.json() as Promise<ProfileLoan>;
  },

  async getLoan(id: string): Promise<ProfileLoan> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}`);
    return res.json() as Promise<ProfileLoan>;
  },

  async updateLoan(
    token: string,
    id: string,
    patch: Partial<{
      amount: number;
      currency: string;
      apy: number;
      duration: number;
    }>,
  ): Promise<ProfileLoan> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });

    return res.json() as Promise<ProfileLoan>;
  },

  async cancelLoan(token: string, id: string): Promise<void> {
    await apiFetch(`/api/loans/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async notifyFund(token: string, id: string): Promise<void> {
    await apiFetch(`/api/loans/${encodeURIComponent(id)}/fund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  // ───────────────────────────────────────────────────────────────────────────
  // AUTH
  // ───────────────────────────────────────────────────────────────────────────

  async challenge(address: string): Promise<{ nonce: string }> {
    const res = await apiFetch("/api/auth/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });

    return res.json() as Promise<{ nonce: string }>;
  },

  async verify(
    address: string,
    nonce: string,
    signature: string,
  ): Promise<{ token: string }> {
    const res = await apiFetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, nonce, signature }),
    });

    return res.json() as Promise<{ token: string }>;
  },

  async logout(token: string): Promise<void> {
    await apiFetch("/api/auth/session", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * GET /api/auth/me
   * Validate JWT + return session user
   * Used for restoreSession on app load
   */
  async me(token: string): Promise<{ address: string }> {
    const res = await apiFetch("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.json() as Promise<{ address: string }>;
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

export const identityClient = {
  async startVerification(
    walletAddress: string,
    redirectUrl?: string,
    prefill?: { fullName?: string; dob?: string; country?: string },
  ): Promise<{ sessionId: string; verificationUrl: string }> {
    const res = await identityFetch('/verify/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, redirectUrl, ...prefill }),
    })
    return res.json() as Promise<{ sessionId: string; verificationUrl: string }>
  },

  async completeVerification(input: {
    sessionId: string
    walletAddress: string
    fullName: string
    dob?: string
    country?: string
  }): Promise<{ success: boolean; verified: boolean }> {
    const res = await identityFetch('/verify/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return res.json() as Promise<{ success: boolean; verified: boolean }>
  },

  async getIdentity(walletAddress: string): Promise<{
    verified: boolean
    identity?: {
      fullName: string
      dob: string
      country: string
      verifiedAt: number
    }
  }> {
    const res = await fetch(`${IDENTITY_API_BASE}/identity/${encodeURIComponent(walletAddress)}`)
    if (res.status === 404) return { verified: false }
    if (!res.ok) {
      throw new ApiError(`Identity service returned ${res.status}`, `HTTP_${res.status}`, res.status)
    }
    return res.json() as Promise<{
      verified: boolean
      identity?: {
        fullName: string
        dob: string
        country: string
        verifiedAt: number
      }
    }>
  },
}

type Director = {
  name: string
  role: string
  appointedOn: string
  dob?: string
  country?: string
}

type CompanyLookup = {
  companyNumber: string
  name: string
  status: string
  registeredOfficeAddress: Record<string, string>
  directors: Director[]
}

export const attestationClient = {
  async getCompany(companyNumber: string): Promise<CompanyLookup> {
    const res = await attestationFetch(`/api/company/${encodeURIComponent(companyNumber)}`)
    return res.json() as Promise<CompanyLookup>
  },

  async startVerificationSession(input: {
    walletAddress: string
    companyNumber: string
    directorName: string
  }): Promise<{
    sessionId: string
    challengeMessage: string
    companyName: string
    verifiedIdentity: string
  }> {
    const res = await attestationFetch('/api/verify/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    return res.json() as Promise<{
      sessionId: string
      challengeMessage: string
      companyName: string
      verifiedIdentity: string
    }>
  },

  async completeVerificationSession(sessionId: string): Promise<{
    success: boolean
    attestationAddress: string
    companyName: string
    expiresAt: number
  }> {
    const res = await attestationFetch('/api/verify/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    return res.json() as Promise<{
      success: boolean
      attestationAddress: string
      companyName: string
      expiresAt: number
    }>
  },

  async getStatus(walletAddress: string): Promise<{
    verified: boolean
    companyNumber?: string
    companyName?: string
    directorName?: string
    attestationAddress?: string
    issuedAt?: number
    expiresAt?: number
    reason?: string
  }> {
    const res = await fetch(`${ATTESTATION_API_BASE}/api/verify/status/${encodeURIComponent(walletAddress)}`)
    if (!res.ok) {
      throw new ApiError(`Attestation service returned ${res.status}`, `HTTP_${res.status}`, res.status)
    }
    return res.json() as Promise<{
      verified: boolean
      companyNumber?: string
      companyName?: string
      directorName?: string
      attestationAddress?: string
      issuedAt?: number
      expiresAt?: number
      reason?: string
    }>
  },
}
