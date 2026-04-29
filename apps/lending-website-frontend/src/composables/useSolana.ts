import { Connection } from '@solana/web3.js'
import { reactive, computed, markRaw } from 'vue'

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com'

export function useSolana() {
  const connection = markRaw(new Connection(RPC_URL, 'confirmed'))

  return reactive({
    connection,
    rpcUrl: RPC_URL,
    network: computed(() => RPC_URL.includes('devnet') ? 'devnet' : 'mainnet-beta')
  })
}
