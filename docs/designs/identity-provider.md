# Design: Identity Provider Service

**Status:** Draft
**Date:** 2026-04-24

## Overview
The Identity Provider Service is a standalone module responsible for verifying the legal identity of a user (Biometric + Document) via Shufti Pro. It acts as the "source of truth" for a wallet's real-world identity data.

## Objectives
- Offload complex KYC logic to Shufti Pro.
- Standardize identity data (Name, DOB, Nationality) for consumption by other services.
- Provide a persistent, reusable identity proof.

## Data Persistence & Testing (Stubbed Blockchain)
To avoid the cost and time overhead of repeated KYC during development, this service implements a "local file/DB cache" that mimics a blockchain registry.
- **Workflow:** Once a Shufti check is successful, the resulting identity data is written to a local persistent store (e.g., `identity_registry` table in D1).
- **CRUD Operations:** The API supports Creating and Reading these identity records. (Update/Delete are excluded to maintain the integrity of verified proofs).

## API Interface

### `POST /verify/start`
Initiates a new KYC session.
- **Request:** `{ "walletAddress": "string" }`
- **Response:** `{ "sessionId": "string", "verificationUrl": "string" }`

### `POST /verify/webhook`
Receiver for Shufti Pro's signed callbacks.
- **Logic:** Validates the signature, extracts legal data, and persists it to the local registry (stubbed blockchain).
- **Fields Persisted:** `firstName`, `lastName`, `dob`, `documentNumber`, `country`.

### `GET /identity/:wallet`
Retrieves the current verification status for a wallet.
- **Response:** 
  ```json
  {
    "verified": true,
    "identity": {
      "fullName": "JENSEN HUANG",
      "dob": "1963-02-17",
      "country": "US"
    }
  }
  ```

## Implementation Strategy
- **Framework:** Hono (consistent with existing Cloudflare Workers/D1 setup).
- **Storage:** Cloudflare D1 for the "stubbed" identity registry.
- **Security:** Strict SHA-256 HMAC validation on all webhooks.
