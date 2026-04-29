<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useSolana } from '../composables/useSolana'
import { backendClient } from '../api/client'
import { solanaBridge } from '../utils/solana-bridge'

const auth = useAuth()
const solana = useSolana()
const router = useRouter()

const amount = ref(1)
const currency = ref('SOL')
const apy = ref(10)
const duration = ref(30)
const isSubmitting = ref(false)

async function handleSubmit() {
  if (!auth.isAuthenticated) return
  
  isSubmitting.value = true
  try {
    // 1. Get Base64 TX from backend
    const { transaction: txBase64 } = await backendClient.initiateLoan(
      auth.token!,
      { amount: amount.value, currency: currency.value, duration: duration.value }
    )

    // 2. Deserialize
    const tx = solanaBridge.deserializeTx(txBase64)

    // 3. Sign and Broadcast
    const signature = await solanaBridge.signAndBroadcast(
      solana.connection,
      tx,
      auth.connectedWallet
    )

    // 4. Finalize with backend
    await backendClient.finalizeLoan(auth.token!, {
      signature,
      amount: amount.value,
      currency: currency.value,
      duration: duration.value,
      apy: apy.value
    })

    alert('Success! Loan request created on-chain.')
    router.push('/my-loans')
  } catch (e: any) {
    console.error('[CreateLoanPage] Failed to create loan:', e)
    alert(`Failed to create loan: ${e.message}`)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-12">
    <div class="glass-panel rounded-xl p-8 flex flex-col gap-6">
      <div>
        <h1 class="font-display text-2xl font-bold text-white mb-2">Request a Loan</h1>
        <p class="text-muted text-sm">Create a new on-chain loan pool to attract capital from lenders.</p>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-5">
        <div class="flex flex-col gap-2">
          <label class="text-xs text-muted uppercase tracking-widest">Amount ({{ currency }})</label>
          <input 
            v-model.number="amount" 
            type="number" step="0.1" min="0.1"
            class="bg-black/40 border border-border rounded px-4 py-3 text-white font-mono text-lg focus:border-primary outline-none transition-colors"
            required
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-xs text-muted uppercase tracking-widest">Target APY (%)</label>
            <input 
              v-model.number="apy" 
              type="number" step="0.5" min="1"
              class="bg-black/40 border border-border rounded px-4 py-3 text-white font-mono text-lg focus:border-primary outline-none transition-colors"
              required
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="text-xs text-muted uppercase tracking-widest">Duration (Days)</label>
            <input 
              v-model.number="duration" 
              type="number" min="1"
              class="bg-black/40 border border-border rounded px-4 py-3 text-white font-mono text-lg focus:border-primary outline-none transition-colors"
              required
            />
          </div>
        </div>

        <div class="bg-primary/10 border border-primary/20 rounded p-4 flex gap-4 items-start">
          <span class="material-symbols-outlined text-primary mt-0.5">info</span>
          <div class="text-xs text-primary/80 leading-relaxed">
            Creating a loan request will initialize a <strong>Loan Pool PDA</strong> on Solana. 
            You will need to sign a transaction to authorize the creation.
          </div>
        </div>

        <button 
          type="submit"
          :disabled="isSubmitting"
          class="mt-4 w-full py-4 rounded bg-primary text-white font-bold text-lg shadow-glow-primary hover:shadow-glow-primary-strong disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {{ isSubmitting ? 'Signing Transaction...' : 'Initialize Loan Pool' }}
        </button>
      </form>
    </div>
  </div>
</template>
