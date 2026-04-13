import { describe, it, expect } from 'vitest'
import { authenticate } from './auth.js'
import type { FastifyRequest, FastifyReply } from 'fastify'

describe('authenticate', () => {
  it('rejects unauthenticated requests with 401', async () => {
    let statusCode = 0
    let body: unknown

    const mockReply = {
      code: (n: number) => { statusCode = n; return mockReply },
      send: (b: unknown) => { body = b },
    } as unknown as FastifyReply

    await authenticate({} as FastifyRequest, mockReply)

    expect(statusCode).toBe(401)
    expect(body).toEqual({ error: 'not_authenticated' })
  })
})
