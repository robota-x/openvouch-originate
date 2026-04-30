import type { Loan, Profile, AttestationProvider, ProfileLoan } from "../types";
import { ApiError } from "../types";

// ---------------------------------------------------------------------------
// API Base URLs
// ---------------------------------------------------------------------------

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

// ---------------------------------------------------------------------------
// Fetch Helpers
// ---------------------------------------------------------------------------

export async function handleResponse(res: Response, path: string): Promise<Response> {
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

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, init);
  return handleResponse(res, path);
}

// ---------------------------------------------------------------------------
// Backend Client (Loans & Profile)
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

  /** POST /api/loans/initiate — get Base64 TX to create pool. */
  async initiateLoan(
    token: string,
    offer: { amount: string; currency: string; duration: number },
  ): Promise<{ transaction: string }> {
    const res = await apiFetch("/api/loans/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(offer),
    });
    return res.json() as Promise<{ transaction: string }>;
  },

  /** POST /api/loans/finalize — verify signature and save to D1. */
  async finalizeLoan(
    token: string,
    data: {
      signature: string;
      amount: string;
      currency: string;
      duration: number;
      apy: number;
    },
  ): Promise<{ id: string; success: boolean }> {
    const res = await apiFetch("/api/loans/finalize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{ id: string; success: boolean }>;
  },

  /** POST /api/loans/:id/contribute/initiate — get Base64 TX to contribute. */
  async initiateContribution(
    token: string,
    id: string,
    amount: string,
  ): Promise<{ transaction: string }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/contribute/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
    return res.json() as Promise<{ transaction: string }>;
  },

  /** POST /api/loans/:id/contribute/finalize — verify signature and save to D1. */
  async finalizeContribution(
    token: string,
    id: string,
    data: {
      signature: string;
      amount: string;
    },
  ): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/contribute/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{ success: boolean }>;
  },

  /** POST /api/loans/:id/disburse/initiate — get Base64 TX to disburse funds. */
  async initiateDisbursement(
    token: string,
    id: string,
  ): Promise<{ transaction: string }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/disburse/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json() as Promise<{ transaction: string }>;
  },

  /** POST /api/loans/:id/disburse/finalize — verify signature and save to D1. */
  async finalizeDisbursement(
    token: string,
    id: string,
    data: {
      signature: string;
    },
  ): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/disburse/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{ success: boolean }>;
  },

  /** POST /api/loans/:id/repay/initiate — get Base64 TX to repay. */
  async initiateRepayment(
    token: string,
    id: string,
    installmentNumber: number,
    amount: string,
  ): Promise<{ transaction: string }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/repay/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ installmentNumber, amount }),
    });
    return res.json() as Promise<{ transaction: string }>;
  },

  /** POST /api/loans/:id/repay/finalize — verify signature and save to D1. */
  async finalizeRepayment(
    token: string,
    id: string,
    data: {
      signature: string;
      amount: string;
    },
  ): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/repay/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{ success: boolean }>;
  },

  async initiateCancellation(
    token: string,
    id: string,
  ): Promise<{ transaction: string }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/cancel/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json() as Promise<{ transaction: string }>;
  },

  async finalizeCancellation(
    token: string,
    id: string,
    data: { signature: string },
  ): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/cancel/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{ success: boolean }>;
  },

  async initiateTriggerDefault(
    token: string,
    id: string,
  ): Promise<{ transaction: string }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/default/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    return res.json() as Promise<{ transaction: string }>;
  },

  async finalizeTriggerDefault(
    token: string,
    id: string,
    data: { signature: string },
  ): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/loans/${encodeURIComponent(id)}/default/finalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    return res.json() as Promise<{ success: boolean }>;
  },

  async createLoan(
    token: string,
    offer: { amount: string; currency: string; apy: number; duration: number },
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
    patch: Partial<{ amount: string; currency: string; apy: number; duration: number }>,
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
