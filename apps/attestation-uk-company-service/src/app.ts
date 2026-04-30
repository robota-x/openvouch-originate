import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { configMiddleware } from './config.js'
import verifyRoutes from './routes/verify.js'
import companyRoutes from './routes/company.js'
import type { AppEnv } from './types.js'

const app = new Hono<AppEnv>()

app.use('*', cors({
  origin:       (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge:       86400,
  credentials:  true,
}))

app.use('*', configMiddleware)

app.onError((err, c) => {
  console.error('[App Error]', err)
  const origin = c.req.header('Origin')
  const headers = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  }
  return c.json({ error: 'internal_server_error', message: err instanceof Error ? err.message : 'unknown' }, 500, headers)
})

app.get('/', (c) => c.json({ status: 'ok' }))

app.route('/api/verify',  verifyRoutes)
app.route('/api/company', companyRoutes)

export default app
