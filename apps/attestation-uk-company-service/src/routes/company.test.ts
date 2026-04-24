import { describe, it, expect, vi, afterEach } from 'vitest'
import app from '../app.js'

afterEach(() => vi.unstubAllGlobals())

const testEnv = { COMPANIES_HOUSE_UK_API_KEY: 'test-key' }

describe('GET /api/company/:number — format validation', () => {
  it('returns 400 for a non-numeric short string', async () => {
    const res = await app.request('/api/company/abc', {}, testEnv)
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('invalid_company_number')
  })

  it('returns 400 for fewer than 8 digits', async () => {
    const res = await app.request('/api/company/1234567', {}, testEnv)
    expect(res.status).toBe(400)
  })

  it('returns 400 for more than 8 digits', async () => {
    const res = await app.request('/api/company/123456789', {}, testEnv)
    expect(res.status).toBe(400)
  })

  it('returns 404 when CH API responds 404', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 404 })))
    const res = await app.request('/api/company/12345678', {}, testEnv)
    expect(res.status).toBe(404)
  })

  it('returns 502 when CH API is unavailable', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 500 })))
    const res = await app.request('/api/company/12345678', {}, testEnv)
    expect(res.status).toBe(502)
  })
})
