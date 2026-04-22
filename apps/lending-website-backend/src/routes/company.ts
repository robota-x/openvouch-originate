import type { FastifyInstance } from 'fastify'
import { getCompany } from '../services/companiesHouse.js'

export async function companyRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /company/:number
   * Proxies a live Companies House lookup and returns sanitised company info.
   */
  fastify.get<{ Params: { number: string } }>('/company/:number', async (req, reply) => {
    const { number } = req.params

    if (!/^\d{8}$/.test(number) && !/^[A-Z]{2}\d{6}$/.test(number)) {
      return reply.status(400).send({ error: 'invalid_company_number' })
    }

  try {
    const company = await getCompany(number)
    return c.json({
      companyNumber: company.companyNumber,
      name: company.companyName,
      status: company.status,
      registeredOfficeAddress: company.registeredOfficeAddress,
      directors: company.directors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    if (message === 'company_not_found') return c.json({ error: message }, 404)
    return c.json({ error: 'ch_api_unavailable' }, 502)
  }
})

export default app


