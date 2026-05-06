// // Drizzle schema — define tables here.
// // After changes: npm run db:generate  →  produces a migration file in migrations/
// // Then apply:    npm run db:migrate:local / db:migrate:staging / db:migrate:production

// import { sqliteTable, text, integer, real, blob, customType } from 'drizzle-orm/sqlite-core'

// /**
//  * Custom BigInt type for SQLite that uses INTEGER mode.
//  * Ensures we use 64-bit integers in D1 while having bigint in JS.
//  */
// export const sqliteBigInt = customType<{ data: bigint; driverData: number }>({
//   dataType() {
//     return 'integer';
//   },
//   fromDriver(value: unknown) {
//     if (typeof value === 'bigint') return value;
//     if (typeof value === 'number') return BigInt(value);
//     if (typeof value === 'string') return BigInt(value);
//     return 0n;
//   },
//   toDriver(value: bigint) {
//     return Number(value);
//   },
// });

// /** One-time challenge nonces issued during wallet auth. Replaced on re-challenge. */
// export const authNonces = sqliteTable('auth_nonces', {
//   address:   text('address').primaryKey(),
//   nonce:     text('nonce').notNull(),
//   expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
// })

// /**
//  * Public borrower/lender profiles, keyed by wallet address.
//  *
//  * Lifecycle: created automatically on first successful wallet login (POST /api/auth/verify).
//  * No POST endpoint — use PATCH /api/profiles/:address to update user-editable fields.
//  *
//  * trustScore is platform-computed only. It is never accepted from external input.
//  * updatedAt is set server-side on every write. Neither field is user-settable via the API.
//  */
// export const profiles = sqliteTable('profiles', {
//   address:    text('address').primaryKey(),
//   nickname:   text('nickname'),
//   trustScore: integer('trust_score'),
//   createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
//   updatedAt:  integer('updated_at', { mode: 'timestamp' }).notNull(),
// })

// /** Registered third-party attestation providers. Static registry, not user-mutable. */
// export const attestationProviders = sqliteTable('attestation_providers', {
//   id:          text('id').primaryKey(),
//   name:        text('name').notNull(),
//   wallet:      text('wallet').notNull(),
//   website:     text('website').notNull(),
//   claimUrl:    text('claim_url').notNull(),
//   description: text('description').notNull(),
// })

// /**
//  * Per-profile attestation claims.
//  * metadata is stored as a JSON string (Record<string, string>).
//  * verified uses integer mode boolean (0/1).
//  */
// export const attestations = sqliteTable('attestations', {
//   id:         text('id').primaryKey(),  // `${address}-${providerId}` or a UUID for multiples
//   address:    text('address').notNull(),
//   providerId: text('provider_id').notNull(),
//   icon:       text('icon').notNull(),
//   title:      text('title').notNull(),
//   status:     text('status').notNull(),
//   verified:   integer('verified', { mode: 'boolean' }).notNull().default(true),
//   issuedAt:   text('issued_at').notNull(),
//   onChainRef: text('on_chain_ref'),
//   metadata:   text('metadata'),  // JSON string: Record<string, string>
// })

// /**
//  * Off-chain loan listing records. On-chain settlement referenced via on_chain_ref.
//  *
//  * Status lifecycle: open → active → repaid | defaulted
//  *   open      — borrower's offer, not yet funded
//  *   active    — funded by a lender, repayment ongoing
//  *   repaid    — fully repaid by borrower
//  *   defaulted — overdue and not repaid
//  */
// /**
//  * Append-only log of on-chain events received via Helius webhooks.
//  *
//  * Each row is one decoded Anchor instruction. txSignature is the primary key —
//  * Solana signatures are globally unique, so it doubles as the idempotency key
//  * for re-delivered webhooks.
//  *
//  * `data` is a JSON string of the fully decoded instruction arguments.
//  */
// export const chainEvents = sqliteTable('chain_events', {
//   txSignature:  text('tx_signature').primaryKey(),
//   blockTime:    integer('block_time', { mode: 'timestamp' }).notNull(),
//   programId:    text('program_id').notNull(),
//   contractType: text('contract_type').notNull(),
//   data:         text('data').notNull(),
// })

// export const loanListings = sqliteTable('loan_listings', {
//   id:         text('id').primaryKey(),
//   borrower:   text('borrower').notNull(),
//   amount:     sqliteBigInt('amount').notNull(),
//   currency:   text('currency').notNull(),
//   apy:        integer('apy').notNull(), // Basis Points (BPS)
//   duration:   integer('duration').notNull(),
//   status:     text('status', { enum: ['open', 'active', 'repaid', 'defaulted'] }).notNull().default('open'),
//   raisedAmount: sqliteBigInt('raised_amount').notNull().default(0n),
//   repaid:     sqliteBigInt('repaid').notNull().default(0n),
//   lender:     text('lender'), // Legacy/Primary lender
//   dueDate:    text('due_date'),
//   onChainRef: text('on_chain_ref'),
//   createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
//   updatedAt:  integer('updated_at', { mode: 'timestamp' }).notNull(),
// })

// export const loanContributions = sqliteTable('loan_contributions', {
//   id:         text('id').primaryKey(),
//   loanId:     text('loan_id').notNull().references(() => loanListings.id),
//   lender:     text('lender').notNull(),
//   amount:     sqliteBigInt('amount').notNull(),
//   onChainRef: text('on_chain_ref'),
//   createdAt:  integer('created_at', { mode: 'timestamp' }).notNull(),
// })

// Drizzle schema — define tables here.
// After changes: npm run db:generate  →  produces a migration file in migrations/
// Then apply:    npm run db:migrate:local / db:migrate:staging / db:migrate:production

// import {
//   sqliteTable,
//   text,
//   integer,
//   real,
//   blob,
//   customType,
// } from "drizzle-orm/sqlite-core";

// /**
//  * Custom BigInt type for SQLite that uses INTEGER mode.
//  * Ensures we use 64-bit integers in D1 while having bigint in JS.
//  */
// export const sqliteBigInt = customType<{ data: bigint; driverData: number }>({
//   dataType() {
//     return "integer";
//   },
//   fromDriver(value: unknown) {
//     if (typeof value === "bigint") return value;
//     if (typeof value === "number") return BigInt(value);
//     if (typeof value === "string") return BigInt(value);
//     return 0n;
//   },
//   toDriver(value: bigint) {
//     return Number(value);
//   },
// });

// /** One-time challenge nonces issued during wallet auth. Replaced on re-challenge. */
// export const authNonces = sqliteTable("auth_nonces", {
//   address: text("address").primaryKey(),
//   nonce: text("nonce").notNull(),
//   expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
// });

// /**
//  * Public borrower/lender profiles, keyed by wallet address.
//  *
//  * Lifecycle: created automatically on first successful wallet login (POST /api/auth/verify).
//  * No POST endpoint — use PATCH /api/profiles/:address to update user-editable fields.
//  *
//  * trustScore is platform-computed only. It is never accepted from external input.
//  * updatedAt is set server-side on every write. Neither field is user-settable via the API.
//  */
// export const profiles = sqliteTable("profiles", {
//   address: text("address").primaryKey(),
//   nickname: text("nickname"),
//   trustScore: integer("trust_score"),
//   createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
//   updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
// });

// /** Registered third-party attestation providers. Static registry, not user-mutable. */
// export const attestationProviders = sqliteTable("attestation_providers", {
//   id: text("id").primaryKey(),
//   name: text("name").notNull(),
//   wallet: text("wallet").notNull(),
//   website: text("website").notNull(),
//   claimUrl: text("claim_url").notNull(),
//   description: text("description").notNull(),
// });

// /**
//  * Per-profile attestation claims.
//  * metadata is stored as a JSON string (Record<string, string>).
//  * verified uses integer mode boolean (0/1).
//  */
// export const attestations = sqliteTable("attestations", {
//   id: text("id").primaryKey(), // `${address}-${providerId}` or a UUID for multiples
//   address: text("address").notNull(),
//   providerId: text("provider_id").notNull(),
//   icon: text("icon").notNull(),
//   title: text("title").notNull(),
//   status: text("status").notNull(),
//   verified: integer("verified", { mode: "boolean" }).notNull().default(true),
//   issuedAt: text("issued_at").notNull(),
//   onChainRef: text("on_chain_ref"),
//   metadata: text("metadata"), // JSON string: Record<string, string>
// });

// /**
//  * Off-chain loan listing records. On-chain settlement referenced via on_chain_ref.
//  *
//  * Status lifecycle: open → active → repaid | defaulted
//  *   open      — borrower's offer, not yet funded
//  *   active    — funded by a lender, repayment ongoing
//  *   repaid    — fully repaid by borrower
//  *   defaulted — overdue and not repaid
//  */
// export const loanListings = sqliteTable("loan_listings", {
//   id: text("id").primaryKey(),
//   borrower: text("borrower").notNull(),
//   amount: sqliteBigInt("amount").notNull(),
//   currency: text("currency").notNull(),
//   apy: integer("apy").notNull(), // Basis Points (BPS)
//   duration: integer("duration").notNull(),
//   status: text("status", { enum: ["open", "active", "repaid", "defaulted"] })
//     .notNull()
//     .default("open"),
//   raisedAmount: sqliteBigInt("raised_amount").notNull().default(0n),
//   repaid: sqliteBigInt("repaid").notNull().default(0n),
//   lender: text("lender"), // Legacy/Primary lender
//   dueDate: text("due_date"),
//   onChainRef: text("on_chain_ref"),
//   createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
//   updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
// });

// export const loanContributions = sqliteTable("loan_contributions", {
//   id: text("id").primaryKey(),
//   loanId: text("loan_id")
//     .notNull()
//     .references(() => loanListings.id),
//   lender: text("lender").notNull(),
//   amount: sqliteBigInt("amount").notNull(),
//   onChainRef: text("on_chain_ref"),
//   createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
// });

// // ==================== SOCIAL REVIEW SYSTEM ====================

// /**
//  * Social reviews for loans.
//  * Stores ratings (1-5) and comments (max ~150 words) from lenders and borrowers.
//  *
//  * Note: The 'pool_id' references the loan listing ID.
//  * The 'target_address' is the user being reviewed (either the lender or the borrower).
//  * The 'reviewer_address' is the user submitting the review.
//  */
// export const reviews = sqliteTable("reviews", {
//   id: text("id").primaryKey(),
//   poolId: text("pool_id")
//     .notNull()
//     .references(() => loanListings.id),
//   reviewerAddress: text("reviewer_address").notNull(),
//   targetAddress: text("target_address").notNull(), // The person being reviewed
//   rating: integer("rating").notNull(), // 1 to 5
//   comment: text("comment").notNull(), // Max ~150 words (enforced at app level)
//   createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
// });

// // Index for fast lookup of a user's average score and review count
// // Used by GET /api/profiles/:address/stats
// export const idxReviewsTarget = sqliteTable("idx_reviews_target", {
//   targetAddress: text("target_address"),
// }).indexes((t) => t.index("idx_reviews_target").on(t.targetAddress));

// Drizzle schema — define tables here.
// After changes: npm run db:generate  →  produces a migration file in migrations/
// Then apply:    npm run db:migrate:local / db:migrate:staging / db:migrate:production

import {
  sqliteTable,
  text,
  integer,
  real,
  blob,
  customType,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * Custom BigInt type for SQLite that uses INTEGER mode.
 * Ensures we use 64-bit integers in D1 while having bigint in JS.
 */
export const sqliteBigInt = customType<{ data: bigint; driverData: number }>({
  dataType() {
    return "integer";
  },
  fromDriver(value: unknown) {
    if (typeof value === "bigint") return value;
    if (typeof value === "number") return BigInt(value);
    if (typeof value === "string") return BigInt(value);
    return 0n;
  },
  toDriver(value: bigint) {
    return Number(value);
  },
});

/** One-time challenge nonces issued during wallet auth. Replaced on re-challenge. */
export const authNonces = sqliteTable("auth_nonces", {
  address: text("address").primaryKey(),
  nonce: text("nonce").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

/**
 * Public borrower/lender profiles, keyed by wallet address.
 *
 * Lifecycle: created automatically on first successful wallet login (POST /api/auth/verify).
 * No POST endpoint — use PATCH /api/profiles/:address to update user-editable fields.
 *
 * trustScore is platform-computed only. It is never accepted from external input.
 * updatedAt is set server-side on every write. Neither field is user-settable via the API.
 */
export const profiles = sqliteTable("profiles", {
  address: text("address").primaryKey(),
  nickname: text("nickname"),
  trustScore: integer("trust_score"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

/** Registered third-party attestation providers. Static registry, not user-mutable. */
export const attestationProviders = sqliteTable("attestation_providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  wallet: text("wallet").notNull(),
  website: text("website").notNull(),
  claimUrl: text("claim_url").notNull(),
  description: text("description").notNull(),
});

/**
 * Per-profile attestation claims.
 * metadata is stored as a JSON string (Record<string, string>).
 * verified uses integer mode boolean (0/1).
 */
export const attestations = sqliteTable("attestations", {
  id: text("id").primaryKey(), // `${address}-${providerId}` or a UUID for multiples
  address: text("address").notNull(),
  providerId: text("provider_id").notNull(),
  icon: text("icon").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull().default(true),
  issuedAt: text("issued_at").notNull(),
  onChainRef: text("on_chain_ref"),
  metadata: text("metadata"), // JSON string: Record<string, string>
});

/**
 * Off-chain loan listing records. On-chain settlement referenced via on_chain_ref.
 *
 * Status lifecycle: open → active → repaid | defaulted
 *   open      — borrower's offer, not yet funded
 *   active    — funded by a lender, repayment ongoing
 *   repaid    — fully repaid by borrower
 *   defaulted — overdue and not repaid
 */
export const loanListings = sqliteTable("loan_listings", {
  id: text("id").primaryKey(),
  borrower: text("borrower").notNull(),
  amount: sqliteBigInt("amount").notNull(),
  currency: text("currency").notNull(),
  apy: integer("apy").notNull(), // Basis Points (BPS)
  duration: integer("duration").notNull(),
  status: text("status", { enum: ["open", "active", "repaid", "defaulted"] })
    .notNull()
    .default("open"),
  raisedAmount: sqliteBigInt("raised_amount").notNull().default(0n),
  repaid: sqliteBigInt("repaid").notNull().default(0n),
  lender: text("lender"), // Legacy/Primary lender
  dueDate: text("due_date"),
  onChainRef: text("on_chain_ref"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const loanContributions = sqliteTable("loan_contributions", {
  id: text("id").primaryKey(),
  loanId: text("loan_id")
    .notNull()
    .references(() => loanListings.id),
  lender: text("lender").notNull(),
  amount: sqliteBigInt("amount").notNull(),
  onChainRef: text("on_chain_ref"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// ==================== SOCIAL REVIEW SYSTEM ====================

/**
 * Social reviews for loans.
 * Stores ratings (1-5) and comments (max ~150 words) from lenders and borrowers.
 *
 * Note: The 'poolId' references the loan listing ID.
 * The 'targetAddress' is the user being reviewed (either the lender or the borrower).
 * The 'reviewerAddress' is the user submitting the review.
 */
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    poolId: text("pool_id")
      .notNull()
      .references(() => loanListings.id),
    reviewerAddress: text("reviewer_address").notNull(),
    targetAddress: text("target_address").notNull(), // The person being reviewed
    rating: integer("rating").notNull(), // 1 to 5
    comment: text("comment").notNull(), // Max ~150 words (enforced at app level)
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    // Index for fast lookup of a user's average score and review count
    // Used by GET /api/profiles/:address/stats
    targetAddressIdx: index("idx_reviews_target").on(table.targetAddress),
  }),
);
