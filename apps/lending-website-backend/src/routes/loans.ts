import { Hono } from 'hono'
import { authenticate } from '../middleware/session.js'
import type { AppEnv } from '../types.js'

const loanRoutes = new Hono<AppEnv>()

/** GET /api/loans — list open loan requests with optional filters. */
loanRoutes.get('/', async (c) => {
  // TODO: return open loan listings from off-chain store, enriched with borrower chain data; apply query filters
  return c.json({ error: 'not_implemented' }, 501)
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
