import Fastify, { FastifyInstance } from 'fastify'

export function buildApp(): FastifyInstance {
  const fastify = Fastify({ logger: true })

  fastify.get('/', async () => ({ status: 'ok' }))

  return fastify
}
