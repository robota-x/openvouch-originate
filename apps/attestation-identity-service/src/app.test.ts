import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getIdentity,
  saveIdentity,
  createShuftiSession,
  verifyShuftiSignature,
} = vi.hoisted(() => ({
  getIdentity: vi.fn(),
  saveIdentity: vi.fn(),
  createShuftiSession: vi.fn(),
  verifyShuftiSignature: vi.fn(),
}))

vi.mock('./store/identity-store.js', () => ({
  getIdentity,
  saveIdentity,
}))

vi.mock('./services/shufti.js', () => ({
  createShuftiSession,
  verifyShuftiSignature,
}))

import app from './app.js'

const emptyD1 = {
  prepare: (_sql: string) => ({
    bind: (..._args: unknown[]) => ({
      all: async () => ({ results: [], success: true, meta: {} }),
      run: async () => ({ success: true, meta: {} }),
      first: async () => null,
      raw: async () => [],
    }),
    all: async () => ({ results: [], success: true, meta: {} }),
    run: async () => ({ success: true, meta: {} }),
    first: async () => null,
    raw: async () => [],
  }),
  batch: async () => [],
  exec: async () => ({ count: 0, duration: 0 }),
  dump: async () => new ArrayBuffer(0),
} as unknown as D1Database

describe('identity service app', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getIdentity.mockResolvedValue(null)
    createShuftiSession.mockResolvedValue({
      reference: 'id_wallet_123',
      verification_url: 'https://provider.example/session/123',
    })
    verifyShuftiSignature.mockResolvedValue(true)
  })

  it('POST /verify/start returns local portal URL in mock mode', async () => {
    const res = await app.request('/verify/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' }),
    }, {
      IDENTITY_PROVIDER_MODE: 'mock',
      VERIFY_PORTAL_BASE_URL: 'https://frontend.example',
      DB: emptyD1,
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { sessionId: string; verificationUrl: string }
    expect(body.sessionId.startsWith('id_')).toBe(true)
    expect(body.verificationUrl.startsWith('https://frontend.example/verify/portal')).toBe(true)
  })

  it('POST /verify/start forwards provided director identity hints to portal URL in mock mode', async () => {
    const res = await app.request('/verify/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        fullName: 'Ada Lovelace',
        dob: '1815-12-10',
        country: 'GB',
      }),
    }, {
      IDENTITY_PROVIDER_MODE: 'mock',
      VERIFY_PORTAL_BASE_URL: 'https://frontend.example',
      DB: emptyD1,
    })

    expect(res.status).toBe(200)
    const body = await res.json() as { verificationUrl: string }
    const url = new URL(body.verificationUrl)
    expect(url.searchParams.get('fullName')).toBe('Ada Lovelace')
    expect(url.searchParams.get('dob')).toBe('1815-12-10')
    expect(url.searchParams.get('country')).toBe('GB')
  })

  it('POST /verify/mock-complete persists a verified identity', async () => {
    const walletAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
    const res = await app.request('/verify/mock-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'id_abc',
        walletAddress,
        fullName: 'Ada Lovelace',
        dob: '1815-12-10',
        country: 'GB',
      }),
    }, { IDENTITY_PROVIDER_MODE: 'mock', DB: emptyD1 })

    expect(res.status).toBe(200)
    expect(saveIdentity).toHaveBeenCalledTimes(1)
    expect(saveIdentity.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      walletAddress,
      fullName: 'ADA LOVELACE',
      dob: '1815-12-10',
      country: 'GB',
      reference: 'id_abc',
    }))
  })

  it('POST /verify/webhook is disabled in mock mode', async () => {
    const res = await app.request('/verify/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Signature: 'any',
      },
      body: JSON.stringify({ event: 'verification.accepted' }),
    }, { IDENTITY_PROVIDER_MODE: 'mock', DB: emptyD1 })

    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('not_enabled_in_mock_mode')
  })

  it('POST /verify/webhook accepts non-0x wallet references in real mode', async () => {
    const res = await app.request('/verify/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Signature: 'valid',
      },
      body: JSON.stringify({
        event: 'verification.accepted',
        reference: 'id_7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU_abc123',
        verification_data: {
          document: {
            first_name: 'Ada',
            last_name: 'Lovelace',
            dob: '1815-12-10',
            country: 'GB',
            document_number: 'ABC123',
          },
        },
      }),
    }, {
      IDENTITY_PROVIDER_MODE: 'real',
      SHUFTI_CLIENT_ID: 'client',
      SHUFTI_SECRET: 'secret',
      DB: emptyD1,
    })

    expect(res.status).toBe(200)
    expect(saveIdentity).toHaveBeenCalledTimes(1)
    expect(saveIdentity.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
      fullName: 'ADA LOVELACE',
      reference: 'id_7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU_abc123',
    }))
  })

  it('GET /identity/:wallet returns 404 when no identity exists', async () => {
    getIdentity.mockResolvedValueOnce(null)
    const res = await app.request('/identity/unknown', {}, { DB: emptyD1 })
    expect(res.status).toBe(404)
  })
})
