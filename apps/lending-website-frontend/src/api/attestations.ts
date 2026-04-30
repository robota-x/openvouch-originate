import { handleResponse } from "./loans";

// ---------------------------------------------------------------------------
// API Base URLs
// ---------------------------------------------------------------------------

const IDENTITY_API_BASE =
  (import.meta.env.VITE_IDENTITY_API_BASE_URL as string | undefined) ?? "/identity-api";
const ATTESTATION_API_BASE =
  (import.meta.env.VITE_ATTESTATION_API_BASE_URL as string | undefined) ?? "/attestation-api";

// ---------------------------------------------------------------------------
// Fetch Helpers
// ---------------------------------------------------------------------------

async function identityFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${IDENTITY_API_BASE}${path}`, init);
  return handleResponse(res, path);
}

async function attestationFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${ATTESTATION_API_BASE}${path}`, init);
  return handleResponse(res, path);
}

// ---------------------------------------------------------------------------
// Types & Interface
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Identity & Attestation Clients
// ---------------------------------------------------------------------------

export const identityClient = {
  async startVerification(
    walletAddress: string,
    redirectUrl?: string,
    prefill?: { fullName?: string; dob?: string; country?: string },
  ): Promise<{ sessionId: string; verificationUrl: string }> {
    const res = await identityFetch("/verify/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const res = await identityFetch("/verify/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json() as Promise<{ success: boolean; verified: boolean }>;
  },

  async getIdentity(walletAddress: string): Promise<IdentityResponse> {
    const res = await fetch(`${IDENTITY_API_BASE}/identity/${encodeURIComponent(walletAddress)}`);
    if (res.status === 404) return { verified: false };
    const data = await handleResponse(res, `/identity/${walletAddress}`).then((r) => r.json());
    return data as IdentityResponse;
  },
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
    const res = await attestationFetch("/api/verify/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const res = await attestationFetch("/api/verify/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(
      `${ATTESTATION_API_BASE}/api/verify/status/${encodeURIComponent(walletAddress)}`,
    );
    if (res.status === 404) return { verified: false };
    const data = await handleResponse(res, `/api/verify/status/${walletAddress}`).then((r) => r.json());
    return data as CompanyStatusResponse;
  },
};
