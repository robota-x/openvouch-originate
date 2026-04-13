import { Hono } from 'hono'
import { authenticate } from '../middleware/session.js'
import type { AppEnv } from '../types.js'

const profileRoutes = new Hono<AppEnv>()

/** GET /api/profiles/:address — full public profile (chain-derived + off-chain fields). */
profileRoutes.get('/:address', async (c) => {
  // TODO: derive attestation PDA + loan PDA from address, hydrate from chain cache, merge off-chain fields
  return c.json({ error: 'not_implemented' }, 501)
})

/** PATCH /api/profiles/:address — update off-chain fields (own profile only). */
profileRoutes.patch('/:address', authenticate, async (c) => {
  // TODO: verify c.var.user.address === c.req.param('address'), apply off-chain field updates
  return c.json({ error: 'not_implemented' }, 501)
})

export default profileRoutes
