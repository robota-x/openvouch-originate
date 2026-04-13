// Cloudflare Workers entry point.
// TODO: adapt CF Workers Request → Fastify inject so routes in app.ts are shared.
//       For now, only the health check is handled here directly.

interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
      return Response.json({ status: 'ok' })
    }

    // TODO: forward request to buildApp(env.DB) via a CF Workers ↔ Fastify adapter
    return new Response('Not Found', { status: 404 })
  },
}
