import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { verifyAsync as ed25519Verify } from '@noble/ed25519'
import bs58 from 'bs58'
import { authNonces, profiles } from '../db/schema.js'
import { authenticate, createToken } from '../middleware/session.js'
import type { AppEnv } from '../types.js'

// Signing message displayed to the user in their wallet. Must match the frontend exactly.
function buildSignMessage(nonce: string): Uint8Array {
  return new TextEncoder().encode(
    `Sign this message to authenticate with OpenVouch Originate.\n\nNonce: ${nonce}`
  )
}

const authRoutes = new Hono<AppEnv>()

/** POST /api/auth/challenge — issue a nonce for a wallet address to sign. */
authRoutes.post('/challenge', async (c) => {
  const { address } = await c.req.json<{ address?: string }>()
  if (!address) return c.json({ error: 'address is required' }, 400)

  const db = c.var.db
  if (!db) return c.json({ error: 'not_implemented' }, 501)

  const nonce     = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await db
    .insert(authNonces)
    .values({ address, nonce, expiresAt })
    .onConflictDoUpdate({ target: authNonces.address, set: { nonce, expiresAt } })

  return c.json({ nonce })
})

/** POST /api/auth/verify — verify signed nonce, return session token. */
authRoutes.post('/verify', async (c) => {
  const { address, nonce: _nonce, signature } = await c.req.json<{
    address?: string; nonce?: string; signature?: string
  }>()
  // _nonce is validated for protocol completeness (client must prove it received the challenge)
  // but its value is never used — we always use row.nonce from the DB. This prevents a client
  // from substituting a different nonce value after the challenge was issued.
  if (!address || !_nonce || !signature) return c.json({ error: 'address, nonce and signature are required' }, 400)

  const db = c.var.db
  if (!db) return c.json({ error: 'not_implemented' }, 501)

  const [row] = await db.select().from(authNonces).where(eq(authNonces.address, address))
  if (!row || row.expiresAt < new Date()) {
    return c.json({ error: 'invalid_nonce' }, 401)
  }

  // Decode base64 signature without using Buffer (not available in CF Workers without nodejs_compat)
  const sigBytes = Uint8Array.from(atob(signature), ch => ch.charCodeAt(0))

  let pubKeyBytes: Uint8Array
  try {
    pubKeyBytes = bs58.decode(address)
  } catch {
    return c.json({ error: 'invalid_address' }, 400)
  }
  const isValid     = await ed25519Verify(sigBytes, buildSignMessage(row.nonce), pubKeyBytes)
  if (!isValid) return c.json({ error: 'invalid_signature' }, 401)

  await db.delete(authNonces).where(eq(authNonces.address, address))

  // Ensure a profile row exists for this address. Uses INSERT OR IGNORE semantics
  // (onConflictDoNothing) so repeat logins never overwrite existing profile data.
  const now = new Date()
  await db
    .insert(profiles)
    .values({ address, createdAt: now, updatedAt: now })
    .onConflictDoNothing()

  const secret = c.get('config').jwtSecret
  if (!secret) return c.json({ error: 'not_implemented' }, 501)

  const token = await createToken(secret, address)
  return c.json({ token })
})

/** DELETE /api/auth/session — stateless no-op; client discards the token. */
// NOTE: JWT is stateless — true revocation would require a D1 denylist (deferred).
// This endpoint exists for UX completeness. Clients must discard the token on logout.
authRoutes.delete('/session', authenticate, async (c) => {
  return c.body(null, 204)
})

export default authRoutes
