import Fastify, { FastifyInstance } from 'fastify'
import dbPlugin from './plugins/db.js'
import authRoutes from './routes/auth.js'
import profileRoutes from './routes/profiles.js'
import attestationProviderRoutes from './routes/attestationProviders.js'
import loanRoutes from './routes/loans.js'

export function buildApp(d1?: D1Database): FastifyInstance {
  const fastify = Fastify({ logger: true })

  fastify.register(dbPlugin, { d1 })

  fastify.get('/', async () => ({ status: 'ok' }))

  fastify.register(authRoutes,                { prefix: '/api/auth' })
  fastify.register(profileRoutes,             { prefix: '/api/profiles' })
  fastify.register(attestationProviderRoutes, { prefix: '/api/attestation-providers' })
  fastify.register(loanRoutes,                { prefix: '/api/loans' })

  return fastify
}
