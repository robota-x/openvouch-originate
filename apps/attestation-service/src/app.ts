import { Hono } from 'hono'
import { cors } from 'hono/cors'
import verifyRoutes from './routes/verify.js'
import companyRoutes from './routes/company.js'
import type { AppEnv } from './types.js'

const app = new Hono<AppEnv>()

app.use('*', cors({
  origin:       '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  maxAge:       86400,
}))

app.get('/', (c) => c.json({ status: 'ok' }))

app.route('/api/verify',  verifyRoutes)
app.route('/api/company', companyRoutes)

export default app
