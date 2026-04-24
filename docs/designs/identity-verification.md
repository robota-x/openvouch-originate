# Identity Verification Design Brief

**Status:** Draft
**Date:** 2026-04-24

## Context

We are transitioning from a trust-based email OTP verification to a robust "identity-first" model using Shufti Pro. This ensures that the wallet owner is a verified human whose legal identity matches the official registry data (Companies House) for a specific company director.

## Architectural Goal

Decouple **Legal Identity** (Biometric/Document) from **Registry Attestation** (Company Ownership).
- **Identity Service:** A standalone service/module that verifies a human and issues a "Verified Identity" (Name, DOB, Nationality).
- **Attestation Service:** Consumes a "Verified Identity" and cross-references it with external registries to prove a claim (e.g., "I am the director of X").

In the future, the Identity Attestation should be a reusable primitive on the blockchain, allowing the Attestation Service to simply read existing proof of identity rather than re-triggering KYC.

## The Verification Flow

### 1. Discovery (Pre-Verification)
- **Action:** User provides a Company Number.
- **Lookup:** System queries Companies House API.
- **Logic:** 
  - Filter for **Active** directors only. 
  - **Time Awareness:** Check `resigned_on` dates against the current date (e.g., April 2026). If a director resigned before the current date, they are excluded.
- **Result:** Display a list of valid, current directors to the user.

### 2. Request Initiation
- **Action:** User selects their name from the list (or provides it) and submits the `company_id` + `full_name`.
- **Backend Validation:** The backend performs a fresh lookup against the GovUK API to ensure the selected director is still valid and active at the moment of request.
- **Offload:** If validated, the backend creates a Shufti Pro verification session.

### 3. Identity Verification (Shufti Pro)
- **User Action:** User is redirected to Shufti’s hosted UI for document (Passport/ID) and facial biometric scanning.
- **Backend Action:** Backend waits for a signed webhook (Callback) from Shufti Pro.

### 4. Cross-Reference & Final Attestation
- **Matching Logic:** Once Shufti confirms the identity, the backend compares the **Extracted Identity** (from Shufti) with the **Registry Data** (from GovUK):
  - **Full Name:** Fuzzy matching between the document name and the director list.
  - **Date of Birth:** Intersection check. GovUK provides Month/Year; Shufti provides Full DOB. The Month/Year must match exactly.
- **Issuance:** If all checks pass, a "Company Director Attestation" is issued to the wallet.

## API & Service Interface

### Identity Provider (Abstraction)
The implementation should be modular to allow swapping Shufti Pro for other providers or on-chain credentials.
- `initiate(walletAddress, userMetadata)`: Returns the redirect URL.
- `handleCallback(rawBody, signature)`: Validates authenticity and updates the identity state.
- `getVerifiedIdentity(walletAddress)`: Standardized return of `{ firstName, lastName, dob, documentCountry, status }`.

### Attestation Logic
- Consumes `getVerifiedIdentity(wallet)`.
- Implements registry-specific matching rules (e.g., GovUK's specific name formatting and birth date partial masks).

## Security Considerations
- **Signature Verification:** All callbacks from Shufti must be strictly validated using the SHA-256 HMAC scheme.
- **Data Integrity:** Identity data used for matching must come from the provider's verified output, never from user input during the KYC phase.
- **Privacy:** Minimize storage of PII. Rely on attestation proofs where possible, storing only the necessary metadata for the claim.
