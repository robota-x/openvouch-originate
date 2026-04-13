# ADR 005 — Chain data layer

**Status:** Accepted
**Date:** 2026-04-13

## Context

OpenVouch Originate records two kinds of events on Solana:

- **Attestation events** — third-party institutions (KYC providers, auditors, credit bureaus) sign claims against a borrower's identity. Each claim is a transaction on the attestation program, appended to the borrower's attestation account.
- **Loan lifecycle events** — disbursement, repayment, and default are recorded on-chain via the loan program, tied to both borrower and lender.

The frontend needs to display this history per identity: attestations on the profile page, loan history on the portfolio page. The question is where to read it from.

## On-chain structure

Each identity has two program-derived accounts (PDAs):

```
attestation PDA  =  hash(borrower_pubkey || "attestation" || program_id)
loan PDA         =  hash(borrower_pubkey || "loan"        || program_id)
```

Reading the history for an identity means fetching the transaction log for each of these two known accounts via `getSignaturesForAddress(pda)` followed by individual transaction fetches and Anchor event deserialization. This is a bounded, identity-scoped read — not a program-wide account scan.

The matchmaking layer (open loan requests, lender marketplace) is **entirely off-chain**. The website is the matchmaking engine. On-chain records are the audit trail, not the primary data store for discovery.

## Decision

### The backend owns all chain reads

The frontend never calls Solana RPC directly. All chain data is fetched, cached, and served by the backend via the existing REST API surface:

```
GET /api/profile/:address          → Profile (attestations + loan history)
GET /api/loans/open                → Loan[]  (off-chain matchmaking data)
GET /api/attestation-providers     → AttestationProvider[]
```

### Why not read from the frontend

**Immutable history is a perfect cache.** A confirmed Solana transaction is final and never changes. The backend fetches each transaction once, stores it, and never fetches it again. A frontend does this work cold on every page load, paying full RPC latency each time.

**`getSignaturesForAddress` is feasible, but still suboptimal from a browser.** Unlike `getProgramAccounts` (which scans all program accounts and is typically disabled on public RPC nodes), reading signatures for a specific known account is allowed. But it requires N+1 calls — one for the signature list, then one per transaction — and each call adds browser-to-RPC round-trip latency. The backend amortises this to a single HTTP call from the frontend's perspective.

**RPC credentials stay server-side.** Paid RPC endpoints (Helius, QuickNode, Triton) require API keys. These must not appear in browser JavaScript. The backend is the single RPC client; swapping providers is a backend config change, not a frontend deploy.

**Derived fields require aggregation.** Trust score and repayment rate are computed across the full event history of both PDAs. This is server-side work regardless; the backend already owns it.

### Caching strategy

Past transactions are immutable — they can be cached indefinitely. The backend should:

1. On the first request for an unknown address, fetch the full signature history for both PDAs and store every transaction.
2. On subsequent requests, return from cache immediately.
3. Use Helius (or equivalent) webhooks registered on both PDAs to receive new events in real time. New transactions are appended to the cache; no polling required.

This means profile and loan history reads are fast even for addresses with long histories, because the expensive RPC work happens once at first access (or on webhook push), not per request.

### Off-chain matchmaking data

Open loan requests are stored and served by the backend directly — they are not derived from chain reads. When a lender funds a loan, the backend records the match and initiates the on-chain disbursement transaction. The on-chain record is the settlement and audit trail; the backend is the source of truth for the pre-settlement state.

## Consequences

- The backend must implement a transaction cache keyed by wallet address and PDA.
- The backend must register Helius webhooks on the attestation and loan PDAs for any address it has seen, so new events are pushed rather than polled.
- The frontend's existing `backendClient` interface (`getProfile`, `getOpenRequests`, `getAttestationProviders`) requires no changes — only the backend implementation behind it changes.
- If a new address is requested that has no cached data, the first response will be slower (cold fetch). This is acceptable; it only happens once per identity.
- ADR 004 noted that the Dockerfile strategy would need revisiting if `shared-types` became a dependency of the backend. This is now moot: the backend deploys as a Cloudflare Worker (see deployment config), not a container.
