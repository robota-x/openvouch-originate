import { Hono } from 'hono'
import { attestationProviders as providersTable } from '../db/schema.js'
import { fixtureAttestationProviders } from '../fixtures.js'
import type { AppEnv } from '../types.js'

const attestationProviderRoutes = new Hono<AppEnv>()

/** GET /api/attestation-providers — list all registered attestation providers. */
attestationProviderRoutes.get('/', async (c) => {
  if (c.env?.FIXTURES_ENABLED === 'true') return c.json(fixtureAttestationProviders)
  const db = c.var.db
  if (!db) return c.json({ error: 'not_implemented' }, 501)
  const rows = await db.select().from(providersTable)
  return c.json(rows)
})

export default attestationProviderRoutes
