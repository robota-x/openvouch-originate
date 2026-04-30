import { Connection } from '@solana/web3.js'
import { reactive, computed, markRaw } from 'vue'

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL

const NETWORK_LABELS: Record<string, string> = {
  devnet: 'devnet',
  localhost: 'localnet',
  mainnet: 'mainnet-beta',
}

function networkLabel(url: string): string {
  const key = Object.keys(NETWORK_LABELS).find(k => url.includes(k))
  return key ? NETWORK_LABELS[key] : url
}

export function useSolana() {
  const connection = markRaw(new Connection(RPC_URL, 'confirmed'))

  return reactive({
    connection,
    rpcUrl: RPC_URL,
    network: computed(() => networkLabel(RPC_URL)),
  })
}
