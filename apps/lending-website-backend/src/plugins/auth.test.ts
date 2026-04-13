import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import sessionPlugin from './session.js'

describe('fastify.authenticate', () => {
  it('rejects requests with no Authorization header with 401', async () => {
    const fastify = Fastify()
    await fastify.register(sessionPlugin, { jwtSecret: 'test-secret-at-least-32-chars!!' })
    await fastify.ready()

    let statusCode = 0
    let body: unknown
    const mockReply = {
      code: (n: number) => { statusCode = n; return mockReply },
      send: (b: unknown) => { body = b },
    } as unknown as FastifyReply

    await fastify.authenticate({ headers: {} } as unknown as FastifyRequest, mockReply)

    expect(statusCode).toBe(401)
    expect(body).toEqual({ error: 'not_authenticated' })
  })

  it('rejects when no JWT secret is configured', async () => {
    const fastify = Fastify()
    await fastify.register(sessionPlugin, {})
    await fastify.ready()

    let statusCode = 0
    const mockReply = {
      code: (n: number) => { statusCode = n; return mockReply },
      send: () => {},
    } as unknown as FastifyReply

    await fastify.authenticate({ headers: {} } as unknown as FastifyRequest, mockReply)
    expect(statusCode).toBe(401)
  })
})
