import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import { configMiddleware } from './config.js'
import { createShuftiSession, verifyShuftiSignature } from './services/shufti.js'
import { createAppDb } from './db/client.js'
import { getIdentity, saveIdentity } from './store/identity-store.js'
import type { AppEnv } from './types.js'

const app = new Hono<AppEnv>()

app.use('*', cors())
app.use('*', configMiddleware)

app.get('/', (c) => c.json({ status: 'ok', service: 'identity-service' }))

function buildReference(walletAddress: string): string {
  return `id_${walletAddress.toLowerCase()}_${crypto.randomUUID().split('-')[0]}`
}

function parseWalletFromReference(reference: unknown): string | null {
  if (typeof reference !== 'string') return null
  const parts = reference.split('_')
  if (parts.length < 3 || parts[0] !== 'id') return null
  const wallet = parts[1]
  // Keep format-agnostic for hackathon: supports Solana-style base58 and avoids hardcoding chain assumptions.
  if (!wallet || wallet.length < 16) return null
  return wallet
}

// GET /identity/:wallet
app.get('/identity/:wallet', async (c) => {
  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)
  const wallet = c.req.param('wallet')
  const identity = await getIdentity(db, wallet)
  
  if (!identity) {
    return c.json({ verified: false }, 404)
  }
  
  return c.json({
    verified: true,
    identity: {
      fullName: identity.fullName,
      dob: identity.dob,
      country: identity.country,
      verifiedAt: identity.verifiedAt
    }
  })
})

// POST /verify/start
app.post('/verify/start', async (c) => {
  const { walletAddress, redirectUrl, fullName, dob, country } = await c.req.json<{
    walletAddress: string
    redirectUrl?: string
    fullName?: string
    dob?: string
    country?: string
  }>()
  const config = c.get('config')
  
  if (!walletAddress) {
    return c.json({ error: 'missing_wallet_address' }, 400)
  }

  const reference = buildReference(walletAddress)

  if (config.identityProviderMode === 'mock') {
    const url = new URL('/verify/portal', config.verifyPortalBaseUrl)
    url.searchParams.set('sessionId', reference)
    url.searchParams.set('walletAddress', walletAddress)
    if (redirectUrl) url.searchParams.set('redirectUrl', redirectUrl)
    if (fullName) url.searchParams.set('fullName', fullName)
    if (dob) url.searchParams.set('dob', dob)
    if (country) url.searchParams.set('country', country)
    return c.json({
      sessionId: reference,
      verificationUrl: url.toString(),
    })
  }

  try {
    const session = await createShuftiSession(config, reference, walletAddress, redirectUrl)
    return c.json({
      sessionId: session.reference,
      verificationUrl: session.verification_url
    })
  } catch (err) {
    console.error('Shufti session creation failed:', err)
    return c.json({ error: 'verification_init_failed' }, 500)
  }
})

async function completeVerification(c: Context<AppEnv>) {
  const config = c.get('config')
  if (config.identityProviderMode !== 'mock') {
    return c.json({ error: 'not_enabled_in_real_mode' }, 404)
  }

  const {
    sessionId,
    walletAddress,
    fullName,
    dob,
    country,
  } = await c.req.json<{
    sessionId?: string
    walletAddress?: string
    fullName?: string
    dob?: string
    country?: string
  }>()

  if (!sessionId || !walletAddress || !fullName) {
    return c.json({ error: 'missing_fields' }, 400)
  }

  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)

  await saveIdentity(db, {
    walletAddress,
    fullName: fullName.toUpperCase(),
    dob: dob ?? '1990-01-01',
    country: country ?? 'GB',
    verifiedAt: Date.now(),
    reference: sessionId,
  })

  return c.json({ success: true, verified: true })
}

// POST /verify/complete
app.post('/verify/complete', completeVerification)

// POST /verify/mock-complete (legacy alias)
app.post('/verify/mock-complete', completeVerification)

// POST /verify/webhook
app.post('/verify/webhook', async (c) => {
  const config = c.get('config')
  if (config.identityProviderMode === 'mock') {
    return c.json({ error: 'not_enabled_in_mock_mode' }, 400)
  }
  const signature = c.req.header('Signature')
  const rawBody = await c.req.text()

  if (!signature) {
    return c.json({ error: 'missing_signature' }, 401)
  }

  const isValid = await verifyShuftiSignature(rawBody, signature, config.shuftiSecret)
  if (!isValid) {
    return c.json({ error: 'invalid_signature' }, 401)
  }

  const payload = JSON.parse(rawBody)
  const event = payload.event

  if (event === 'verification.accepted') {
    const verificationData = payload.verification_data?.document
    const reference = payload.reference
    const walletAddress = parseWalletFromReference(reference)

    if (!walletAddress) {
        console.error('Could not parse wallet from reference:', reference)
        return c.json({ error: 'unknown_reference' }, 400)
    }

    const d1 = c.env?.DB
    if (!d1) return c.json({ error: 'not_implemented' }, 501)
    const db = createAppDb(d1)

    await saveIdentity(db, {
      walletAddress,
      fullName: `${verificationData.first_name} ${verificationData.last_name}`.toUpperCase(),
      dob: verificationData.dob,
      country: verificationData.country || 'GB',
      documentNumber: verificationData.document_number,
      verifiedAt: Date.now(),
      reference: String(reference),
    })
  }

  return c.json({ success: true })
})

export default app
