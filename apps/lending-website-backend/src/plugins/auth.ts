import type { FastifyRequest, FastifyReply } from 'fastify'

// Augment FastifyRequest so protected route handlers can access the verified caller.
declare module 'fastify' {
  interface FastifyRequest {
    /** Populated by authenticate() for session-protected routes. */
    user?: { address: string }
  }
}

/**
 * Prehandler for session-protected routes.
 *
 * Usage: add `preHandler: authenticate` to any route that requires a session.
 *
 * TODO: extract the session token from the Authorization header or cookie,
 *       verify it (JWT signature / expiry), and populate request.user.
 *       Reject with 401 if missing or invalid.
 */
export async function authenticate(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  reply.code(401).send({ error: 'not_authenticated' })
}
