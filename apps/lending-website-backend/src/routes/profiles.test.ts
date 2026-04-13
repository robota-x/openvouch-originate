import { describe, it, expect } from 'vitest'
import { buildApp } from '../app.js'

describe('GET /api/profiles/:address', () => {
  it('returns 501 (not yet implemented)', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/profiles/0xabc' })
    expect(response.statusCode).toBe(501)
  })
})

describe('PATCH /api/profiles/:address', () => {
  it('returns 401 without a session', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'PATCH', url: '/api/profiles/0xabc', payload: { nickname: 'alice' } })
    expect(response.statusCode).toBe(401)
  })

  it('strips unknown body fields and returns 401 (auth runs after AJV removal)', async () => {
    const app = buildApp()
    const response = await app.inject({
      method:  'PATCH',
      url:     '/api/profiles/0xabc',
      payload: { unknownField: 'value' },
    })
    // Fastify strips additionalProperties before preHandler — body becomes {}; authenticate fires and rejects
    expect(response.statusCode).toBe(401)
  })
})
