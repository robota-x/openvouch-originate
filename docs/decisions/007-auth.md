# ADR 007 — Authentication: Solana Wallet Sign-In

**Status:** Accepted  
**Date:** 2026-04-13

---

## Context

The lending platform needs an authentication layer to gate user-specific views (own loan portfolio, own profile) and to act as a conversion funnel when users interact with write-path actions (funding a loan request). All read-only views — marketplace, public borrower profiles, attestation explorer — remain open and do not require authentication.

The platform's smart contracts live on Solana. Lenders and borrowers interact via Solana wallets. Asking users to also hold an Ethereum wallet just for auth would be a UX and security anti-pattern.

---

## Decision

We implement a **challenge-response sign-in flow over Solana's Ed25519 curve**, issue a **stateless HS256 JWT** for subsequent requests, and store the token **in-memory via Pinia** (no localStorage). Wallet detection uses the **Wallet Standard** specification.

---

## Alternatives Considered and Rejected

### EVM secp256k1 (`personal_sign`) + MetaMask

The lending contracts are Solana-native. Introducing a MetaMask dependency just for auth would require users to manage two separate wallets and two separate signing flows, with no benefit to the actual product. Rejected outright: wrong curve for this chain.

### `@solana/wallet-adapter`

The de-facto standard for Solana wallet integration, but it bundles adapters for every wallet (Phantom, Solflare, Slope, Glow, …), most of which are unused, adding ~200 KB of dependencies. Phantom, Backpack, and Solflare all implement the **Wallet Standard** natively. Using `@wallet-standard/app` instead reduces the dependency surface to a tiny (~4 KB) wallet-agnostic registry with no wallet-specific code and forward-compatible with any wallet that adopts the spec.

### `@solana/web3.js` signature verification

Works, but the package is large (~350 KB), Solana-specific, and regularly targeted by supply-chain attacks (see the December 2024 publish-access compromise of `@solana/web3.js`). We only need Ed25519 verification — not a full RPC client.

---

## Library Choices

### `@noble/ed25519` (backend signature verification)

- Zero dependencies.
- Audited by Cure53.
- Not Solana-specific: operates on raw Ed25519 key bytes and signatures, making it resilient to crypto-ecosystem supply-chain risk.
- Async `verify()` delegates to `globalThis.crypto.subtle`, which is available in both Node.js 22+ and Cloudflare Workers (with `nodejs_compat` flag).
- **Why not a Solana-native lib?** Crypto supply-chain attacks specifically target well-known Solana packages (see above). A generic, non-ecosystem-specific Ed25519 library carries a much smaller attack surface.

### `jose` (JWT signing and verification)

- Zero dependencies; uses Web Crypto natively.
- Compatible with Cloudflare Workers without polyfills.
- Reviewed and maintained by Filip Skokan; widely deployed outside the crypto ecosystem.
- **Why not `jsonwebtoken`?** Requires `crypto` Node built-in via CJS; not compatible with CF Workers without a bundle shim.

### `bs58` (Solana address decoding)

- ~6 KB, zero dependencies.
- Solana addresses are base58-encoded 32-byte Ed25519 public keys. `bs58.decode(address)` gives the raw bytes needed for `@noble/ed25519`.
- Not Solana-specific: a pure base58 codec.

### `@wallet-standard/app` (frontend wallet detection)

- Tiny (~4 KB) wallet-agnostic registry.
- Phantom, Backpack, and Solflare inject wallet objects conforming to this standard on page load.
- `getWallets().get()` returns all detected wallets; no wallet-specific adapter code needed.
- Filtering by `w.chains.some(c => c.startsWith('solana:'))` limits to Solana wallets.

### `pinia` (frontend session state)

- Vue 3's recommended state management; composition API, TypeScript-native.
- Session token stored in reactive Pinia store (not `localStorage`): no XSS surface.
- Token is lost on page refresh — intentional. The JWT has a 7-day lifetime; re-signing is instant (one click, no password).

---

## Authentication Flow

```
Frontend                        Backend (CF Worker)
   |                                    |
   |-- GET /api/auth/challenge -------> |
   |                                    | INSERT nonce (TTL: 5 min)
   |<-- { nonce } --------------------- |
   |                                    |
   | wallet.signMessage(                |
   |   "Sign this message to            |
   |    authenticate with               |
   |    OpenVouch Originate.\n\n        |
   |    Nonce: <uuid>"                  |
   | )                                  |
   |                                    |
   |-- POST /api/auth/verify ---------->|
   |   { address, signature }           | bs58.decode(address) → pubkey bytes
   |                                    | ed25519.verify(sig, msg, pubkey)
   |                                    | DELETE nonce (one-time use)
   |                                    | SignJWT({ sub: address }, 7d)
   |<-- { token } --------------------- |
   |                                    |
   | Pinia: address = ..., token = ...  |
```

The signing message is canonical and must match exactly on both sides:

```
Sign this message to authenticate with OpenVouch Originate.

Nonce: <uuid>
```

The two `\n` characters (blank line between sentence and nonce) are literal newlines. Phantom displays this to the user before signing.

---

## JWT Design

| Property | Value | Rationale |
|---|---|---|
| Algorithm | HS256 | Symmetric; CF Workers have the secret; no asymmetric key distribution needed |
| Expiry | 7 days | Long enough to avoid friction; short enough to limit exposure |
| Storage | Pinia in-memory | No XSS risk vs localStorage; acceptable UX (instant re-sign) |
| Revocation | None (stateless) | `DELETE /session` is a 204 no-op — clients discard the token. A D1 denylist can be added if forced-logout (e.g. account compromise) becomes a requirement. This is explicitly deferred. |

---

## Auth as a Conversion Funnel

Authentication is **not a security boundary** for marketplace reads or on-chain actions. A non-authenticated user could fund a loan directly on-chain by submitting a transaction themselves. The auth intercepts in the frontend (clicking "Fund" while disconnected, navigating to `/my-profile`) exist to **drive wallet adoption and capture user intent** — turning passive browsers into connected participants. This is a product funnel decision, not a security requirement. Comments in `MarketplacePage.vue` and `AppNav.vue` document this explicitly so future contributors do not mistake it for a security gate.

---

## Protected Routes

Only two routes require authentication:

| Route | Guard |
|---|---|
| `/my-loans` | `meta: { requiresAuth: true }` → redirect to `/login` |
| `/my-profile` | Redirect to `/profile/:address`; falls back to `/login` if no session |

All other routes (marketplace, public profiles, attestation explorer, landing page) are public.

---

## Session Secret Management

`JWT_SECRET` must be at least 32 random characters. For Cloudflare Workers it must be set as a secret (not a plain env var) to avoid it appearing in `wrangler.toml`:

```bash
wrangler secret put JWT_SECRET --config wrangler.production.jsonc
```

The backend reads it via `env.JWT_SECRET` in the Workers entry point. In tests, a hardcoded 32-char string is used; the session plugin gracefully returns `401` when no secret is configured (development without D1).

---

## Consequences

- **Positive**: No passwords, no OAuth flow, no third-party identity provider. Users authenticate with the same key they use to transact — one identity for everything.
- **Positive**: Zero Solana-ecosystem dependencies on the auth critical path (verification uses generic Ed25519 + base58).
- **Negative**: Token lost on page refresh; user must re-sign. Acceptable given the 7-day JWT lifetime and the instant signing UX.
- **Negative**: No forced-logout / revocation without a denylist. Deferred — acceptable for hackathon scope.
- **Negative**: Wallet Standard requires a modern browser with an installed Solana wallet extension. Mobile deep-link and WalletConnect support are out of scope for this phase.
