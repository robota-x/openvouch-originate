import { describe, it, expect } from 'vitest'
import app from '../app.js'

function post(url: string, body: unknown) {
  return app.request(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

describe('POST /api/auth/challenge', () => {
  it('returns 501 when DB binding is absent', async () => {
    const res = await post('/api/auth/challenge', { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' })
    expect(res.status).toBe(501)
  })

  it('returns 400 when address is missing', async () => {
    const res = await post('/api/auth/challenge', {})
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/verify', () => {
  it('returns 501 when DB binding is absent', async () => {
    const res = await post('/api/auth/verify', {
      address:   '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      nonce:     'abc123',
      signature: 'sig',
    })
    expect(res.status).toBe(501)
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await post('/api/auth/verify', { address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/auth/session', () => {
  it('returns 401 without a session', async () => {
    const res = await app.request('/api/auth/session', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })
})
