import fp from 'fastify-plugin'
import { jwtVerify, SignJWT } from 'jose'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    /** Prehandler for session-protected routes. Populates request.user on success. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    /** Sign a 7-day JWT for the given wallet address. */
    createToken: (address: string) => Promise<string>
  }
  interface FastifyRequest {
    /** Populated by fastify.authenticate() for session-protected routes. */
    user?: { address: string }
  }
}

const sessionPlugin: FastifyPluginAsync<{ jwtSecret?: string }> = async (fastify, opts) => {
  const key = opts.jwtSecret ? new TextEncoder().encode(opts.jwtSecret) : null

  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!key) { reply.code(401).send({ error: 'not_authenticated' }); return }
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) { reply.code(401).send({ error: 'not_authenticated' }); return }
    try {
      const { payload } = await jwtVerify(header.slice(7), key)
      req.user = { address: payload.sub as string }
    } catch {
      reply.code(401).send({ error: 'not_authenticated' })
    }
  })

  fastify.decorate('createToken', async (address: string): Promise<string> => {
    if (!key) throw new Error('JWT secret not configured')
    return new SignJWT({ sub: address })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(key)
  })
}

export default fp(sessionPlugin, { name: 'session' })
