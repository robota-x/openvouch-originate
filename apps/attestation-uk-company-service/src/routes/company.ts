import { Hono } from 'hono'
import { getCompany } from '../services/companiesHouse.js'
import type { AppEnv } from '../types.js'

const app = new Hono<AppEnv>()

// GET /api/company/:number — proxies a live Companies House lookup
app.get('/:number', async (c) => {
  const number = c.req.param('number')

  if (!/^\d{8}$/.test(number) && !/^[A-Z]{2}\d{6}$/.test(number)) {
    return c.json({ error: 'invalid_company_number' }, 400)
  }

  try {
    const company = await getCompany(number, c.get('config').companiesHouseUkApiKey)
    return c.json({
      companyNumber: company.companyNumber,
      name: company.companyName,
      status: company.status,
      registeredOfficeAddress: company.registeredOfficeAddress,
      directors: company.directors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    console.log('[attestation-uk-company-service][company.lookup] lookup failed', {
      companyNumber: number,
      error: message,
    })
    if (message === 'company_not_found') return c.json({ error: message }, 404)
    if (message === 'ch_api_error:401' || message === 'ch_api_error:403') {
      return c.json({ error: 'ch_api_auth_failed' }, 502)
    }
    if (message === 'ch_api_error:429') return c.json({ error: 'ch_api_rate_limited' }, 502)
    return c.json({ error: 'ch_api_unavailable' }, 502)
  }
})

export default app
