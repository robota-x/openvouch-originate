import { describe, it, expect, vi, afterEach } from 'vitest'
import { backendClient } from './client'
import { ApiError } from '../types'

// ── apiFetch error handling ───────────────────────────────────────────────────
// apiFetch is the only non-trivial logic in client.ts: it catches non-2xx
// responses and throws ApiError, extracting the message from the JSON body
// when available. All tests go through a public backendClient method as a
// stand-in — the specific method chosen doesn't matter.

describe('apiFetch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('throws ApiError with HTTP_{status} code and correct status on non-2xx', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response('', { status: 404, statusText: 'Not Found' })),
    )
    await expect(backendClient.getOpenRequests()).rejects.toMatchObject({
      name: 'ApiError', code: 'HTTP_404', status: 404,
    })
  })

  it('uses the JSON error field as the message when present', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ error: 'listing_not_open' }), {
          status: 409, statusText: 'Conflict',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    await expect(backendClient.getOpenRequests()).rejects.toMatchObject({
      message: 'listing_not_open',
    })
  })

  it('falls back to statusText when the body is not JSON', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(new Response('Bad Gateway', { status: 502, statusText: 'Bad Gateway' })),
    )
    await expect(backendClient.getOpenRequests()).rejects.toMatchObject({
      message: 'Bad Gateway',
    })
  })

  it('falls back to statusText when JSON body has no error field', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(
        new Response(JSON.stringify({ message: 'unexpected shape' }), {
          status: 400, statusText: 'Bad Request',
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    await expect(backendClient.getOpenRequests()).rejects.toMatchObject({
      message: 'Bad Request',
    })
  })
})

// ── ApiError class ────────────────────────────────────────────────────────────

describe('ApiError', () => {
  it('carries code, status, and message', () => {
    const err = new ApiError('not found', 'LOANS_NOT_FOUND', 404)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('ApiError')
    expect(err.message).toBe('not found')
    expect(err.code).toBe('LOANS_NOT_FOUND')
    expect(err.status).toBe(404)
  })

  it('status is optional', () => {
    const err = new ApiError('unknown', 'UNKNOWN')
    expect(err.status).toBeUndefined()
  })
})
