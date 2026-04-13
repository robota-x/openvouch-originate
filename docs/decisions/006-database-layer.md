# ADR 006 — Database layer

**Status:** Accepted
**Date:** 2026-04-13

## Context

The backend needs off-chain storage for three categories of data:

- **Loan listings** — borrower-created open requests; queryable by up to 8 filter parameters (APY, amount, duration, trust score, attestation count, repayment rate)
- **Off-chain profile fields** — per-wallet data not derivable from the chain (e.g. display nickname)
- **Auth nonces** — short-lived challenge tokens for Solana wallet sign-in

The backend deploys as a Cloudflare Worker. Two storage options were evaluated.

## Options considered

### Cloudflare KV

KV is an edge key-value cache. Reads are served from the nearest Cloudflare PoP. It has no query capability — lookup by key only. The free write quota (1K/day) is extremely tight for a backend API. KV would require fetching all loan listings into Worker memory and filtering in code on every request, which degrades as data grows.

KV is not suitable as a primary database for this use case. It remains a candidate for a future caching layer; deferred to YAGNI.

### Cloudflare D1

D1 is a SQLite database native to Cloudflare Workers. It supports SQL queries, compound `WHERE` clauses, and transactions. It integrates directly via `wrangler` with no GCP egress, no additional auth layer, and the same deployment model already in use.

## Decisions

### D1 as the primary database

D1 is chosen for all off-chain storage. The loan listing filter query — up to 8 optional `WHERE` clauses — maps directly to SQL. The same `wrangler` CLI and `CLOUDFLARE_API_TOKEN` already used for Worker deployment handles database creation and migration.

Two databases are maintained: one per environment (`openvouch-originate-db-staging`, `openvouch-originate-db-production`). The binding name `DB` is identical in both wrangler configs so Worker code is environment-agnostic.

### Drizzle ORM for schema and queries

Raw D1 requires manually building parameterised SQL strings for dynamic queries. The loan listing filter with 8 optional conditions is the specific case where this becomes error-prone:

```ts
// Raw SQL — clause order and param array must stay in sync manually
const clauses: string[] = ['status = ?']
const params: unknown[]  = ['open']
if (q.minApy !== undefined) { clauses.push('apy >= ?'); params.push(q.minApy) }
// ... 7 more conditions
```

Drizzle's query builder produces the same SQL but keeps conditions as typed expressions:

```ts
const conditions = [eq(loans.status, 'open')]
if (q.minApy !== undefined) conditions.push(gte(loans.apy, q.minApy))
```

The secondary benefit is that `src/db/schema.ts` becomes the single source of truth for column names and types. Route handler return types are derived from the schema automatically — no parallel type maintenance.

Drizzle's production bundle for a Worker is ~40–50KB (tree-shakeable, no runtime engine). Wrangler applies migration files; Drizzle never connects to D1 directly.

### Migration workflow

`drizzle-kit generate` diffs `src/db/schema.ts` against the previous state and emits a `.sql` file into `migrations/`. Wrangler reads that directory and tracks applied migrations in a `d1_migrations` table inside D1.

```
Edit src/db/schema.ts
  → npm run db:generate        (drizzle-kit produces migrations/<N>_<name>.sql)
  → npm run db:migrate:staging (wrangler applies pending files to staging D1)
  → npm run db:migrate:production
```

In CI, the migrate step runs inside the `deploy` job — after lint, test, and build pass, and before the backend Worker deploys. This guarantees the schema is ready before the new code goes live. There is no atomic migrate+deploy command in wrangler; the two steps are explicit and sequential.

### KV deferred

No KV bindings are added at this time. The chain data cache (per-wallet transaction history) is the most natural future use case for KV, given that confirmed Solana transactions are immutable. That decision is deferred until caching is an observed need.

## Consequences

- Running `wrangler d1 create openvouch-originate-db-staging` and `wrangler d1 create openvouch-originate-db-production` is a one-time manual step; the returned `database_id` values must be pasted into the wrangler configs.
- All schema changes go through `db:generate` + commit + CI migration, not direct SQL edits.
- Route handlers access the database via `env.DB` (the D1 binding), wrapped with `drizzle(env.DB)` from `drizzle-orm/d1`.
- `src/db/schema.ts` is the authoritative definition of the data model. TypeScript types for query results derive from it automatically.
