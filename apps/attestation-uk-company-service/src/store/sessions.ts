import { eq } from 'drizzle-orm'
import { attestationSessions, attestationRecords } from '../db/schema.js'
import type { Db } from '../db/client.js'
import type { Session, Attestation } from '../types.js'

export const sessionStore = {
  async set(db: Db, session: Session): Promise<void> {
    await db.insert(attestationSessions).values({
      id:               session.id,
      walletAddress:    session.walletAddress,
      companyNumber:    session.companyNumber,
      directorName:     session.directorName,
      challengeMessage: session.challengeMessage,
      status:           session.status,
      createdAt:        session.createdAt,
    })
  },

  async get(db: Db, id: string): Promise<Session | undefined> {
    const [row] = await db
      .select()
      .from(attestationSessions)
      .where(eq(attestationSessions.id, id))
    if (!row) return undefined
    return {
      id:               row.id,
      walletAddress:    row.walletAddress,
      companyNumber:    row.companyNumber,
      directorName:     row.directorName,
      challengeMessage: row.challengeMessage,
      status:           row.status as Session['status'],
      createdAt:        row.createdAt,
    }
  },

  async update(db: Db, id: string, patch: Partial<Session>): Promise<void> {
    await db
      .update(attestationSessions)
      .set(patch as Partial<typeof attestationSessions.$inferInsert>)
      .where(eq(attestationSessions.id, id))
  },
}

export const attestationStore = {
  async set(db: Db, attestation: Attestation): Promise<void> {
    await db.insert(attestationRecords).values({
      walletAddress:      attestation.walletAddress,
      companyNumber:      attestation.companyNumber,
      companyName:        attestation.companyName,
      directorName:       attestation.directorName,
      verified:           attestation.verified,
      issuedAt:           attestation.issuedAt,
      expiresAt:          attestation.expiresAt,
      revoked:            attestation.revoked,
      attestationAddress: attestation.attestationAddress,
    }).onConflictDoUpdate({
      target: attestationRecords.walletAddress,
      set: {
        companyNumber:      attestation.companyNumber,
        companyName:        attestation.companyName,
        directorName:       attestation.directorName,
        verified:           attestation.verified,
        issuedAt:           attestation.issuedAt,
        expiresAt:          attestation.expiresAt,
        revoked:            attestation.revoked,
        attestationAddress: attestation.attestationAddress,
      },
    })
  },

  async getByWallet(db: Db, walletAddress: string): Promise<Attestation | undefined> {
    const [row] = await db
      .select()
      .from(attestationRecords)
      .where(eq(attestationRecords.walletAddress, walletAddress))
    if (!row) return undefined
    return {
      walletAddress:      row.walletAddress,
      companyNumber:      row.companyNumber,
      companyName:        row.companyName,
      directorName:       row.directorName,
      verified:           row.verified ?? true,
      issuedAt:           row.issuedAt,
      expiresAt:          row.expiresAt,
      revoked:            row.revoked ?? false,
      attestationAddress: row.attestationAddress,
    }
  },

  async exists(db: Db, walletAddress: string): Promise<boolean> {
    const [row] = await db
      .select({ walletAddress: attestationRecords.walletAddress })
      .from(attestationRecords)
      .where(eq(attestationRecords.walletAddress, walletAddress))
    return row !== undefined
  },
}
