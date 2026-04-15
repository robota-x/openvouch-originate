import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { loanListings, profiles as profilesTable, attestations as attestationsTable } from '../db/schema.js'
import { authenticate } from '../middleware/session.js'
import { fixtureOpenLoans } from '../fixtures.js'
import type { Db } from '../db/client.js'
import type { AppEnv } from '../types.js'

const loanRoutes = new Hono<AppEnv>()

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Enrich a single open listing row with borrower profile stats for the marketplace view. */
async function enrichListing(db: Db, listing: typeof loanListings.$inferSelect) {
  // NOTE: this helper issues 3 extra queries per listing (borrower profile, all borrower
  // loans for repayment rate, attestations for count). Acceptable at current scale.
  // Replace with JOIN + aggregation if the marketplace listing grows beyond ~100 rows.
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.address, listing.borrower))

  const allBorrowerLoans = await db
    .select()
    .from(loanListings)
    .where(eq(loanListings.borrower, listing.borrower))
  const settled = allBorrowerLoans.filter(r => r.status !== 'open')

  const totalBorrowed = settled.reduce((s, l) => s + l.amount, 0)
  const totalRepaid   = settled.reduce((s, l) => s + l.repaid,  0)
  const repaymentRate = settled.length ? Math.round(totalRepaid / totalBorrowed * 100) : 100

  const attestationRows = await db
    .select()
    .from(attestationsTable)
    .where(eq(attestationsTable.address, listing.borrower))
  const attestationCount = attestationRows.filter(r => r.verified).length

  return {
    borrower:         listing.borrower,
    nickname:         profile?.nickname ?? listing.borrower.slice(0, 8),
    amount:           listing.amount,
    currency:         listing.currency,
    apy:              listing.apy,
    duration:         listing.duration,
    trustScore:       profile?.trustScore ?? 0,
    repaymentRate,
    attestationCount,
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/loans — list open loan requests enriched with borrower stats. */
loanRoutes.get('/', async (c) => {
  if (c.env?.FIXTURES_ENABLED === 'true') return c.json(fixtureOpenLoans)

  const db = c.var.db
  const openListings = await db.select().from(loanListings).where(eq(loanListings.status, 'open'))
  const enriched = await Promise.all(openListings.map(l => enrichListing(db as any, l)))
  return c.json(enriched)
})

/** POST /api/loans — borrower posts a new open loan offer. */
loanRoutes.post('/', authenticate, async (c) => {
  const db = c.var.db
  const body = await c.req.json<{
    amount?: number; currency?: string; apy?: number; duration?: number
  }>()

  const { amount, currency, apy, duration } = body
  if (!amount || !currency || !apy || !duration) {
    return c.json({ error: 'amount, currency, apy and duration are required' }, 400)
  }
  if (amount <= 0 || apy <= 0 || duration <= 0) {
    return c.json({ error: 'amount, apy and duration must be positive' }, 400)
  }

  const id  = crypto.randomUUID()
  const now = new Date()
  await db.insert(loanListings).values({
    id,
    borrower:  c.var.user.address,
    amount,
    currency,
    apy,
    duration,
    status:    'open',
    repaid:    0,
    createdAt: now,
    updatedAt: now,
  })

  const [created] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  return c.json(created, 201)
})

/** GET /api/loans/:id — single loan listing. */
loanRoutes.get('/:id', async (c) => {
  if (c.env?.FIXTURES_ENABLED === 'true') return c.json({ error: 'not_implemented' }, 501)

  const db  = c.var.db
  const id  = c.req.param('id')
  const [row] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  if (!row) return c.json({ error: 'not_found' }, 404)
  return c.json(row)
})

/** PATCH /api/loans/:id — update terms of an open offer (borrower only, pre-fund). */
loanRoutes.patch('/:id', authenticate, async (c) => {
  const db  = c.var.db
  const id  = c.req.param('id')

  const [row] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  if (!row) return c.json({ error: 'not_found' }, 404)
  if (row.borrower !== c.var.user.address) return c.json({ error: 'forbidden' }, 403)
  if (row.status !== 'open') return c.json({ error: 'listing_not_open' }, 409)

  const body = await c.req.json<{
    amount?: number; currency?: string; apy?: number; duration?: number
  }>()
  const updates: Partial<typeof loanListings.$inferInsert> = { updatedAt: new Date() }
  if (body.amount   !== undefined) updates.amount   = body.amount
  if (body.currency !== undefined) updates.currency = body.currency
  if (body.apy      !== undefined) updates.apy      = body.apy
  if (body.duration !== undefined) updates.duration = body.duration

  await db.update(loanListings).set(updates).where(eq(loanListings.id, id))
  const [updated] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  return c.json(updated)
})

/** DELETE /api/loans/:id — cancel an open offer (borrower only). */
loanRoutes.delete('/:id', authenticate, async (c) => {
  const db  = c.var.db
  const id  = c.req.param('id')

  const [row] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  if (!row) return c.json({ error: 'not_found' }, 404)
  if (row.borrower !== c.var.user.address) return c.json({ error: 'forbidden' }, 403)
  if (row.status !== 'open') return c.json({ error: 'listing_not_open' }, 409)

  await db.delete(loanListings).where(eq(loanListings.id, id))
  return c.body(null, 204)
})

/**
 * POST /api/loans/:id/fund — called by the frontend after the lender signs the
 * on-chain lending contract.
 *
 * Current behaviour: returns 204 and does nothing (the on-chain record is the
 * source of truth). The caller is the *lender*, not the borrower.
 *
 * Intended future behaviour (without Helios/webhook push):
 *   1. Frontend submits the signed Solana tx, waits for confirmation, then calls
 *      this endpoint to tell the backend a contract was created for this listing.
 *   2. Backend reads the contract account from the Solana RPC directly, verifies
 *      the terms match the listing (amount, apy, duration, borrower, lender), and
 *      only then flips status → active, writes lender + dueDate + onChainRef.
 *   3. If the RPC read fails or terms mismatch, 400 is returned; frontend retries.
 *
 * With Helios / a Solana webhook provider the backend receives a push event
 * instead and this endpoint becomes a no-op or is removed.
 */
loanRoutes.post('/:id/fund', authenticate, async (c) => {
  const db  = c.var.db
  const id  = c.req.param('id')

  const [row] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  if (!row) return c.json({ error: 'not_found' }, 404)
  if (row.status !== 'open') return c.json({ error: 'listing_not_open' }, 409)
  if (row.borrower === c.var.user.address) return c.json({ error: 'borrower_cannot_fund' }, 403)

  // TODO: read from Solana RPC to verify the contract exists and terms match
  // before updating the listing. For now, return 204 to unblock frontend work.
  return c.body(null, 204)
})

export default loanRoutes
