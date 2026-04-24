import nacl from 'tweetnacl'
import bs58 from 'bs58'

/**
 * Builds the challenge message the user must sign with their Solana wallet.
 * Matches the format expected by the frontend (Phantom wallet signMessage).
 */
export function buildChallengeMessage(companyNumber: string, walletAddress: string): string {
  const ts = Math.floor(Date.now() / 1000)
  return `I am director of company ${companyNumber} verifying wallet ${walletAddress} at timestamp ${ts}`
}

/**
 * Verifies a Solana wallet Ed25519 signature.
 *
 * @param message    The original challenge message string
 * @param signature  Base64-encoded signature from the wallet
 * @param wallet     Base58-encoded Solana public key
 */
export function verifyWalletSignature(
  message: string,
  signature: string,
  wallet: string,
): boolean {
  try {
    const msgBytes = new TextEncoder().encode(message)
    const sigBytes = Buffer.from(signature, 'base64')
    const pubKeyBytes = bs58.decode(wallet)

    return nacl.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes)
  } catch {
    return false
  }
}
