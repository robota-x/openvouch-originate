import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { configMiddleware } from './config.js'
import { dbMiddleware } from './middleware/db.js'
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profiles.js'
import attestationProviderRoutes from './routes/attestationProviders.js'
import loanRoutes from './routes/loans.js'
import { webhookRoutes } from './routes/webhooks.js'
import type { AppEnv } from './types.js'

export type { AppEnv }

const app = new Hono<AppEnv>()

// ── Global middleware ────────────────────────────────────────────────────────

// CORS: allow all origins. This is intentional — read routes are public by
// design, and write routes are protected by JWT auth. An origin restriction
// here would add no meaningful security while breaking legitimate API access.
app.use('*', cors({
  origin:         '*',
  allowMethods:   ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders:   ['Content-Type', 'Authorization'],
  exposeHeaders:  ['Content-Type'],
  maxAge:         86400,
}))

// Config is built first (reads env, applies defaults) so all middleware and
// routes can use c.get('config') without touching c.env directly.
app.use('*', configMiddleware)

// DB client is initialised per-request and stored in c.var.db.
// When the DB binding is absent (tests, local dev without D1), c.var.db is
// undefined and routes return 501.
app.use('*', dbMiddleware)

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok' }))

// ── Route groups ─────────────────────────────────────────────────────────────
app.route('/api/auth',                  authRoutes)
app.route('/api/profiles',             profileRoutes)
app.route('/api/attestation-providers', attestationProviderRoutes)
app.route('/api/loans',                loanRoutes)
app.route('/api/webhooks/helius',      webhookRoutes)

export default app
