import { Hono } from 'hono'
import { eq, sql } from 'drizzle-orm'
import { loanListings, profiles as profilesTable, attestations as attestationsTable } from '../db/schema.js'
import { authenticate } from '../middleware/session.js'
import { createAppDb, type Db } from '../db/client.js'
import type { AppEnv } from '../types.js'
import { 
  initiateLoanCreation, 
  initiateLoanContribution,
  initiateLoanDisbursement,
  initiateLoanRepayment,
  verifyAndFinalizeLoan,
  verifyAndFinalizeContribution,
  verifyAndFinalizeDisbursement,
  verifyAndFinalizeRepayment
} from '../services/lending.js'

const loanRoutes = new Hono<AppEnv>()

// ── Shared enriched query ─────────────────────────────────────────────────────

function enrichedQuery(db: Db) {
  return db
    .select({
      id:           loanListings.id,
      borrower:     loanListings.borrower,
      lender:       loanListings.lender,
      amount:       loanListings.amount,
      raisedAmount: loanListings.raisedAmount,
      currency:     loanListings.currency,
      apy:          loanListings.apy,
      duration:     loanListings.duration,
      status:       loanListings.status,
      dueDate:      loanListings.dueDate,
      onChainRef:   loanListings.onChainRef,
      nickname:     profilesTable.nickname,
      trustScore:   profilesTable.trustScore,
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

function toListItem(r: EnrichedRow) {
  return {
    id:               r.id,
    borrower:         r.borrower,
    nickname:         r.nickname ?? r.borrower.slice(0, 8),
    amount:           r.amount,
    raisedAmount:     r.raisedAmount,
    currency:         r.currency,
    apy:              r.apy,
    duration:         r.duration,
    trustScore:       r.trustScore ?? 0,
    repaymentRate:    repaymentRate(r),
    attestationCount: r.attestationCount,
  }
}

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
    raisedAmount:             r.raisedAmount,
    currency:                 r.currency,
    apy:                      r.apy,
    duration:                 r.duration,
    status:                   r.status,
    dueDate:                  r.dueDate ?? undefined,
    onChainRef:               r.onChainRef ?? undefined,
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/loans — all open loan requests. */
loanRoutes.get('/', async (c) => {
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const rows = await enrichedQuery(db).where(eq(loanListings.status, 'open'))
  return c.json(rows.map(toListItem))
})

/** GET /api/loans/:id — detail view. */
loanRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const [row] = await enrichedQuery(db).where(eq(loanListings.id, id))
  if (!row) return c.json({ error: 'not_found' }, 404)
  return c.json(toContractView(row))
})

/** POST /api/loans/initiate — returns Base64 TX to create pool. */
loanRoutes.post('/initiate', authenticate, async (c) => {
  const body = await c.req.json<{ amount: number; currency: string; duration: number }>()
  const config = c.get('config')
  
  try {
    const result = await initiateLoanCreation(
      config,
      c.var.user.address,
      body.amount,
      body.currency,
      body.duration
    )
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

/** POST /api/loans/finalize — verify signature and record in D1. */
loanRoutes.post('/finalize', authenticate, async (c) => {
  const { signature, amount, currency, duration, apy } = await c.req.json<{ 
    signature: string, 
    amount: number, 
    currency: string, 
    duration: number,
    apy: number
  }>()
  
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const config = c.get('config')

  try {
    await verifyAndFinalizeLoan(config, signature)

    const id = crypto.randomUUID()
    const now = new Date()
    await db.insert(loanListings).values({
      id, 
      borrower: c.var.user.address,
      amount, 
      currency, 
      apy, 
      duration,
      status: 'open', 
      raisedAmount: 0,
      repaid: 0,
      onChainRef: signature,
      createdAt: now, 
      updatedAt: now,
    })

    return c.json({ id, success: true }, 201)
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

/** POST /api/loans/:id/contribute/initiate — returns Base64 TX to contribute to pool. */
loanRoutes.post('/:id/contribute/initiate', authenticate, async (c) => {
  const id = c.req.param('id')
  const { amount } = await c.req.json<{ amount: number }>()
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const config = c.get('config')

  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  if (!loan) return c.json({ error: 'not_found' }, 404)
  if (loan.borrower !== c.var.user.address) return c.json({ error: 'forbidden' }, 403)
  if (!loan.onChainRef) return c.json({ error: 'no_on_chain_pool' }, 400)

  try {
    const result = await initiateLoanContribution(
      config,
      c.var.user.address,
      loan.onChainRef,
      amount
    )
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

/** POST /api/loans/:id/contribute/finalize — verify signature and update D1. */
loanRoutes.post('/:id/contribute/finalize', authenticate, async (c) => {
  const id = c.req.param('id')
  const { signature, amount } = await c.req.json<{ signature: string, amount: number }>()
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const config = c.get('config')

  try {
    await verifyAndFinalizeContribution(config, signature, id, amount, db)
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

/** POST /api/loans/:id/disburse/initiate — returns Base64 TX to disburse funds. */
loanRoutes.post('/:id/disburse/initiate', authenticate, async (c) => {
  const id = c.req.param('id')
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const config = c.get('config')

  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  if (!loan) return c.json({ error: 'not_found' }, 404)
  if (loan.borrower !== c.var.user.address) return c.json({ error: 'forbidden' }, 403)
  if (!loan.onChainRef) return c.json({ error: 'no_on_chain_pool' }, 400)

  try {
    const result = await initiateLoanDisbursement(
      config,
      c.var.user.address,
      loan.onChainRef
    )
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

/** POST /api/loans/:id/disburse/finalize — verify signature and update D1. */
loanRoutes.post('/:id/disburse/finalize', authenticate, async (c) => {
  const id = c.req.param('id')
  const { signature } = await c.req.json<{ signature: string }>()
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const config = c.get('config')

  try {
    await verifyAndFinalizeDisbursement(config, signature, id, db)
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

/** POST /api/loans/:id/repay/initiate — returns Base64 TX to repay funds. */
loanRoutes.post('/:id/repay/initiate', authenticate, async (c) => {
  const id = c.req.param('id')
  const { installmentNumber, amount } = await c.req.json<{ installmentNumber: number, amount: number }>()
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const config = c.get('config')

  const [loan] = await db.select().from(loanListings).where(eq(loanListings.id, id))
  if (!loan) return c.json({ error: 'not_found' }, 404)
  if (loan.borrower !== c.var.user.address) return c.json({ error: 'forbidden' }, 403)
  if (!loan.onChainRef) return c.json({ error: 'no_on_chain_pool' }, 400)

  try {
    const result = await initiateLoanRepayment(
      config,
      c.var.user.address,
      loan.onChainRef,
      installmentNumber,
      amount
    )
    return c.json(result)
  } catch (e: any) {
    return c.json({ error: e.message }, 500)
  }
})

/** POST /api/loans/:id/repay/finalize — verify signature and update D1. */
loanRoutes.post('/:id/repay/finalize', authenticate, async (c) => {
  const id = c.req.param('id')
  const { signature, amount } = await c.req.json<{ signature: string, amount: number }>()
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const config = c.get('config')

  try {
    await verifyAndFinalizeRepayment(config, signature, id, amount, db)
    return c.json({ success: true })
  } catch (e: any) {
    return c.json({ error: e.message }, 400)
  }
})

export default loanRoutes
