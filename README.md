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

## Prerequisites

| Tool      | Version | Install                                           |
| --------- | ------- | ------------------------------------------------- |
| Node.js   | 22 LTS  | https://nodejs.org                                |
| npm       | 10+     | Bundled with Node 22                              |
| Java      | 21 LTS  | https://adoptium.net                              |
| Terraform | >= 1.9  | https://developer.hashicorp.com/terraform/install |
| Docker    | latest  | https://docs.docker.com/get-docker/               |

## Getting started

```bash
git clone <repo-url> defi-hack
cd defi-hack
npm install
make dev
```

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

## Infrastructure

Terraform configuration targets **Google Cloud Platform** (`europe-west2` by default). Resources are not yet defined — see `infra/terraform/main.tf`.

Before applying, configure a GCS backend by uncommenting the `backend "gcs"` block in `infra/terraform/terraform.tf` and setting your state bucket.

```bash
make deploy-infra
```

## CI/CD

| Workflow            | Trigger                  | Action                                    |
| ------------------- | ------------------------ | ----------------------------------------- |
| `ci.yml`            | PR or push to `main`     | lint → test → build + Docker image verify |
| `cd-staging.yml`    | CI passes on `main`      | build → deploy to staging                 |
| `cd-production.yml` | GitHub release published | build → deploy to production              |

## Testing

```bash
npm run test
```

Runs `npm run test` via Turborepo, which runs Vitest in each package.

## Architecture decisions

See [`docs/decisions/`](docs/decisions/) for ADRs covering key design choices. This readme won't contain a list of ADRs.
