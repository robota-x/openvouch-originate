# OpenVouch Originate

A peer-to-peer lending platform for unsecured crypto loans, built on Solana. Borrowers anchor their real-world identity and creditworthiness to their wallets through an open attestation protocol—no oracles, no gatekeeping. Lenders fund loans based on verifiable on-chain claims, from government-backed business registries to biometric identity verification, creating a bridge between crypto primitives and traditional credit signals.

**🌐 Live Demo:** [openvouch-originate.robota.dev](https://openvouch-originate.robota.dev) *(Solana Devnet - Hackathon Demo)*

---

> **⚠️ DISCLAIMER**  
> This is a hackathon project built for demonstration purposes. It is **NOT production-ready** and has not undergone security audits. Do not use with real funds or sensitive data. Smart contracts are deployed on Solana devnet only.

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
│   ├── attestation-identity-service/          # Identity attestation worker
│   ├── attestation-uk-company-service/       # UK Companies House attestation worker
│   ├── lending-website-backend/              # Lending platform backend worker
│   ├── lending-website-frontend/             # Lending platform frontend (Vue 3)
│   └── playground/                            # On-chain interaction playground
├── packages/
│   ├── d1-client/                            # Shared D1 database client
│   ├── idl/                                  # Shared IDL and contract types
│   └── shared-types/                         # Shared TypeScript types
├── Makefile                                  # Developer task runner
└── turbo.json                                # Turborepo pipeline config
```


## Local Development

### Prerequisites

| Tool      | Version | Install                                           |
| --------- | ------- | ------------------------------------------------- |
| Node.js   | ≥22     | https://nodejs.org                                |
| Rust      | ≥1.75   | https://rustup.rs                                 |
| Solana CLI| ≥1.18   | https://docs.solana.com/cli/install-solana-cli-tools |
| Anchor    | ≥1.0    | https://www.anchor-lang.com/docs/installation     |

### Quick Start

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/yourusername/openvouch-originate.git
   cd openvouch-originate
   npm install
   ```

2. **Set up environment files**
   ```bash
   # Frontend - copy example and modify if needed
   cp apps/lending-website-frontend/.env.example apps/lending-website-frontend/.env
   
   # Backend - create .dev.vars with JWT secret
   echo "JWT_SECRET=$(openssl rand -base64 32)" > apps/lending-website-backend/.dev.vars
   ```

3. **Start local Solana validator with deployed programs**
   ```bash
   make localnet
   ```
   This command will:
   - Reset and start a fresh Solana test validator on `localhost:8899`
   - Wipe and re-migrate the local D1 database
   - Build and deploy all Solana programs (attestation + lending contracts)
   - Fund three test wallets with 100 SOL each
   - Copy fresh IDLs to the shared package

4. **Run the full development stack**
   ```bash
   make dev-localchain
   ```
   This starts all services in parallel (frontend + backend workers) configured for localnet with real on-chain transactions.

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8787
   - Identity Service: http://localhost:8789
   - Company Attestation: http://localhost:8788

### Available Make Commands

| Command                | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| `make localnet`        | Bootstrap local Solana validator with programs and funded wallets|
| `make localnet-stop`   | Stop the local validator                                         |
| `make dev-localchain`  | Run backend services against localnet                            |
| `make test`            | Run full test suite across all packages                          |
| `make lint`            | Run linters across the monorepo                                  |

### Testing Locally

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run Solana program tests
cd programs/dblt-lending && anchor test
cd programs/attestation-registry && anchor test

# Run backend tests
cd apps/lending-website-backend && npm test
```

### Funded Test Wallets

The localnet bootstrap automatically funds these wallets with 100 SOL each:
- `9KAQLuUTgJnjuhmPoUUrsS8gVG86pB8e3thW3ZTWSB1r` (demo wallet)
- `vhoYtZGs6KXzwrnb2gw4tZFgxh3ZY2qRiEGEQVFNA6c`
- `EAy5RYr18CmVD52hWJ1RoYemPa6GRpnyQvqPqrD7Bvao`

Connect with any Solana-compatible wallet (Phantom, Solflare) set to localnet to interact with the platform.

### Fixture Mode (Quick Frontend Testing)

For rapid frontend development without running localnet, use fixture mode:

```bash
# Start backend with fixtures (no blockchain required)
cd apps/lending-website-backend && npm run dev

# Start frontend (in separate terminal)
cd apps/lending-website-frontend && npm run dev
```

In fixture mode (`FIXTURES_ENABLED=true`), the backend serves mock data for:
- Pre-populated loan listings with synthetic borrower profiles
- Mock trust scores and attestations
- Simulated transaction responses (no real Solana transactions)

This is useful for UI development, but all blockchain operations are stubbed. Use `make dev-localchain` for full end-to-end testing with real on-chain state.

## Apps & packages

| Name                                     | Description                                                           |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `apps/lending-website-frontend`          | Vue 3 + Vite frontend — wallet-integrated lending platform UI         |
| `apps/lending-website-backend`           | Cloudflare Worker — lending platform backend and profile management   |
| `apps/attestation-identity-service`      | Cloudflare Worker — Identity and biometric verification               |
| `apps/attestation-uk-company-service`    | Cloudflare Worker — UK Companies House verification                   |
| `packages/shared-types`                  | Shared TypeScript types                                               |
| `packages/d1-client`                     | Shared D1 database client and schemas                                 |
| `packages/idl`                           | Shared IDL and contract definitions                                   |

## Deployment

The live demo is deployed using:
- **Frontend**: Cloudflare Pages (static SPA)
- **Backend**: Cloudflare Workers (serverless API + D1 database)
- **Solana Programs**: Devnet (`https://api.devnet.solana.com`)

Deployment is automated via GitHub Actions on push to main.


## Architecture decisions

See [`docs/decisions/`](docs/decisions/) for ADRs covering key design choices. This readme won't contain a list of ADRs.
