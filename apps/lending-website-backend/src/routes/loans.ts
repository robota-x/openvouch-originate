import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { loanListings, profiles as profilesTable, attestations as attestationsTable } from '../db/schema.js'
import { authenticate } from '../middleware/session.js'
import { fixtureOpenLoans, fixtureContractView } from '../fixtures.js'
import type { Db } from '../db/client.js'
import type { AppEnv } from '../types.js'

const loanRoutes = new Hono<AppEnv>()

// ── Shared enriched query ─────────────────────────────────────────────────────
//
// Single query: loan row + borrower profile + computed borrower stats.
// Uses correlated subqueries so all aggregation happens in one DB round-trip
// instead of 3×N separate queries (profile, settled loans, attestations per listing).
//
// ${loanListings.borrower} in sql`` emits the outer table column reference
// (loan_listings.borrower), which is the correct correlated reference for SQLite.

function enrichedQuery(db: Db) {
  return db
    .select({
      // Loan fields
      id:           loanListings.id,
      borrower:     loanListings.borrower,
      lender:       loanListings.lender,
      amount:       loanListings.amount,
      currency:     loanListings.currency,
      apy:          loanListings.apy,
      duration:     loanListings.duration,
      status:       loanListings.status,
      dueDate:      loanListings.dueDate,
      // Borrower profile (joined)
      nickname:     profilesTable.nickname,
      trustScore:   profilesTable.trustScore,
      // Borrower stats (correlated subqueries — aggregated DB-side)
      attestationCount: sql<number>`(
        SELECT COUNT(*) FROM ${attestationsTable}
        WHERE ${attestationsTable.address} = ${loanListings.borrower}
        AND   ${attestationsTable.verified} = 1
      )`,
      settledCount: sql<number>`(
        SELECT COUNT(*) FROM ${loanListings} sub
        WHERE sub.borrower = ${loanListings.borrower}
        AND   sub.status  != 'open'
      )`,
      totalBorrowed: sql<number>`(
        SELECT COALESCE(SUM(sub.amount), 0) FROM ${loanListings} sub
        WHERE sub.borrower = ${loanListings.borrower}
        AND   sub.status  != 'open'
      )`,
      totalRepaid: sql<number>`(
        SELECT COALESCE(SUM(sub.repaid), 0) FROM ${loanListings} sub
        WHERE sub.borrower = ${loanListings.borrower}
        AND   sub.status  != 'open'
      )`,
    })
    .from(loanListings)
    .leftJoin(profilesTable, eq(profilesTable.address, loanListings.borrower))
}

type EnrichedRow = Awaited<ReturnType<typeof enrichedQuery>>[number]

function repaymentRate(r: EnrichedRow): number {
  return r.settledCount > 0 ? Math.round(r.totalRepaid / r.totalBorrowed * 100) : 100
}

/** Shape returned by GET /api/loans — used by LoanCard (list + grid) and ContractModal. */
function toListItem(r: EnrichedRow) {
  return {
    id:               r.id,
    borrower:         r.borrower,
    nickname:         r.nickname ?? r.borrower.slice(0, 8),
    amount:           r.amount,
    currency:         r.currency,
    apy:              r.apy,
    duration:         r.duration,
    trustScore:       r.trustScore ?? 0,
    repaymentRate:    repaymentRate(r),
    attestationCount: r.attestationCount,
  }
}

/** Shape returned by GET /api/loans/:id — used by ContractModal detail view. */
function toContractView(r: EnrichedRow) {
  return {
    id:                       r.id,
    borrower:                 r.borrower,
    borrowerNickname:         r.nickname ?? r.borrower.slice(0, 8),
    borrowerTrustScore:       r.trustScore ?? 0,
    borrowerRepaymentRate:    repaymentRate(r),
    borrowerAttestationCount: r.attestationCount,
    lender:                   r.lender ?? undefined,
    amount:                   r.amount,
    currency:                 r.currency,
    apy:                      r.apy,
    duration:                 r.duration,
    status:                   r.status,
    dueDate:                  r.dueDate ?? undefined,
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/loans — open loan requests enriched with borrower stats (list + card view). */
loanRoutes.get('/', async (c) => {
  if (c.get('config').fixturesEnabled) return c.json(fixtureOpenLoans)

  const db = c.var.db
  if (!db) return c.json({ error: 'not_implemented' }, 501)
  const rows = await enrichedQuery(db).where(eq(loanListings.status, 'open'))
  return c.json(rows.map(toListItem))
})

/** GET /api/loans/:id — single loan with full ContractView detail. */
loanRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')

  if (c.get('config').fixturesEnabled) {
    const contract = fixtureContractView(id)
    if (!contract) return c.json({ error: 'not_found' }, 404)
    return c.json(contract)
  }

  const db = c.var.db
  if (!db) return c.json({ error: 'not_implemented' }, 501)
  const [row] = await enrichedQuery(db).where(eq(loanListings.id, id))
  if (!row) return c.json({ error: 'not_found' }, 404)
  return c.json(toContractView(row))
})

/** POST /api/loans — borrower posts a new open loan offer. */
loanRoutes.post('/', authenticate, async (c) => {
  const db  = c.var.db
  const raw = await c.req.json<Record<string, unknown>>()

  // id, borrower, status, and all timestamps are set server-side — never from the request.
  const forbidden = [
    'id', 'borrower', 'status', 'lender', 'repaid',
    'dueDate', 'due_date', 'onChainRef', 'on_chain_ref',
    'createdAt', 'created_at', 'updatedAt', 'updated_at',
  ]
  const attempted = forbidden.filter(k => k in raw)
  if (attempted.length > 0) {
    return c.json({ error: `fields not settable via API: ${attempted.join(', ')}` }, 400)
  }

  const body = raw as { amount?: number; currency?: string; apy?: number; duration?: number }
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
    id, borrower: c.var.user.address,
    amount, currency, apy, duration,
    status: 'open', repaid: 0,
    createdAt: now, updatedAt: now,
  })

  const [row] = await enrichedQuery(db).where(eq(loanListings.id, id))
  return c.json(toContractView(row), 201)
})

/**
 * PATCH /api/loans/:id — update terms of an open offer (borrower only, pre-fund).
 *
 * Only amount, currency, apy, and duration are user-editable.
 *
 * Fields that are NEVER accepted from external input:
 *   - createdAt / created_at — set once at creation, never changes
 *   - updatedAt / updated_at — always set to server time on every write
 *   - status                 — managed by business logic (cancel, fund)
 *   - borrower               — set at creation from the authenticated address
 *   - lender                 — set when funded via POST /:id/fund
 *   - repaid                 — updated from chain sync only
 *   - dueDate  / due_date    — computed when funded
 *   - onChainRef / on_chain_ref — written by chain sync only
 */
loanRoutes.patch('/:id', authenticate, async (c) => {
  const db  = c.var.db
  const id  = c.req.param('id')

  const [row] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  if (!row) return c.json({ error: 'not_found' }, 404)
  if (row.borrower !== c.var.user.address) return c.json({ error: 'forbidden' }, 403)
  if (row.status !== 'open') return c.json({ error: 'listing_not_open' }, 409)

  const raw = await c.req.json<Record<string, unknown>>()

  const forbidden = [
    'createdAt', 'created_at', 'updatedAt', 'updated_at',
    'status', 'borrower', 'lender', 'repaid',
    'dueDate', 'due_date', 'onChainRef', 'on_chain_ref',
  ]
  const attempted = forbidden.filter(k => k in raw)
  if (attempted.length > 0) {
    return c.json({ error: `fields not settable via API: ${attempted.join(', ')}` }, 400)
  }

  const body = raw as { amount?: number; currency?: string; apy?: number; duration?: number }
  const updates: Partial<typeof loanListings.$inferInsert> = { updatedAt: new Date() }
  if (body.amount   !== undefined) updates.amount   = body.amount
  if (body.currency !== undefined) updates.currency = body.currency
  if (body.apy      !== undefined) updates.apy      = body.apy
  if (body.duration !== undefined) updates.duration = body.duration

  await db.update(loanListings).set(updates).where(eq(loanListings.id, id))
  const [updated] = await enrichedQuery(db).where(eq(loanListings.id, id))
  return c.json(toContractView(updated))
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
