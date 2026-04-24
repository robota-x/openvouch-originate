import { Hono } from 'hono'
import { getCompany, directorNameMatches } from '../services/companiesHouse.js'
import { generateOtp, otpExpiry, isOtpValid, sendOtpEmail } from '../services/otp.js'
import { buildChallengeMessage, verifyWalletSignature } from '../services/walletVerifier.js'
import { issueAttestation, getAttestation } from '../services/attestation.js'
import { sessionStore, attestationStore } from '../store/sessions.js'
import { createAppDb } from '../db/client.js'
import type { AppEnv } from '../types.js'

interface StartBody        { walletAddress: string; companyNumber: string; directorName: string; companyEmail: string }
interface EmailConfirmBody { sessionId: string; otp: string }
interface SignBody         { sessionId: string; signature: string }

const app = new Hono<AppEnv>()

// POST /api/verify/start
app.post('/start', async (c) => {
  const body = await c.req.json<StartBody>()
  const { walletAddress, companyNumber, directorName, companyEmail } = body

  if (!walletAddress || !companyNumber || !directorName || !companyEmail) {
    return c.json({ error: 'missing_fields' }, 400)
  }

  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)

  if (await attestationStore.exists(db, walletAddress)) {
    return c.json({ error: 'wallet_already_attested' }, 409)
  }

  const config = c.get('config')
  let company
  try {
    company = await getCompany(companyNumber, config.chApiKey)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    if (msg === 'company_not_found') return c.json({ error: 'company_not_found' }, 404)
    return c.json({ error: 'ch_api_unavailable' }, 502)
  }

  if (company.status !== 'active') {
    return c.json({ error: 'company_not_active', status: company.status }, 422)
  }

  if (!directorNameMatches(directorName, company.directors)) {
    return c.json({ error: 'director_not_found' }, 422)
  }

  const otp = generateOtp()
  const challengeMessage = buildChallengeMessage(companyNumber, walletAddress)
  const session = {
    id: crypto.randomUUID(),
    walletAddress,
    companyNumber,
    directorName,
    companyEmail,
    challengeMessage,
    otp,
    otpExpiresAt: otpExpiry(),
    status: 'pending' as const,
    createdAt: Date.now(),
  }
  await sessionStore.set(db, session)
  await sendOtpEmail(companyEmail, otp, company.companyName, config)

  return c.json({ sessionId: session.id, challengeMessage, companyName: company.companyName })
})

// POST /api/verify/email-confirm — validates the OTP received by email
app.post('/email-confirm', async (c) => {
  const body = await c.req.json<EmailConfirmBody>()
  const { sessionId, otp } = body

  if (!sessionId || !otp) return c.json({ error: 'missing_fields' }, 400)

  const d1 = c.env?.DB
  if (!d1) return c.json({ error: 'not_implemented' }, 501)
  const db = createAppDb(d1)

  const session = await sessionStore.get(db, sessionId)
  if (!session) return c.json({ error: 'session_not_found' }, 404)
  if (session.status !== 'pending') return c.json({ error: 'invalid_session_state' }, 409)

  if (!isOtpValid(otp, session.otp, session.otpExpiresAt)) {
    return c.json({ error: 'invalid_otp' }, 422)
  }

  await sessionStore.update(db, sessionId, { status: 'email_verified' })
  return c.json({ success: true })
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

  // Allow skipping email OTP for hackathon demo (if status is still 'pending')
  if (session.status === 'attested') {
    return c.json({ error: 'invalid_session_state' }, 409)
  }

  const isValid = verifyWalletSignature(session.challengeMessage, signature, session.walletAddress)
  if (!isValid) return c.json({ error: 'invalid_signature' }, 422)

  const config = c.get('config')
  let companyName = ''
  try {
    const company = await getCompany(session.companyNumber, config.chApiKey)
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
// Returns {verified:false} when DB is absent (consistent with "no attestation found")
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
