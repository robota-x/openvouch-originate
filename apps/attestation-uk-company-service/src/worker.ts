// Cloudflare Workers entry point.
// Hono's fetch handler IS the CF Workers fetch handler — no bridge or adapter needed.
// Bindings (COMPANIES_HOUSE_UK_API_KEY, SENDGRID_KEY, EMAIL_FROM) are injected by the Workers runtime and available via c.env.
import app from './app.js'

export default app
