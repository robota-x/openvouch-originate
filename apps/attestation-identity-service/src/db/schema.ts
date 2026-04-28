import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const identityRecords = sqliteTable('identity_records', {
  walletAddress:  text('wallet_address').primaryKey(),
  fullName:       text('full_name').notNull(),
  dob:            text('dob').notNull(),
  country:        text('country').notNull(),
  documentNumber: text('document_number'),
  documentType:   text('document_type'),
  verifiedAt:     integer('verified_at').notNull(),
  reference:      text('reference').notNull(),
})
