# defi-hack

A DeFi project built around a **general-purpose on-chain attestation framework** and a lending platform that consumes it.

## Project overview

### Attestation framework (core)

The attestation framework is the primary component. It is fully on-chain and distributed — smart contracts record attestations about real-world entities and facts without acting as an oracle. The framework is deliberately general-purpose, designed to foster an ecosystem analogous to the KYC, AML, auditing, and accounting ecosystems in traditional finance. Examples of what the ecosystem can express:

- A lender registering a lending smart contract and its current status
- An identity provider (e.g. Onfido) attesting to the real-world identity behind a wallet address
- An auditor attesting that the accounts of an entity are accurate and GAAP-compliant
- Any third party publishing structured, verifiable claims against an on-chain identity

The framework does not own or validate the data — it provides the substrate for third parties to publish and consumers to query attestations trustlessly.

### Lending platform (product layer)

The lending platform sits on top of the attestation framework and is the primary end-user product. It:

1. Presents a GUI and wallet-integrated interface for interacting with attestations and lending contracts
2. Links lending smart contracts to the attestation framework so lenders can gate terms on verified claims

### UK Companies House demo (third-party POC)

`apps/gov-uk-company-attestation-demo-app` is a standalone proof-of-concept showing what a third-party attestation provider can look like. It ingests UK Companies House data and issues attestations against wallet-linked company identities. It is **not** a core dependency — it illustrates the open ecosystem model.

## Repo structure

```
.
├── apps/
│   ├── gov-uk-company-attestation-demo-app/   # POC: third-party attestation provider using UK Companies House
│   ├── lending-api/                            # Lending platform API (Node/TypeScript)
│   └── web/                                   # Lending platform frontend (Vue 3)
├── contracts/                                  # Attestation framework + lending smart contracts (deferred)
├── docs/
│   └── decisions/                             # Architecture Decision Records
├── infra/
│   └── terraform/                             # GCP infrastructure (Terraform)
├── packages/
│   └── shared-types/                          # Shared TypeScript types
├── Makefile                                   # Developer task runner
└── turbo.json                                 # Turborepo pipeline config
```

## Prerequisites

| Tool        | Version | Install                           |
|-------------|---------|-----------------------------------|
| Node.js     | 22 LTS  | https://nodejs.org                |
| npm         | 10+     | Bundled with Node 22              |
| Wrangler    | 3+      | `npm install -g wrangler`         |

## Getting started

```bash
git clone <repo-url> defi-hack
cd defi-hack
npm install

# Backend — copy env template and start wrangler dev (port 8787)
cp apps/lending-website-backend/.dev.vars.example apps/lending-website-backend/.dev.vars
cd apps/lending-website-backend && npm run db:migrate:local && npm run dev

# Frontend — copy env template and start Vite dev (port 5173)
cp apps/lending-website-frontend/.env.example apps/lending-website-frontend/.env
cd apps/lending-website-frontend && npm run dev
```

## Apps & packages

| Name                              | Description                                                           |
|-----------------------------------|-----------------------------------------------------------------------|
| `apps/lending-website-frontend`   | Vue 3 + Vite frontend — wallet-integrated lending platform UI         |
| `apps/lending-website-backend`    | Hono API on Cloudflare Workers — lending platform backend + D1 store  |
| `contracts/`                      | On-chain attestation framework + lending contracts (deferred)         |

## Environment files

The two apps use different env file conventions because they run on different runtimes.

**Frontend** (`apps/lending-website-frontend`) uses the standard Vite / dotenv convention:

```
.env.example   ← committed, documents required vars
.env           ← gitignored, your local copy
```

Values are read by Vite at build time and exposed as `import.meta.env.*`.

**Backend** (`apps/lending-website-backend`) runs inside a Cloudflare Workers runtime
simulation (`wrangler dev` / workerd) — not a Node.js process. There is no `process.env`,
so the `.env` / dotenv convention does not apply. Wrangler uses `.dev.vars` instead:

```
.dev.vars.example   ← committed, documents required vars
.dev.vars           ← gitignored, your local copy
```

Values are injected directly into the CF Workers env object and accessed as `c.env.*`
in handlers. In staging/production, secrets are set with `wrangler secret put <KEY>`.

## Testing

```bash
npm test   # runs Vitest in all packages via Turborepo
```

- `apps/lending-website-backend` — Vitest, uses `app.request()` (no port bound)
- `apps/lending-website-frontend` — Vitest happy-dom environment, uses `@vue/test-utils`

## Architecture decisions

See [`docs/decisions/`](docs/decisions/) for ADRs covering key design choices. This readme won't contain a list of ADRs.
