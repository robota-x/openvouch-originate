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

  if (c.env?.FIXTURES_ENABLED === 'true') {
    const profile = fixtureProfiles[address] ?? {
      address,
      nickname:     address.slice(0, 8),
      trustScore:   0,
      attestations: [],
      loans:        [],
    }
    return c.json(profile)
  }

  const db = c.var.db
  if (!db) return c.json({ error: 'not_implemented' }, 501)
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

  const [attestationRows, borrowedRows, lentRows] = await Promise.all([
    db.select().from(attestationsTable).where(eq(attestationsTable.address, address)),
    db.select().from(loanListings).where(eq(loanListings.borrower, address)),
    db.select().from(loanListings).where(eq(loanListings.lender, address)),
  ])

  // For each lent loan, look up the borrower profile to denormalize borrower stats.
  // NOTE: this is an N+1 — one extra query per lent loan. Acceptable at current scale;
  // replace with a JOIN or a batched IN query if lentLoans lists grow large.
  const lentLoans = await Promise.all(lentRows.map(async l => {
    const [borrowerProfile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.address, l.borrower))

    const borrowerSettledLoans = await db
      .select()
      .from(loanListings)
      .where(eq(loanListings.borrower, l.borrower))
      .then(rows => rows.filter(r => r.status !== 'open'))

    const totalBorrowed = borrowerSettledLoans.reduce((s, r) => s + r.amount, 0)
    const totalRepaid   = borrowerSettledLoans.reduce((s, r) => s + r.repaid,  0)
    const repaymentRate = borrowerSettledLoans.length
      ? Math.round(totalRepaid / totalBorrowed * 100)
      : 100

    const borrowerAttestationCount = await db
      .select()
      .from(attestationsTable)
      .where(eq(attestationsTable.address, l.borrower))
      .then(rows => rows.filter(r => r.verified).length)

    return {
      id:                       l.id,
      borrower:                 l.borrower,
      borrowerNickname:         borrowerProfile?.nickname ?? l.borrower.slice(0, 8),
      borrowerTrustScore:       borrowerProfile?.trustScore ?? 0,
      borrowerAttestationCount,
      borrowerRepaymentRate:    repaymentRate,
      amount:                   l.amount,
      currency:                 l.currency,
      apy:                      l.apy,
      duration:                 l.duration,
      status:                   l.status as 'active' | 'repaid' | 'defaulted',
      dueDate:                  l.dueDate ?? undefined,
    }
  }))

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
    loans: borrowedRows.map(l => ({
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
    lentLoans,
  })
})

/**
 * PATCH /api/profiles/:address — update user-editable off-chain fields (own profile only).
 *
 * No POST endpoint exists: profiles are created automatically on first login
 * (POST /api/auth/verify) via INSERT OR IGNORE, so the row always exists by the
 * time a user can reach this endpoint.
 *
 * Fields that are NEVER accepted from external input:
 *   - trustScore  — platform-computed; has no write path through the public API
 *   - updatedAt   — always set to server time on every write
 *   - createdAt   — set once at profile creation, never changes
 */
profileRoutes.patch('/:address', authenticate, async (c) => {
  const address = c.req.param('address')
  if (c.var.user.address !== address) {
    return c.json({ error: 'forbidden' }, 403)
  }

  const db = c.var.db
  const raw = await c.req.json<Record<string, unknown>>()

  // Explicit guard: reject any attempt to set protected fields, even if sent accidentally.
  // This is defence-in-depth — the type below already excludes them, but we don't want
  // a future refactor silently opening a write path for platform-managed fields.
  const forbidden = ['trustScore', 'trust_score', 'updatedAt', 'updated_at', 'createdAt', 'created_at']
  const attempted = forbidden.filter(k => k in raw)
  if (attempted.length > 0) {
    return c.json({ error: `fields not settable via API: ${attempted.join(', ')}` }, 400)
  }

  // Only nickname is user-editable at this time.
  const body = raw as { nickname?: string }
  const updates: Partial<typeof profilesTable.$inferInsert> = { updatedAt: new Date() }
  if (body.nickname !== undefined) updates.nickname = body.nickname

  await db
    .insert(profilesTable)
    .values({ address, createdAt: new Date(), updatedAt: new Date(), ...updates })
    .onConflictDoUpdate({ target: profilesTable.address, set: updates })

  return c.json({ ok: true })
})

export default profileRoutes
