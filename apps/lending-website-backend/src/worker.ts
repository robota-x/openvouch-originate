// Cloudflare Workers entry point.
// Hono's fetch handler IS the CF Workers fetch handler — no bridge or adapter needed.
// Bindings (DB, JWT_SECRET) are injected by the Workers runtime and available via c.env.
import app from './app.js'

export default app
