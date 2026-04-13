import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { profiles as profilesTable, attestations as attestationsTable, loanListings } from '../db/schema.js'
import { authenticate } from '../middleware/session.js'
import { fixtureProfiles } from '../fixtures.js'
import type { AppEnv } from '../types.js'

const profileRoutes = new Hono<AppEnv>()

/** GET /api/profiles/:address — full public profile (off-chain fields + attestations + loans). */
profileRoutes.get('/:address', async (c) => {
  const address = c.req.param('address')
  const db = c.var.db

  if (!db) {
    const profile = fixtureProfiles[address] ?? {
      address,
      nickname:     address.slice(0, 8),
      trustScore:   0,
      attestations: [],
      loans:        [],
    }
    return c.json(profile)
  }

  const [row] = await db.select().from(profilesTable).where(eq(profilesTable.address, address))
  if (!row) {
    return c.json({
      address,
      nickname:     address.slice(0, 8),
      trustScore:   0,
      attestations: [],
      loans:        [],
    })
  }

  const attestationRows = await db
    .select()
    .from(attestationsTable)
    .where(eq(attestationsTable.address, address))

  const loanRows = await db
    .select()
    .from(loanListings)
    .where(eq(loanListings.borrower, address))

  return c.json({
    address:    row.address,
    nickname:   row.nickname ?? row.address.slice(0, 8),
    trustScore: row.trustScore ?? 0,
    attestations: attestationRows.map(a => ({
      icon:       a.icon,
      title:      a.title,
      status:     a.status,
      verified:   a.verified,
      providerId: a.providerId,
      issuedAt:   a.issuedAt,
      onChainRef: a.onChainRef ?? undefined,
      metadata:   a.metadata ? JSON.parse(a.metadata) as Record<string, string> : undefined,
    })),
    loans: loanRows.map(l => ({
      id:           l.id,
      amount:       l.amount,
      currency:     l.currency,
      apy:          l.apy,
      duration:     l.duration,
      status:       l.status,
      repaid:       l.repaid,
      dueDate:      l.dueDate ?? undefined,
      counterparty: l.lender ?? undefined,
    })),
  })
})

/** PATCH /api/profiles/:address — update off-chain fields (own profile only). */
profileRoutes.patch('/:address', authenticate, async (c) => {
  const address = c.req.param('address')
  if (c.var.user.address !== address) {
    return c.json({ error: 'forbidden' }, 403)
  }

  const db = c.var.db
  if (!db) return c.json({ error: 'not_implemented' }, 501)

  const body = await c.req.json<{ nickname?: string; trustScore?: number }>()
  const updates: Partial<typeof profilesTable.$inferInsert> = { updatedAt: new Date() }
  if (body.nickname   !== undefined) updates.nickname   = body.nickname
  if (body.trustScore !== undefined) updates.trustScore = body.trustScore

  await db
    .insert(profilesTable)
    .values({ address, updatedAt: new Date(), ...updates })
    .onConflictDoUpdate({ target: profilesTable.address, set: updates })

  return c.json({ ok: true })
})

export default profileRoutes
