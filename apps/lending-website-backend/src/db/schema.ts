// Drizzle schema — define tables here.
// After changes: npm run db:generate  →  produces a migration file in migrations/
// Then apply:    npm run db:migrate:local / db:migrate:staging / db:migrate:production

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

/** One-time challenge nonces issued during wallet auth. Replaced on re-challenge. */
export const authNonces = sqliteTable('auth_nonces', {
  address:   text('address').primaryKey(),
  nonce:     text('nonce').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
})

/**
 * Public borrower/lender profiles, keyed by wallet address.
 *
 * Lifecycle: created automatically on first successful wallet login (POST /api/auth/verify).
 * No POST endpoint — use PATCH /api/profiles/:address to update user-editable fields.
 *
 * trustScore is platform-computed only. It is never accepted from external input.
 * updatedAt is set server-side on every write. Neither field is user-settable via the API.
 */
export const profiles = sqliteTable('profiles', {
  address:    text('address').primaryKey(),
  nickname:   text('nickname'),
  trustScore: integer('trust_score'),
  createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:  integer('updated_at', { mode: 'timestamp' }).notNull(),
})

/** Registered third-party attestation providers. Static registry, not user-mutable. */
export const attestationProviders = sqliteTable('attestation_providers', {
  id:          text('id').primaryKey(),
  name:        text('name').notNull(),
  wallet:      text('wallet').notNull(),
  website:     text('website').notNull(),
  claimUrl:    text('claim_url').notNull(),
  description: text('description').notNull(),
})

/**
 * Per-profile attestation claims.
 * metadata is stored as a JSON string (Record<string, string>).
 * verified uses integer mode boolean (0/1).
 */
export const attestations = sqliteTable('attestations', {
  id:         text('id').primaryKey(),  // `${address}-${providerId}` or a UUID for multiples
  address:    text('address').notNull(),
  providerId: text('provider_id').notNull(),
  icon:       text('icon').notNull(),
  title:      text('title').notNull(),
  status:     text('status').notNull(),
  verified:   integer('verified', { mode: 'boolean' }).notNull().default(true),
  issuedAt:   text('issued_at').notNull(),
  onChainRef: text('on_chain_ref'),
  metadata:   text('metadata'),  // JSON string: Record<string, string>
})

/**
 * Off-chain loan listing records. On-chain settlement referenced via on_chain_ref.
 *
 * Status lifecycle: open → active → repaid | defaulted
 *   open      — borrower's offer, not yet funded
 *   active    — funded by a lender, repayment ongoing
 *   repaid    — fully repaid by borrower
 *   defaulted — overdue and not repaid
 */
/**
 * Append-only log of on-chain events received via Helius webhooks.
 *
 * Each row is one decoded Anchor instruction. txSignature is the primary key —
 * Solana signatures are globally unique, so it doubles as the idempotency key
 * for re-delivered webhooks.
 *
 * `data` is a JSON string of the fully decoded instruction arguments.
 */
export const chainEvents = sqliteTable('chain_events', {
  txSignature:  text('tx_signature').primaryKey(),
  blockTime:    integer('block_time', { mode: 'timestamp' }).notNull(),
  programId:    text('program_id').notNull(),
  contractType: text('contract_type').notNull(),
  data:         text('data').notNull(),
})

export const loanListings = sqliteTable('loan_listings', {
  id:         text('id').primaryKey(),
  borrower:   text('borrower').notNull(),
  amount:     real('amount').notNull(),
  currency:   text('currency').notNull(),
  apy:        real('apy').notNull(),
  duration:   integer('duration').notNull(),
  status:     text('status', { enum: ['open', 'active', 'repaid', 'defaulted'] }).notNull().default('open'),
  repaid:     real('repaid').notNull().default(0),
  lender:     text('lender'),
  dueDate:    text('due_date'),
  onChainRef: text('on_chain_ref'),
  createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:  integer('updated_at', { mode: 'timestamp' }).notNull(),
})
