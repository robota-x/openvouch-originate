import { describe, it, expect } from 'vitest'
import app from '../app.js'
import type { Bindings } from '../types.js'

// Tests run without a D1 binding and without a real Helius delivery.
// We only test the auth gate and the envelope-level validation.
// Instruction decoding and DB writes are tested separately when a D1 fixture
// harness exists.

const AUTH = 'test-webhook-secret-32-chars-xxxx'
const ENV: Bindings = { HELIUS_WEBHOOK_AUTH: AUTH } as Bindings

function post(body: unknown, authHeader?: string) {
  return app.request(
    '/api/webhooks/helius',
    {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader !== undefined ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    },
    ENV,
  )
}

describe('POST /api/webhooks/helius — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await post([])
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'unauthorized' })
  })

  it('returns 401 when Authorization header is wrong', async () => {
    const res = await post([], 'wrong-secret')
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'unauthorized' })
  })

  it('returns 401 when HELIUS_WEBHOOK_AUTH binding is not configured', async () => {
    const res = await app.request(
      '/api/webhooks/helius',
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: AUTH },
        body:    JSON.stringify([]),
      },
      // No HELIUS_WEBHOOK_AUTH in env
      {} as Bindings,
    )
    expect(res.status).toBe(401)
    expect(await res.json()).toMatchObject({ error: 'webhook_not_configured' })
  })
})

describe('POST /api/webhooks/helius — envelope validation', () => {
  it('returns 200 for valid auth + empty transaction array', async () => {
    const res = await post([], AUTH)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('returns 200 for valid auth + transaction with unknown programId (silently skipped)', async () => {
    const payload = [
      {
        signature: 'fake-sig',
        slot: 1,
        timestamp: 1700000000,
        fee: 5000,
        feePayer: 'SomePayer',
        type: 'UNKNOWN',
        source: 'UNKNOWN',
        description: '',
        transactionError: null,
        accountData: [],
        nativeTransfers: [],
        tokenTransfers: [],
        instructions: [
          {
            programId: 'UnknownProgram1111111111111111111111111111',
            accounts: [],
            data: 'somedata',
            innerInstructions: [],
          },
        ],
      },
    ]
    const res = await post(payload, AUTH)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
  })

  it('returns 400 when body is not a JSON array', async () => {
    const res = await post({ not: 'an array' }, AUTH)
    expect(res.status).toBe(400)
  })
})
