import { describe, it, expect } from 'vitest'
import { buildApp } from '../app.js'

describe('POST /api/auth/challenge', () => {
  it('returns 501 (not yet implemented)', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'POST', url: '/api/auth/challenge', payload: { address: '0xabc' } })
    expect(response.statusCode).toBe(501)
  })

  it('returns 400 when address is missing', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'POST', url: '/api/auth/challenge', payload: {} })
    expect(response.statusCode).toBe(400)
  })
})

describe('POST /api/auth/verify', () => {
  it('returns 501 (not yet implemented)', async () => {
    const app = buildApp()
    const response = await app.inject({
      method:  'POST',
      url:     '/api/auth/verify',
      payload: { address: '0xabc', nonce: 'abc123', signature: 'sig' },
    })
    expect(response.statusCode).toBe(501)
  })

  it('returns 400 when any required field is missing', async () => {
    const app = buildApp()
    const response = await app.inject({
      method:  'POST',
      url:     '/api/auth/verify',
      payload: { address: '0xabc' },
    })
    expect(response.statusCode).toBe(400)
  })
})

describe('DELETE /api/auth/session', () => {
  it('returns 401 without a session', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'DELETE', url: '/api/auth/session' })
    expect(response.statusCode).toBe(401)
  })
})
