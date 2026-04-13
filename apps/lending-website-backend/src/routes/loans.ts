import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { loanListings, profiles as profilesTable, attestations as attestationsTable } from '../db/schema.js'
import { authenticate } from '../middleware/session.js'
import { fixtureOpenLoans } from '../fixtures.js'
import type { AppEnv } from '../types.js'

const loanRoutes = new Hono<AppEnv>()

/** GET /api/loans — list open loan requests enriched with borrower stats. */
loanRoutes.get('/', async (c) => {
  const db = c.var.db
  if (!db) return c.json(fixtureOpenLoans)

  // Fetch all open listings
  const openListings = await db
    .select()
    .from(loanListings)
    .where(eq(loanListings.status, 'open'))

  // Enrich each with borrower profile stats (repayment rate + attestation count)
  const enriched = await Promise.all(openListings.map(async listing => {
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.address, listing.borrower))

    const allBorrowerLoans = await db
      .select()
      .from(loanListings)
      .where(eq(loanListings.borrower, listing.borrower))

    const settled = allBorrowerLoans.filter(l => l.status !== 'open')
    const totalBorrowed = settled.reduce((s, l) => s + l.amount, 0)
    const totalRepaid   = settled.reduce((s, l) => s + l.repaid,  0)
    const repaymentRate = settled.length ? Math.round(totalRepaid / totalBorrowed * 100) : 100

    const attestationRows = await db
      .select()
      .from(attestationsTable)
      .where(eq(attestationsTable.address, listing.borrower))
    const attestationCount = attestationRows.filter(a => a.verified).length

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
  }))

  return c.json(enriched)
})

/** POST /api/loans — borrower creates a new open loan request. */
loanRoutes.post('/', authenticate, async (c) => {
  // TODO: create loan listing for c.var.user.address; persist off-chain
  return c.json({ error: 'not_implemented' }, 501)
})

/** GET /api/loans/:id — return a single loan listing. */
loanRoutes.get('/:id', async (c) => {
  // TODO: return single loan listing enriched with borrower chain data; 404 if not found
  return c.json({ error: 'not_implemented' }, 501)
})

/** PATCH /api/loans/:id — update terms while the listing is still open (pre-match). */
loanRoutes.patch('/:id', authenticate, async (c) => {
  // TODO: verify c.var.user.address owns this listing and it is still open; apply partial update
  return c.json({ error: 'not_implemented' }, 501)
})

/** DELETE /api/loans/:id — cancel an open listing. */
loanRoutes.delete('/:id', authenticate, async (c) => {
  // TODO: verify ownership and open status; remove listing; 404 if not found
  return c.json({ error: 'not_implemented' }, 501)
})

/** POST /api/loans/:id/fund — lender funds an open listing. */
loanRoutes.post('/:id/fund', authenticate, async (c) => {
  // TODO: verify listing is open and c.var.user is not the borrower; lock listing; initiate on-chain disbursement tx
  return c.json({ error: 'not_implemented' }, 501)
})

export default loanRoutes
