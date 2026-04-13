// Cloudflare Workers entry point.
// Mirrors the routes defined in app.ts.
// For local development, use `npm run dev` which runs the Fastify server.

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
      return Response.json({ status: 'ok' })
    }

    return new Response('Not Found', { status: 404 })
  },
}
