import { describe, it, expect } from 'vitest'
import app from '../app.js'

describe('GET /api/profiles/:address', () => {
  it('returns 501 (not yet implemented)', async () => {
    const res = await app.request('/api/profiles/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')
    expect(res.status).toBe(501)
  })
})

describe('PATCH /api/profiles/:address', () => {
  it('returns 401 without a session', async () => {
    const res = await app.request('/api/profiles/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nickname: 'alice' }),
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 for unknown body fields (auth fires before handler)', async () => {
    const res = await app.request('/api/profiles/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ unknownField: 'value' }),
    })
    expect(res.status).toBe(401)
  })
})
