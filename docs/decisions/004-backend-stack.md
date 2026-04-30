# ADR 004 — Backend stack

**Status:** Superseded by Cloudflare Workers Migration
**Date:** 2026-04-06 (Updated 2026-04-29)

## Context

The original backend was designed as a Node.js Fastify API. This has been replaced by a **Cloudflare Workers** architecture to leverage global low latency and atomic D1 database integration.

## Decisions

### 1. Cloudflare Workers (Hono)
Instead of Fastify, we use **Hono**. 
- **Reason:** Hono is specifically optimized for Edge runtimes (Workers, Bun, Deno) while maintaining a Fastify-like middleware and routing experience.
- **Typed by default:** Full TypeScript support for context and environment.

### 2. No-Custody Blockchain Bridging
The backend serves as a **Transaction Builder**, not a signer.
- **Reason:** To maintain non-custodial principles, the backend constructs and serializes transactions (using `@solana/web3.js` and `@coral-xyz/anchor`) and returns them as Base64 strings to the frontend.
- **Security:** Private keys never touch the backend. The user's wallet is the only entity that signs.

### 3. Native Web APIs vs Node.js Polyfills
We prioritize Native Web APIs (Web Crypto, TextEncoder, Uint8Array) over Node.js built-ins (`Buffer`, `crypto`).
- **Buffer Strategy:** 
    - **External SDKs:** We use `nodejs_compat` in `wrangler.jsonc` to provide polyfills for third-party libraries (like Anchor) that internally rely on `Buffer`.
    - **Internal Logic:** Our direct calls (PDA derivation, seed encoding) use `new TextEncoder().encode()` and `publicKey.toBytes()` to remain compatible with pure Web environments and minimize polyfill overhead.

### 4. D1 Database (Drizzle ORM)
Instead of a traditional SQL server, we use Cloudflare D1.
- **ORM:** Drizzle ORM provides a type-safe interface for D1 with zero-overhead migrations.

## Consequences

- The `Dockerfile` and `Fastify` references are deprecated.
- All backend services must respect Worker memory (128MB) and CPU limits.
- The `BlockchainService` must be "Dummy Wallet" aware to satisfy Anchor without requiring a filesystem (`fs`) for keypairs.
