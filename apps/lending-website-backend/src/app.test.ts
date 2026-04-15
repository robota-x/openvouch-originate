import { describe, it, expect } from 'vitest'
import app from './app.js'

describe('GET /', () => {
  it('returns status ok', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })
})
