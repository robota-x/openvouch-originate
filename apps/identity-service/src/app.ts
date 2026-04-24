import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { configMiddleware } from './config.js'
import { createShuftiSession, verifyShuftiSignature } from './services/shufti.js'
import { getIdentity, saveIdentity } from './store/file-registry.js'
import type { AppEnv } from './types.js'

const app = new Hono<AppEnv>()

app.use('*', cors())
app.use('*', configMiddleware)

app.get('/', (c) => c.json({ status: 'ok', service: 'identity-service' }))

// GET /identity/:wallet
app.get('/identity/:wallet', async (c) => {
  const wallet = c.req.param('wallet')
  const identity = await getIdentity(wallet)
  
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
  const { walletAddress, redirectUrl } = await c.req.json<{ walletAddress: string, redirectUrl?: string }>()
  const config = c.get('config')
  
  if (!walletAddress) {
    return c.json({ error: 'missing_wallet_address' }, 400)
  }

  // Check if already verified
  const existing = await getIdentity(walletAddress)
  if (existing) {
    return c.json({ error: 'already_verified', identity: existing }, 409)
  }

  // Reference must be alphanumeric (plus some chars) for Shufti
  // We use vouch_<wallet>_<random>
  const reference = `vouch_${walletAddress.toLowerCase()}_${crypto.randomUUID().split('-')[0]}`
  
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

// POST /verify/webhook
app.post('/verify/webhook', async (c) => {
  const config = c.get('config')
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
    const info = payload.info
    
    // We'd need to know which wallet this belongs to. 
    // Usually Shufti allows passing custom parameters or we use the reference.
    // For this MVP, let's assume we can find the wallet from the reference if we had a mapping.
    // To keep it simple, we'll try to get it from a 'custom_data' field if we had one,
    // but Shufti typically uses the reference. 
    // Let's assume the reference was vouch_WALLETADDRESS or similar for this demo.
    const reference = payload.reference as string
    // Reference format: vouch_<wallet>_<random>
    const parts = reference.split('_')
    const walletAddress = (parts.length >= 2 && parts[0] === 'vouch') ? parts[1] : 'unknown'

    if (walletAddress === 'unknown' || !walletAddress.startsWith('0x')) {
        console.error('Could not parse wallet from reference:', reference)
        return c.json({ error: 'unknown_reference' }, 400)
    }

    await saveIdentity({
      walletAddress,
      fullName: `${verificationData.first_name} ${verificationData.last_name}`.toUpperCase(),
      dob: verificationData.dob,
      country: verificationData.country || 'GB',
      documentNumber: verificationData.document_number,
      verifiedAt: Date.now(),
      reference
    })
  }

  return c.json({ success: true })
})

export default app
