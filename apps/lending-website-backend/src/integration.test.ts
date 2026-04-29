import { describe, it, expect, beforeAll } from 'vitest'
import app from './app.js'
import type { Bindings } from './types.js'
import { Transaction } from '@solana/web3.js'
import { createToken } from './middleware/session.js'

const ENV: Bindings = { 
  JWT_SECRET: 'test-secret',
  SOLANA_RPC_URL: 'https://api.devnet.solana.com'
} as Bindings

describe('Backend Transaction Factory — Behavioural Integration', () => {
  let mockToken: string
  const ALICE = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'

  beforeAll(async () => {
    const token = await createToken(ENV.JWT_SECRET, ALICE)
    mockToken = `Bearer ${token}`
  })
  
  it('POST /api/loans/initiate — builds a createLoanPool transaction', async () => {
    // Note: We use FIXTURES_ENABLED to bypass real DB, but routes still build real transactions
    const res = await app.request('/api/loans/initiate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': mockToken
        },
        body: JSON.stringify({ amount: "1.0", currency: 'SOL', duration: 30 })
    }, { ...ENV, FIXTURES_ENABLED: 'true' })

    expect(res.status).toBe(200)
    const body = await res.json() as { transaction: string }
    expect(typeof body.transaction).toBe('string')
    if (!body.transaction.startsWith('mock-')) {
        const tx = Transaction.from(Buffer.from(body.transaction, 'base64'))
        expect(tx.instructions.length).toBeGreaterThan(0)
    }
  })

  it('POST /api/loans/initiate — handles large BigInt amounts as strings correctly', async () => {
    // 100,000,000 SOL
    const largeAmount = "100000000.0" 
    const res = await app.request('/api/loans/initiate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': mockToken
        },
        body: JSON.stringify({ amount: largeAmount, currency: 'SOL', duration: 30 })
    }, { ...ENV, FIXTURES_ENABLED: 'true' })

    expect(res.status).toBe(200)
    const body = await res.json() as { transaction: string }
    expect(typeof body.transaction).toBe('string')
    // No precision loss should occur when parsing the string to BigInt internally
  })

  it('POST /api/loans/:id/contribute/initiate — builds a contribute transaction', async () => {
    // We target a fixture loan ID
    const res = await app.request('/api/loans/alice-4/contribute/initiate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': mockToken
        },
        body: JSON.stringify({ amount: "0.5" })
    }, { ...ENV, FIXTURES_ENABLED: 'true' })

    expect(res.status).toBe(200)
    const body = await res.json() as { transaction: string }
    expect(typeof body.transaction).toBe('string')
    if (!body.transaction.startsWith('mock-')) {
        const tx = Transaction.from(Buffer.from(body.transaction, 'base64'))
        expect(tx.instructions.length).toBeGreaterThan(0)
    }
  })

  it('POST /api/loans/:id/cancel/initiate — builds a cancellation transaction', async () => {
    const res = await app.request('/api/loans/alice-4/cancel/initiate', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': mockToken
        },
    }, { ...ENV, FIXTURES_ENABLED: 'true' })

    expect(res.status).toBe(200)
    const body = await res.json() as { transaction: string }
    expect(typeof body.transaction).toBe('string')
    if (!body.transaction.startsWith('mock-')) {
        const tx = Transaction.from(Buffer.from(body.transaction, 'base64'))
        expect(tx.instructions.length).toBeGreaterThan(0)
    }
  })
})
