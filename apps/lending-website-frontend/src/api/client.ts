import type { Loan, Profile, AttestationProvider, ProfileLoan } from "../types";
import { ApiError } from "../types";

// ---------------------------------------------------------------------------
// API Base URLs
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
const IDENTITY_API_BASE =
  (import.meta.env.VITE_IDENTITY_API_BASE_URL as string | undefined) ?? '/identity-api'
const ATTESTATION_API_BASE =
  (import.meta.env.VITE_ATTESTATION_API_BASE_URL as string | undefined) ?? '/attestation-api'

// ---------------------------------------------------------------------------
// Fetch Helpers
// ---------------------------------------------------------------------------

async function handleResponse(res: Response, path: string): Promise<Response> {
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

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, init);
  return handleResponse(res, path);
}

async function identityFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${IDENTITY_API_BASE}${path}`, init);
  return handleResponse(res, path);
}

async function attestationFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${ATTESTATION_API_BASE}${path}`, init);
  return handleResponse(res, path);
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export const backendClient = {
  // ── Public Data ──────────────────────────────────────────────────────────

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

  // ── Loans (Authenticated) ─────────────────────────────────────────────────

  async createLoan(
    token: string,
    offer: { amount: number; currency: string; apy: number; duration: number },
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
    patch: Partial<{ amount: number; currency: string; apy: number; duration: number }>,
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
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async notifyFund(token: string, id: string): Promise<void> {
    await apiFetch(`/api/loans/${encodeURIComponent(id)}/fund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  // ── Auth ──────────────────────────────────────────────────────────────────

  async challenge(address: string): Promise<{ nonce: string }> {
    const res = await apiFetch("/api/auth/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });
    return res.json() as Promise<{ nonce: string }>;
  },

  async verify(address: string, nonce: string, signature: string): Promise<{ token: string }> {
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
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async me(token: string): Promise<{ address: string }> {
    const res = await apiFetch("/api/auth/me", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json() as Promise<{ address: string }>;
  },
};

export interface IdentityResponse {
  verified: boolean;
  identity?: {
    fullName: string;
    dob: string;
    country: string;
    verifiedAt: number;
  };
}

export interface CompanyStatusResponse {
  verified: boolean;
  companyNumber?: string;
  companyName?: string;
  directorName?: string;
  attestationAddress?: string;
  issuedAt?: number;
  expiresAt?: number;
  reason?: string;
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
    });
    return res.json() as Promise<{ sessionId: string; verificationUrl: string }>;
  },

  async completeVerification(input: {
    sessionId: string;
    walletAddress: string;
    fullName: string;
    dob?: string;
    country?: string;
  }): Promise<{ success: boolean; verified: boolean }> {
    const res = await identityFetch('/verify/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json() as Promise<{ success: boolean; verified: boolean }>;
  },

  async getIdentity(walletAddress: string): Promise<IdentityResponse> {
    // Note: direct fetch to IDENTITY_API_BASE to match existing handling of 404
    const res = await fetch(`${IDENTITY_API_BASE}/identity/${encodeURIComponent(walletAddress)}`);
    if (res.status === 404) return { verified: false };
    const data = await handleResponse(res, `/identity/${walletAddress}`).then(r => r.json());
    return data as IdentityResponse;
  },
};

type Director = {
  name: string;
  role: string;
  appointedOn: string;
  dob?: string;
  country?: string;
};

type CompanyLookup = {
  companyNumber: string;
  name: string;
  status: string;
  registeredOfficeAddress: Record<string, string>;
  directors: Director[];
};

export const attestationClient = {
  async getCompany(companyNumber: string): Promise<CompanyLookup> {
    const res = await attestationFetch(`/api/company/${encodeURIComponent(companyNumber)}`);
    return res.json() as Promise<CompanyLookup>;
  },

  async startVerificationSession(input: {
    walletAddress: string;
    companyNumber: string;
    directorName: string;
  }): Promise<{
    sessionId: string;
    challengeMessage: string;
    companyName: string;
    verifiedIdentity: string;
  }> {
    const res = await attestationFetch('/api/verify/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    return res.json() as Promise<{
      sessionId: string;
      challengeMessage: string;
      companyName: string;
      verifiedIdentity: string;
    }>;
  },

  async completeVerificationSession(sessionId: string): Promise<{
    success: boolean;
    attestationAddress: string;
    companyName: string;
    expiresAt: number;
  }> {
    const res = await attestationFetch('/api/verify/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    return res.json() as Promise<{
      success: boolean;
      attestationAddress: string;
      companyName: string;
      expiresAt: number;
    }>;
  },

  async getStatus(walletAddress: string): Promise<CompanyStatusResponse> {
    // Note: direct fetch to ATTESTATION_API_BASE to match direct status lookup
    const res = await fetch(`${ATTESTATION_API_BASE}/api/verify/status/${encodeURIComponent(walletAddress)}`);
    if (res.status === 404) return { verified: false };
    const data = await handleResponse(res, `/api/verify/status/${walletAddress}`).then(r => r.json());
    return data as CompanyStatusResponse;
  },
};
