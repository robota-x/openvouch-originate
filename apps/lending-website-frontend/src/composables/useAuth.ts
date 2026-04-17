import { ref, computed, reactive } from 'vue'
import { getWallets } from '@wallet-standard/app'
import { backendClient } from '../api/client'

// Minimal wallet interfaces — avoids adding @wallet-standard/base as a direct dep.
// Runtime objects from getWallets() implement this shape.
interface WalletAccount {
  address: string
  publicKey: Uint8Array
  chains: readonly string[]
  features: readonly string[]
}

interface WalletFeatureConnect {
  connect(opts?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }>
}

interface WalletFeatureSignMessage {
  signMessage(opts: { account: WalletAccount; message: Uint8Array }): Promise<readonly { signature: Uint8Array }[]>
}

export interface DetectedWallet {
  name: string
  icon: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any
}

// Refs live at module scope, not inside the function — this is intentional.
// Every component that calls useAuth() receives the same ref instances, giving
// shared reactive state without a store library. Moving them inside the function
// would create a new independent copy per call, breaking cross-component sync.
const address = ref<string | null>(null)
const token   = ref<string | null>(null)

const isConnected = computed(() => !!address.value && !!token.value)

/** Returns all Solana-compatible wallets detected in the browser. */
function getSolanaWallets(): DetectedWallet[] {
  const { get } = getWallets()
  return get()
    .filter(w => w.chains.some(c => c.startsWith('solana:')))
    .map(w => ({ name: w.name, icon: w.icon ?? '', raw: w }))
}

/** Full challenge → sign → verify flow for a single detected wallet. */
async function connect(wallet: DetectedWallet): Promise<void> {
  // 1. Connect wallet and get the first account
  const connectFeature = wallet.raw.features['standard:connect'] as WalletFeatureConnect
  const { accounts } = await connectFeature.connect()
  const account = accounts[0]
  if (!account) throw new Error('No account returned by wallet')

  const walletAddress = account.address

  // 2. Request a challenge nonce from the backend
  const { nonce } = await backendClient.challenge(walletAddress)

  // 3. Build the human-readable message and sign it
  const message = new TextEncoder().encode(
    `Sign this message to authenticate with OpenVouch Originate.\n\nNonce: ${nonce}`
  )
  const signFeature = wallet.raw.features['solana:signMessage'] as WalletFeatureSignMessage
  const [{ signature }] = await signFeature.signMessage({ account, message })

  // 4. Send signature to backend; receive JWT
  const sigBase64 = btoa(String.fromCharCode(...signature))
  const { token: jwt } = await backendClient.verify(walletAddress, nonce, sigBase64)

  address.value = walletAddress
  token.value   = jwt
}

async function disconnect(): Promise<void> {
  if (token.value) await backendClient.logout(token.value).catch(() => {})
  address.value = null
  token.value   = null
}

// reactive() is required here. Vue only auto-unwraps refs that are top-level
// variables in <script setup>. Properties of a plain object (e.g. auth.address)
// stay as Ref objects and do NOT unwrap in templates — auth.address.slice(...)
// would throw at runtime. Wrapping in reactive() restores the auto-unwrap
// behaviour that Pinia stores provide implicitly.
export function useAuth() {
  return reactive({ address, token, isConnected, getSolanaWallets, connect, disconnect })
}
