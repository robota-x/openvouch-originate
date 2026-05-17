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
  origin:         (origin) => origin || '*',
  allowMethods:   ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders:   ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders:  ['Content-Type'],
  maxAge:         86400,
  credentials:    true,
}))

// Config is built first (reads env, applies defaults) so all middleware and
// routes can use c.get('config') without touching c.env directly.
app.use('*', configMiddleware)

// Global error handler to ensure CORS headers are preserved even on crashes
app.onError((err, c) => {
  console.error('[App Error]', err)
  const origin = c.req.header('Origin')
  const headers = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  }
  
  if (err instanceof Error && err.message.includes('required')) {
    return c.json({ error: 'config_error', message: err.message }, 500, headers)
  }
  
  return c.json({ error: 'internal_server_error' }, 500, headers)
})

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (c) => c.json({ status: 'ok' }))

// ── Route groups ─────────────────────────────────────────────────────────────
app.route('/api/auth',                  authRoutes)
app.route('/api/profiles',             profileRoutes)
app.route('/api/attestation-providers', attestationProviderRoutes)
app.route('/api/loans',                loanRoutes)

export default app


