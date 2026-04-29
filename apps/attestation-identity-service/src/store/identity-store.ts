import { eq } from 'drizzle-orm'
import type { VerifiedIdentity } from '../types.js'
import { identityRecords } from '../db/schema.js'
import type { Db } from '../db/client.js'

export async function saveIdentity(db: Db, identity: VerifiedIdentity): Promise<void> {
  await db.insert(identityRecords).values({
    walletAddress: identity.walletAddress.toLowerCase(),
    fullName: identity.fullName,
    dob: identity.dob,
    country: identity.country,
    documentNumber: identity.documentNumber ?? null,
    documentType: identity.documentType ?? null,
    verifiedAt: identity.verifiedAt,
    reference: identity.reference,
  }).onConflictDoUpdate({
    target: identityRecords.walletAddress,
    set: {
      fullName: identity.fullName,
      dob: identity.dob,
      country: identity.country,
      documentNumber: identity.documentNumber ?? null,
      documentType: identity.documentType ?? null,
      verifiedAt: identity.verifiedAt,
      reference: identity.reference,
    },
  })
}

export async function getIdentity(db: Db, walletAddress: string): Promise<VerifiedIdentity | null> {
  const row = await db.query.identityRecords.findFirst({
    where: eq(identityRecords.walletAddress, walletAddress.toLowerCase()),
  })
  if (!row) return null
  return {
    walletAddress: row.walletAddress,
    fullName: row.fullName,
    dob: row.dob,
    country: row.country,
    documentNumber: row.documentNumber ?? undefined,
    documentType: row.documentType ?? undefined,
    verifiedAt: row.verifiedAt,
    reference: row.reference,
  }
}
