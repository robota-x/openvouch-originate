import { createMiddleware } from 'hono/factory'
import { jwtVerify, SignJWT } from 'jose'
import type { AppEnv } from '../types.js'

/**
 * Middleware for session-protected routes.
 * Reads JWT_SECRET from c.env, verifies the Bearer token, and sets c.var.user.
 * Returns 401 if the secret is absent (tests/dev without binding) or the token is invalid.
 */
export const authenticate = createMiddleware<AppEnv>(async (c, next) => {
  const secret = c.env?.JWT_SECRET
  if (!secret) {
    return c.json({ error: 'not_authenticated' }, 401)
  }

  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'not_authenticated' }, 401)
  }

  try {
    const key = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(header.slice(7), key)
    c.set('user', { address: payload.sub as string })
    await next()
  } catch {
    return c.json({ error: 'not_authenticated' }, 401)
  }
})

/** Sign a 7-day HS256 JWT for the given wallet address. */
export async function createToken(secret: string, address: string): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT({ sub: address })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}
