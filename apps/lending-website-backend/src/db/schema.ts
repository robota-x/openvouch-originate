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

/** Public borrower/lender profiles, keyed by wallet address. */
export const profiles = sqliteTable('profiles', {
  address:   text('address').primaryKey(),
  nickname:  text('nickname'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

/** Off-chain loan listing records. On-chain settlement referenced via on_chain_ref. */
export const loanListings = sqliteTable('loan_listings', {
  id:         text('id').primaryKey(),
  borrower:   text('borrower').notNull(),
  amount:     real('amount').notNull(),
  currency:   text('currency').notNull(),
  apy:        real('apy').notNull(),
  duration:   integer('duration').notNull(),
  status:     text('status', { enum: ['open', 'funded', 'repaid', 'defaulted'] }).notNull().default('open'),
  lender:     text('lender'),
  onChainRef: text('on_chain_ref'),
  createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt:  integer('updated_at', { mode: 'timestamp' }).notNull(),
})
