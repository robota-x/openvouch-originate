import { createHash } from 'crypto'
import bs58 from 'bs58'
import { attestationStore } from '../store/sessions.js'
import type { Attestation } from '../types.js'

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60

/**
 * Derives a deterministic attestation address from wallet + company number.
 *
 * In production this would be a Solana PDA derived from the deployed
 * attestation program: PublicKey.findProgramAddressSync([wallet, company], PROGRAM_ID)
 */
function deriveAttestationAddress(walletAddress: string, companyNumber: string): string {
  const hash = createHash('sha256')
    .update(`openvouch:attestation:${walletAddress}:${companyNumber}`)
    .digest()
  return bs58.encode(hash)
}

/**
 * Issues an attestation record for a verified wallet + company binding.
 *
 * TODO: When the Solana program is deployed, replace the in-memory store
 * with an actual on-chain write via @solana/web3.js:
 *   const tx = await program.methods.issueAttestation(...args).rpc()
 */
export async function issueAttestation(params: {
  walletAddress: string
  companyNumber: string
  companyName: string
  directorName: string
}): Promise<Attestation> {
  const now = Math.floor(Date.now() / 1000)
  const attestationAddress = deriveAttestationAddress(params.walletAddress, params.companyNumber)

  const attestation: Attestation = {
    ...params,
    verified: true,
    issuedAt: now,
    expiresAt: now + SECONDS_PER_YEAR,
    revoked: false,
    attestationAddress,
  }

  attestationStore.set(attestation)

  console.log(`[attestation] issued for wallet=${params.walletAddress} company=${params.companyNumber}`)
  console.log(`[attestation] address=${attestationAddress}`)

  return attestation
}

export function getAttestation(walletAddress: string): Attestation | undefined {
  return attestationStore.getByWallet(walletAddress)
}
