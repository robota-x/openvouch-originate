import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const attestationSessions = sqliteTable('attestation_sessions', {
  id:               text('id').primaryKey(),
  walletAddress:    text('wallet_address').notNull(),
  companyNumber:    text('company_number').notNull(),
  directorName:     text('director_name').notNull(),
  challengeMessage: text('challenge_message').notNull(),
  status:           text('status', { enum: ['pending', 'attested'] }).notNull(),
  createdAt:        integer('created_at').notNull(),
})

export const attestationRecords = sqliteTable('attestation_records', {
  walletAddress:      text('wallet_address').primaryKey(),
  companyNumber:      text('company_number').notNull(),
  companyName:        text('company_name').notNull(),
  directorName:       text('director_name').notNull(),
  verified:           integer('verified', { mode: 'boolean' }).notNull().default(true),
  issuedAt:           integer('issued_at').notNull(),
  expiresAt:          integer('expires_at').notNull(),
  revoked:            integer('revoked', { mode: 'boolean' }).notNull().default(false),
  attestationAddress: text('attestation_address').notNull(),
})
