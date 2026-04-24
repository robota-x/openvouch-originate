import { Hono } from 'hono'
import { randomUUID } from 'crypto'
import { getCompany, directorNameMatches } from '../services/companiesHouse.js'
import { generateOtp, otpExpiry, isOtpValid, sendOtpEmail } from '../services/otp.js'
import { buildChallengeMessage, verifyWalletSignature } from '../services/walletVerifier.js'
import { issueAttestation, getAttestation } from '../services/attestation.js'
import { sessionStore, attestationStore } from '../store/sessions.js'
import type { AppEnv } from '../types.js'

interface StartBody        { walletAddress: string; companyNumber: string; directorName: string; companyEmail: string }
interface EmailConfirmBody { sessionId: string; otp: string }
interface SignBody         { sessionId: string; signature: string }

const app = new Hono<AppEnv>()

// POST /api/verify/start
// 1. Validates company exists and is active via live CH API
// 2. Confirms the claimed director is in the officer list
// 3. Sends an OTP to the company email (logged in dev mode)
// 4. Returns a sessionId and wallet challenge message
app.post('/start', async (c) => {
  const body = await c.req.json<StartBody>()
  const { walletAddress, companyNumber, directorName, companyEmail } = body

  if (!walletAddress || !companyNumber || !directorName || !companyEmail) {
    return c.json({ error: 'missing_fields' }, 400)
  }

  if (attestationStore.exists(walletAddress)) {
    return c.json({ error: 'wallet_already_attested' }, 409)
  }

  let company
  try {
    company = await getCompany(companyNumber)
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
    id: randomUUID(),
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
  sessionStore.set(session)

  await sendOtpEmail(companyEmail, otp, company.companyName)

  return c.json({ sessionId: session.id, challengeMessage, companyName: company.companyName })
})

// POST /api/verify/email-confirm — validates the OTP received by email
app.post('/email-confirm', async (c) => {
  const { sessionId, otp } = await c.req.json<EmailConfirmBody>()
  if (!sessionId || !otp) return c.json({ error: 'missing_fields' }, 400)

  const session = sessionStore.get(sessionId)
  if (!session) return c.json({ error: 'session_not_found' }, 404)
  if (session.status !== 'pending') return c.json({ error: 'invalid_session_state' }, 409)

  if (!isOtpValid(otp, session.otp, session.otpExpiresAt)) {
    return c.json({ error: 'invalid_otp' }, 422)
  }

  sessionStore.update(sessionId, { status: 'email_verified' })
  return c.json({ success: true })
})

// POST /api/verify/sign
// 1. Verifies wallet signature against the challenge message
// 2. Issues an on-chain attestation record
app.post('/sign', async (c) => {
  const { sessionId, signature } = await c.req.json<SignBody>()
  if (!sessionId || !signature) return c.json({ error: 'missing_fields' }, 400)

  const session = sessionStore.get(sessionId)
  if (!session) return c.json({ error: 'session_not_found' }, 404)

  // Allow skipping email OTP for hackathon demo (if status is still 'pending')
  if (session.status === 'attested') {
    return c.json({ error: 'invalid_session_state' }, 409)
  }

  const isValid = verifyWalletSignature(session.challengeMessage, signature, session.walletAddress)
  if (!isValid) return c.json({ error: 'invalid_signature' }, 422)

  let companyName = ''
  try {
    const company = await getCompany(session.companyNumber)
    companyName = company.companyName
  } catch {
    companyName = `Company ${session.companyNumber}`
  }

  const attestation = await issueAttestation({
    walletAddress: session.walletAddress,
    companyNumber: session.companyNumber,
    companyName,
    directorName: session.directorName,
  })

  sessionStore.update(sessionId, { status: 'attested' })

  return c.json({
    success: true,
    attestationAddress: attestation.attestationAddress,
    companyName,
    expiresAt: attestation.expiresAt,
  })
})

// GET /api/verify/status/:wallet — returns attestation status for a wallet
// Used by the lending website to gate loan requests
app.get('/status/:wallet', (c) => {
  const wallet = c.req.param('wallet')
  const attestation = getAttestation(wallet)

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
