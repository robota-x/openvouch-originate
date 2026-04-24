import bs58 from 'bs58'
import { attestationStore } from '../store/sessions.js'
import type { Db } from '../db/client.js'
import type { Attestation } from '../types.js'

const SECONDS_PER_YEAR = 365 * 24 * 60 * 60

/**
 * Derives a deterministic attestation address from wallet + company number.
 *
 * In production this would be a Solana PDA derived from the deployed
 * attestation program: PublicKey.findProgramAddressSync([wallet, company], PROGRAM_ID)
 */
function deriveAttestationAddress(walletAddress: string, companyNumber: string): string {
  const input = new TextEncoder().encode(`openvouch:attestation:${walletAddress}:${companyNumber}`)
  // SubtleCrypto is available in Workers; use a sync-friendly base58 of the raw bytes as a
  // deterministic identifier. Full SHA-256 via SubtleCrypto requires an async path — deferred
  // until the on-chain PDA replaces this entirely.
  return bs58.encode(input)
}

/**
 * Issues an attestation record for a verified wallet + company binding.
 *
 * TODO: When the Solana program is deployed, replace the D1 store
 * with an actual on-chain write via @solana/web3.js:
 *   const tx = await program.methods.issueAttestation(...args).rpc()
 */
export async function issueAttestation(
  db: Db,
  params: {
    walletAddress: string
    companyNumber: string
    companyName: string
    directorName: string
  },
): Promise<Attestation> {
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

  await attestationStore.set(db, attestation)

  console.log(`[attestation] issued for wallet=${params.walletAddress} company=${params.companyNumber}`)
  console.log(`[attestation] address=${attestationAddress}`)

  return attestation
}

export async function getAttestation(db: Db, walletAddress: string): Promise<Attestation | undefined> {
  return attestationStore.getByWallet(db, walletAddress)
}
