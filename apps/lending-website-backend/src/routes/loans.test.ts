import { describe, it, expect } from 'vitest'
import { buildApp } from '../app.js'

const validLoan = { amount: 5000, currency: 'USDC', apy: 10.5, duration: 30 }

describe('GET /api/loans', () => {
  it('returns 501 (not yet implemented)', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/loans' })
    expect(response.statusCode).toBe(501)
  })

  it('ignores unknown query params (Fastify strips them by default)', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/loans?unknownParam=1' })
    // additionalProperties are removed by Fastify's AJV config, not rejected — request still reaches handler
    expect(response.statusCode).toBe(501)
  })

})

describe('POST /api/loans', () => {
  it('returns 401 without a session', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'POST', url: '/api/loans', payload: validLoan })
    expect(response.statusCode).toBe(401)
  })

  it('returns 400 when required fields are missing', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'POST', url: '/api/loans', payload: { amount: 5000 } })
    expect(response.statusCode).toBe(400)
  })
})

describe('GET /api/loans/:id', () => {
  it('returns 501 (not yet implemented)', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/loans/loan-123' })
    expect(response.statusCode).toBe(501)
  })
})

describe('PATCH /api/loans/:id', () => {
  it('returns 401 without a session', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'PATCH', url: '/api/loans/loan-123', payload: { apy: 11.0 } })
    expect(response.statusCode).toBe(401)
  })

  it('strips unknown body fields and returns 401 (auth runs after AJV removal)', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'PATCH', url: '/api/loans/loan-123', payload: { status: 'funded' } })
    // Fastify strips additionalProperties before preHandler — body becomes {}; authenticate fires and rejects
    expect(response.statusCode).toBe(401)
  })
})

describe('DELETE /api/loans/:id', () => {
  it('returns 401 without a session', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'DELETE', url: '/api/loans/loan-123' })
    expect(response.statusCode).toBe(401)
  })
})

describe('POST /api/loans/:id/fund', () => {
  it('returns 401 without a session', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'POST', url: '/api/loans/loan-123/fund' })
    expect(response.statusCode).toBe(401)
  })
})
