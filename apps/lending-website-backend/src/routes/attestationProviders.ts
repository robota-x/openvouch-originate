import { Hono } from 'hono'
import { createAppDb } from '../db/client.js'
import { attestationProviders as providersTable } from '../db/schema.js'
import { fixtureAttestationProviders } from '../fixtures.js'
import type { AppEnv } from '../types.js'

const attestationProviderRoutes = new Hono<AppEnv>()

/** GET /api/attestation-providers — list all registered attestation providers. */
attestationProviderRoutes.get('/', async (c) => {
  if (c.get('config').fixturesEnabled) return c.json(fixtureAttestationProviders)
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const rows = await db.select().from(providersTable)
  return c.json(rows)
})

export default attestationProviderRoutes
