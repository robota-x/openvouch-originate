import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { attestationProviders as providersTable } from '../db/schema.js'
import { fixtureAttestationProviders } from '../fixtures.js'
import type { AppEnv } from '../types.js'

const attestationProviderRoutes = new Hono<AppEnv>()

/** GET /api/attestation-providers — list all registered attestation providers. */
attestationProviderRoutes.get('/', async (c) => {
  if (c.env?.FIXTURES_ENABLED === 'true') return c.json(fixtureAttestationProviders)
  const db = c.var.db

  const rows = await db.select().from(providersTable)
  return c.json(rows.map(r => ({
    id:          r.id,
    name:        r.name,
    wallet:      r.wallet,
    website:     r.website,
    claimUrl:    r.claimUrl,
    description: r.description,
  })))
})

export default attestationProviderRoutes
