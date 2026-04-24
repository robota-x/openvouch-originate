import { randomUUID } from 'crypto'
import type { FastifyInstance } from 'fastify'
import { getCompany, directorNameMatches } from '../services/companiesHouse.js'
import { generateOtp, otpExpiry, isOtpValid, sendOtpEmail } from '../services/otp.js'
import { buildChallengeMessage, verifyWalletSignature } from '../services/walletVerifier.js'
import { issueAttestation, getAttestation } from '../services/attestation.js'
import { sessionStore, attestationStore } from '../store/sessions.js'

// ── Input shapes ──────────────────────────────────────────────────────────────

interface StartBody {
  walletAddress: string
  companyNumber: string
  directorName: string
  companyEmail: string
}

interface EmailConfirmBody {
  sessionId: string
  otp: string
}

interface SignBody {
  sessionId: string
  signature: string // base64-encoded Ed25519 signature from Phantom
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function verifyRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /verify/start
   * 1. Validates the company exists and is active via live CH API
   * 2. Confirms the claimed director is in the officer list
   * 3. Sends an OTP to the company email (logged in dev mode)
   * 4. Returns a sessionId and the wallet challenge message
   */
  fastify.post<{ Body: StartBody }>('/verify/start', async (req, reply) => {
    const { walletAddress, companyNumber, directorName, companyEmail } = req.body

    if (!walletAddress || !companyNumber || !directorName || !companyEmail) {
      return reply.status(400).send({ error: 'missing_fields' })
    }

    // Block duplicate attestations
    if (attestationStore.exists(walletAddress)) {
      return reply.status(409).send({ error: 'wallet_already_attested' })
    }

    // Live Companies House lookup
    let company
    try {
      company = await getCompany(companyNumber)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      if (msg === 'company_not_found') return reply.status(404).send({ error: 'company_not_found' })
      return reply.status(502).send({ error: 'ch_api_unavailable' })
    }

    if (company.status !== 'active') {
      return reply.status(422).send({ error: 'company_not_active', status: company.status })
    }

    if (!directorNameMatches(directorName, company.directors)) {
      return reply.status(422).send({ error: 'director_not_found' })
    }

    // Generate OTP and challenge
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

    // Send OTP (logged to console in dev mode)
    await sendOtpEmail(companyEmail, otp, company.companyName)

    return reply.send({
      sessionId: session.id,
      challengeMessage,
      companyName: company.companyName,
    })
  })

  /**
   * POST /verify/email-confirm
   * Validates the OTP the user received by email.
   */
  fastify.post<{ Body: EmailConfirmBody }>('/verify/email-confirm', async (req, reply) => {
    const { sessionId, otp } = req.body
    if (!sessionId || !otp) return reply.status(400).send({ error: 'missing_fields' })

    const session = sessionStore.get(sessionId)
    if (!session) return reply.status(404).send({ error: 'session_not_found' })
    if (session.status !== 'pending') return reply.status(409).send({ error: 'invalid_session_state' })

    if (!isOtpValid(otp, session.otp, session.otpExpiresAt)) {
      return reply.status(422).send({ error: 'invalid_otp' })
    }

    sessionStore.update(sessionId, { status: 'email_verified' })
    return reply.send({ success: true })
  })

  /**
   * POST /verify/sign
   * 1. Verifies the wallet signature against the challenge message
   * 2. Issues an on-chain attestation record
   */
  fastify.post<{ Body: SignBody }>('/verify/sign', async (req, reply) => {
    const { sessionId, signature } = req.body
    if (!sessionId || !signature) return reply.status(400).send({ error: 'missing_fields' })

    const session = sessionStore.get(sessionId)
    if (!session) return reply.status(404).send({ error: 'session_not_found' })

    // Allow skipping email OTP for hackathon demo (if status is still 'pending')
    if (session.status === 'attested') {
      return reply.status(409).send({ error: 'invalid_session_state' })
    }

    const isValid = verifyWalletSignature(session.challengeMessage, signature, session.walletAddress)
    if (!isValid) return reply.status(422).send({ error: 'invalid_signature' })

    // Fetch company name for the attestation record
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

    return reply.send({
      success: true,
      attestationAddress: attestation.attestationAddress,
      companyName,
      expiresAt: attestation.expiresAt,
    })
  })

  /**
   * GET /verify/status/:wallet
   * Returns the attestation status for a given wallet.
   * Used by the lending website to gate loan requests.
   */
  fastify.get<{ Params: { wallet: string } }>('/verify/status/:wallet', async (req, reply) => {
    const { wallet } = req.params
    const attestation = getAttestation(wallet)

    if (!attestation || !attestation.verified || attestation.revoked) {
      return reply.send({ verified: false })
    }

    const now = Math.floor(Date.now() / 1000)
    if (attestation.expiresAt < now) {
      return reply.send({ verified: false, reason: 'expired' })
    }

    return reply.send({
      verified: true,
      companyNumber: attestation.companyNumber,
      companyName: attestation.companyName,
      directorName: attestation.directorName,
      attestationAddress: attestation.attestationAddress,
      issuedAt: attestation.issuedAt,
      expiresAt: attestation.expiresAt,
    })
  })
}
