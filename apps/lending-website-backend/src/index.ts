// Local development entry point — NOT deployed to Cloudflare Workers.
// Uses @hono/node-server to run the Hono app on a standard Node.js HTTP server.
import { serve } from '@hono/node-server'
import app from './app.js'

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, () => {
  console.log(`Backend running on http://localhost:${port}`)
})


