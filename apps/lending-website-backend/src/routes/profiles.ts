import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { createAppDb } from '../db/client.js'
import { profiles as profilesTable, attestations as attestationsTable, loanListings, loanContributions } from '../db/schema.js'
import { authenticate } from '../middleware/session.js'
import { toLamports, toSol } from '../utils/precision.js'
import { fixtureProfiles } from '../fixtures.js'
import type { AppEnv } from '../types.js'

const profileRoutes = new Hono<AppEnv>()

/** GET /api/profiles/:address — full public profile (off-chain fields + attestations + loans). */
profileRoutes.get('/:address', async (c) => {
  const address = c.req.param('address')

  if (c.get('config').fixturesEnabled) {
    const profile = fixtureProfiles[address] ?? {
      address,
      nickname:     address.slice(0, 8),
      trustScore:   0,
      attestations: [],
      loans:        [],
    }
    return c.json(profile)
  }

  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
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

  const [attestationRows, borrowedRows, contributionRows] = await Promise.all([
    db.select().from(attestationsTable).where(eq(attestationsTable.address, address)),
    db.select().from(loanListings).where(eq(loanListings.borrower, address)),
    db.select().from(loanContributions).where(eq(loanContributions.lender, address)),
  ])

  // Map contributions back to their parent loans to show in "Lent Loans"
  const lentLoans = await Promise.all(contributionRows.map(async cRow => {
    const [loan] = await db
      .select()
      .from(loanListings)
      .where(eq(loanListings.id, cRow.loanId))
    
    if (!loan) return null;

    const [borrowerProfile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.address, loan.borrower))

    const borrowerSettledLoans = await db
      .select()
      .from(loanListings)
      .where(eq(loanListings.borrower, loan.borrower))
      .then(rows => rows.filter(r => r.status !== 'open'))

    const totalBorrowed = borrowerSettledLoans.reduce((s, r) => s + BigInt(r.amount), 0n)
    const totalRepaid   = borrowerSettledLoans.reduce((s, r) => s + BigInt(r.repaid),  0n)
    const repaymentRate = borrowerSettledLoans.length && totalBorrowed > 0n
      ? Math.round(Number(totalRepaid) / Number(totalBorrowed) * 10000)
      : 10000

    const borrowerAttestationCount = await db
      .select()
      .from(attestationsTable)
      .where(eq(attestationsTable.address, loan.borrower))
      .then(rows => rows.filter(r => r.verified).length)

    return {
      id:                       loan.id,
      borrower:                 loan.borrower,
      borrowerNickname:         borrowerProfile?.nickname ?? loan.borrower.slice(0, 8),
      borrowerTrustScore:       borrowerProfile?.trustScore ?? 0,
      borrowerAttestationCount,
      borrowerRepaymentRate:    repaymentRate,
      amount:                   cRow.amount.toString(), // The amount this specific user lent
      totalLoanAmount:          loan.amount.toString(),
      currency:                 loan.currency,
      apy:                      (loan.apy * 100).toString(),
      duration:                 loan.duration,
      status:                   loan.status as 'active' | 'repaid' | 'defaulted',
      dueDate:                  loan.dueDate ?? undefined,
    }
  })).then(results => results.filter(r => r !== null))

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
      amount:       l.amount.toString(),
      currency:     l.currency,
      apy:          (l.apy * 100).toString(),
      duration:     l.duration,
      status:       l.status,
      repaid:       l.repaid.toString(),
      dueDate:      l.dueDate ?? undefined,
      counterparty: l.lender ?? undefined,
    })),
    lentLoans,
  })
})

/**
 * PATCH /api/profiles/:address — update user-editable off-chain fields (own profile only).
 */
profileRoutes.patch('/:address', authenticate, async (c) => {
  const address = c.req.param('address')
  if (c.var.user.address !== address) {
    return c.json({ error: 'forbidden' }, 403)
  }

  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const raw = await c.req.json<Record<string, unknown>>()

  const forbidden = ['trustScore', 'trust_score', 'updatedAt', 'updated_at', 'createdAt', 'created_at']
  const attempted = forbidden.filter(k => k in raw)
  if (attempted.length > 0) {
    return c.json({ error: `fields not settable via API: ${attempted.join(', ')}` }, 400)
  }

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
