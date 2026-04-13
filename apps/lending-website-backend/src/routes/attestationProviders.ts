import { Hono } from 'hono'
import type { AppEnv } from '../types.js'

const attestationProviderRoutes = new Hono<AppEnv>()

/** GET /api/attestation-providers — list all registered attestation providers. */
attestationProviderRoutes.get('/', async (c) => {
  // TODO: return the registry of known attestation providers (static config or DB)
  return c.json({ error: 'not_implemented' }, 501)
})

export default attestationProviderRoutes
