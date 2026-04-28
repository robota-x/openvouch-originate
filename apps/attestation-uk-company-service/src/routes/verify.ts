import { Hono } from 'hono'
import { getCompany, directorNameMatches } from '../services/companiesHouse.js'
import { ApiIdentityProvider } from '../services/identity.js'
import { buildChallengeMessage, verifyWalletSignature } from '../services/walletVerifier.js'
import { issueAttestation, getAttestation } from '../services/attestation.js'
import { sessionStore, attestationStore } from '../store/sessions.js'
import { createAppDb } from '../db/client.js'
import type { AppEnv } from '../types.js'

interface StartBody { walletAddress: string; companyNumber: string; directorName: string }
interface SignBody  { sessionId: string; signature: string }
interface CompleteBody { sessionId: string }

const app = new Hono<AppEnv>()

// POST /api/verify/start
app.post('/start', async (c) => {
  const body = await c.req.json<StartBody>()
  const { walletAddress, companyNumber, directorName } = body

  if (!walletAddress || !companyNumber || !directorName) {
    return c.json({ error: 'missing_fields' }, 400)
  }

  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)

  if (await attestationStore.exists(db, walletAddress)) {
    return c.json({ error: 'wallet_already_attested' }, 409)
  }

  const config = c.get('config')
  
  // 1. Identity Check Prerequisite
  const identityProvider = new ApiIdentityProvider(config.identityServiceUrl)
  let identity
  try {
    identity = await identityProvider.getIdentity(walletAddress)
  } catch (err) {
    return c.json({ error: 'identity_service_unavailable' }, 502)
  }

  if (!identity) {
    // In a real app, we'd provide a link to the identity service KYC flow
    return c.json({ error: 'identity_required' }, 403)
  }

  // 2. Companies House Check
  let company
  try {
    company = await getCompany(companyNumber, config.companiesHouseUkApiKey)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    if (msg === 'company_not_found') return c.json({ error: 'company_not_found' }, 404)
    return c.json({ error: 'ch_api_unavailable' }, 502)
  }

  if (company.status !== 'active') {
    return c.json({ error: 'company_not_active', status: company.status }, 422)
  }

  // 3. Cross-Referencing (Name check)
  // We compare the director name from CoHouse with the verified name from Identity service
  if (!directorNameMatches(identity.fullName, company.directors)) {
    return c.json({ error: 'director_mismatch_with_identity', details: 'The verified identity name does not match any active director.' }, 422)
  }

  // Optional: DOB check could be added here if needed, comparing identity.dob with CoHouse partial DOB

  const challengeMessage = buildChallengeMessage(companyNumber, walletAddress)
  const session = {
    id: crypto.randomUUID(),
    walletAddress,
    companyNumber,
    directorName, // This is the CoHouse version we matched against
    challengeMessage,
    status: 'pending' as const,
    createdAt: Date.now(),
  }
  await sessionStore.set(db, session)

  return c.json({ sessionId: session.id, challengeMessage, companyName: company.companyName, verifiedIdentity: identity.fullName })
})

// POST /api/verify/sign — verifies wallet signature and issues attestation
app.post('/sign', async (c) => {
  const body = await c.req.json<SignBody>()
  const { sessionId, signature } = body

  if (!sessionId || !signature) return c.json({ error: 'missing_fields' }, 400)

  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)

  const session = await sessionStore.get(db, sessionId)
  if (!session) return c.json({ error: 'session_not_found' }, 404)

  if (session.status === 'attested') {
    return c.json({ error: 'invalid_session_state' }, 409)
  }

  const isValid = verifyWalletSignature(session.challengeMessage, signature, session.walletAddress)
  if (!isValid) return c.json({ error: 'invalid_signature' }, 422)

  const config = c.get('config')
  let companyName = ''
  try {
    const company = await getCompany(session.companyNumber, config.companiesHouseUkApiKey)
    companyName = company.companyName
  } catch {
    companyName = `Company ${session.companyNumber}`
  }

  const attestation = await issueAttestation(db, {
    walletAddress: session.walletAddress,
    companyNumber: session.companyNumber,
    companyName,
    directorName: session.directorName,
  })

  await sessionStore.update(db, sessionId, { status: 'attested' })

  return c.json({
    success: true,
    attestationAddress: attestation.attestationAddress,
    companyName,
    expiresAt: attestation.expiresAt,
  })
})

// POST /api/verify/complete — issues attestation without signature flow (prototype path)
app.post('/complete', async (c) => {
  const body = await c.req.json<CompleteBody>()
  const { sessionId } = body
  if (!sessionId) return c.json({ error: 'missing_fields' }, 400)

  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)

  const session = await sessionStore.get(db, sessionId)
  if (!session) return c.json({ error: 'session_not_found' }, 404)
  if (session.status === 'attested') return c.json({ error: 'invalid_session_state' }, 409)

  const config = c.get('config')
  let companyName = ''
  try {
    const company = await getCompany(session.companyNumber, config.companiesHouseUkApiKey)
    companyName = company.companyName
  } catch {
    companyName = `Company ${session.companyNumber}`
  }

  const attestation = await issueAttestation(db, {
    walletAddress: session.walletAddress,
    companyNumber: session.companyNumber,
    companyName,
    directorName: session.directorName,
  })

  await sessionStore.update(db, sessionId, { status: 'attested' })

  return c.json({
    success: true,
    attestationAddress: attestation.attestationAddress,
    companyName,
    expiresAt: attestation.expiresAt,
  })
})

// GET /api/verify/status/:wallet — returns attestation status for a wallet
app.get('/status/:wallet', async (c) => {
  const d1 = c.env?.DB
  if (!d1) return c.json({ verified: false })
  const db = createAppDb(d1)

  const wallet = c.req.param('wallet')
  const attestation = await getAttestation(db, wallet)

  if (!attestation || !attestation.verified || attestation.revoked) {
    return c.json({ verified: false })
  }

  const now = Math.floor(Date.now() / 1000)
  if (attestation.expiresAt < now) {
    return c.json({ verified: false, reason: 'expired' })
  }

  return c.json({
    verified: true,
    companyNumber: attestation.companyNumber,
    companyName: attestation.companyName,
    directorName: attestation.directorName,
    attestationAddress: attestation.attestationAddress,
    issuedAt: attestation.issuedAt,
    expiresAt: attestation.expiresAt,
  })
})

export default app
