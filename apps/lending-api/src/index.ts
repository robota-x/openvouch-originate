import Fastify from 'fastify'

const fastify = Fastify({ logger: true })

fastify.get('/', async () => {
  return { status: 'ok' }
})

const port = Number(process.env.PORT) || 3000

fastify.listen({ port, host: '0.0.0.0' }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})
