import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { configMiddleware } from './config.js'
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profiles.js'
import attestationProviderRoutes from './routes/attestationProviders.js'
import loanRoutes from './routes/loans.js'
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

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok' }))

// ── Route groups ─────────────────────────────────────────────────────────────
app.route('/api/auth',                  authRoutes)
app.route('/api/profiles',             profileRoutes)
app.route('/api/attestation-providers', attestationProviderRoutes)
app.route('/api/loans',                loanRoutes)

export default app


