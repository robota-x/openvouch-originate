# Design: Company Attestation Service Refactor

**Status:** Draft
**Date:** 2026-04-24

## Overview
This refactor replaces the legacy Email OTP verification flow in the Company Attestation Service (formerly `attestation-service`) with a robust cross-reference check against the **Identity Provider Service**.

## Refined Flow

### 1. Discovery (Pre-Verification)
- **Input:** User provides a Company Number.
- **Action:** Query Companies House API.
- **Logic:** Filter for active directors only. Check `resigned_on` dates against the current date (April 2026).
- **Presentation:** Display a list of current, active directors to the user.

### 2. Attestation Request
- **Input:** `company_id` and the `full_name` of the director the user claims to be.
- **Step 1: Fresh Validation:** Re-verify the director's active status with the registry.
- **Step 2: Identity Linkage:** The service calls the **Identity Provider API** (`GET /identity/:wallet`).
- **Step 3: Verification Check:**
  - If the wallet has no verified identity, the user is redirected to the Identity Provider's KYC flow.
  - If a verified identity exists, the service proceeds to cross-referencing.

### 3. Cross-Referencing Logic
The service performs an intersection check between the **Identity Provider Data** and the **Registry Data**:
- **Name Match:** Fuzzy comparison between the Shufti-extracted name and the CoHouse director name.
- **DOB Match:** Intersection between the full DOB from Shufti and the partial DOB (Month/Year) from CoHouse.
- **Status Match:** Ensure no `resigned_on` date exists for that specific director record in the current registry state.

## Integration Path

### Phase 1: Service-to-Service API (Current)
The Company Attestation Service makes HTTP calls to the Identity Provider Service's API to fetch verified identities.

### Phase 2: On-Chain Registry (Future)
The Identity Provider Service will write attestations directly to a Solana smart contract. The Company Attestation Service will be updated to read these identity proofs directly from the blockchain via RPC, removing the need for a direct backend-to-backend dependency.

## Impact on Legacy Code
- **Removal:** `services/otp.ts`, `routes/verify/email-confirm` and all associated email template logic.
- **Update:** `routes/verify/start` and `routes/verify/sign` are consolidated into a single "Claim & Verify" logic flow.
