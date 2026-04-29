import { describe, it, expect } from 'vitest'
import app from './app.js'

const ENV = { 
  JWT_SECRET: 'test-secret',
  SOLANA_RPC_URL: 'https://api.devnet.solana.com'
}

describe('GET /', () => {
  it('returns status ok', async () => {
    const res = await app.request('/', {}, ENV)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
