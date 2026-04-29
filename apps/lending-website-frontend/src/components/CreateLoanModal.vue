<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { useSolana } from '../composables/useSolana'
import { backendClient } from '../api/client'
import { solanaBridge } from '../utils/solana-bridge'
import { ApiError } from '../types'

const props = defineProps<{ 
  show: boolean 
  attestationCount?: number 
}>()

const emit = defineEmits<{ 
  close: [] 
  success: [loanId: string]
}>()

const auth = useAuth()
const solana = useSolana()
const router = useRouter()

// ── Form State ─────────────────────────────────────────────────────────────
const amount = ref(1)
const currency = ref('SOL')
const apy = ref(12)
const duration = ref(90)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

const durationPresets = [
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
  { label: '90d', value: 90 },
  { label: '180d', value: 180 },
  { label: '1y', value: 365 },
]

// ── Suggested APY Logic ──────────────────────────────────────────────────
// Base rate: 15%
// Increase for amount: +0.1% per 10 SOL (capped at +10%)
// Increase for duration: +3% per year (linear: 3 / 365 per day)
// Reduction for attestations: -2% per attestation (capped at 10% reduction)
const suggestedApy = computed(() => {
  let base = 15
  
  // Amount factor: 0.1% per 10 SOL -> 0.01% per 1 SOL
  const amountPremium = Math.min(amount.value * 0.01, 10)
  base += amountPremium
  
  // Duration factor: 3% per year -> 3/365 per day
  const durationPremium = (duration.value * 3) / 365
  base += durationPremium
  
  // Attestation discount
  const attCount = props.attestationCount || 0
  const discount = Math.min(attCount * 2, 10)
  
  const final = Math.max(5, base - discount)
  return parseFloat(final.toFixed(2))
})

function applySuggested() {
  apy.value = suggestedApy.value
}

// ── Actions ────────────────────────────────────────────────────────────────
async function handleSubmit() {
  if (!auth.isAuthenticated) return
  
  isSubmitting.value = true
  error.value = null
  
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
    const result = await backendClient.finalizeLoan(auth.token!, {
      signature,
      amount: amount.value,
      currency: currency.value,
      duration: duration.value,
      apy: apy.value
    })

    emit('success', result.id)
    emit('close')
  } catch (e: any) {
    console.error('[CreateLoanModal] Failed to create loan:', e)
    error.value = e instanceof ApiError ? e.message : (e.message || 'Transaction failed')
  } finally {
    isSubmitting.value = false
  }
}

// ── UI Helpers ─────────────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
onMounted(()   => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/80 backdrop-blur-md" @click="emit('close')"></div>
      
      <!-- Modal Content -->
      <div class="relative glass-panel rounded-xl max-w-md w-full overflow-hidden shadow-2xl border border-white/10">
        <div class="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <h2 class="text-white font-display font-bold text-lg">Initialize Loan Pool</h2>
          <button @click="emit('close')" class="text-muted hover:text-white transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="p-6 flex flex-col gap-5">
          <!-- Amount -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-muted uppercase tracking-[0.2em] font-bold">Principal Amount (SOL)</label>
            <div class="relative">
              <input 
                v-model.number="amount" 
                type="number" step="0.1" min="0.1"
                class="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white font-mono text-xl focus:border-primary/50 outline-none transition-all"
                required
              />
              <div class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted font-bold pointer-events-none uppercase">SOL</div>
            </div>
          </div>

          <!-- Duration -->
          <div class="flex flex-col gap-2">
            <label class="text-[10px] text-muted uppercase tracking-[0.2em] font-bold">Term Duration (Days)</label>
            <div class="flex gap-2">
              <button 
                v-for="p in durationPresets" 
                :key="p.value"
                type="button"
                @click="duration = p.value"
                :class="duration === p.value ? 'bg-primary text-white border-primary' : 'bg-white/5 text-muted border-white/10 hover:border-white/20'"
                class="flex-1 py-2 rounded border text-xs font-bold transition-all"
              >
                {{ p.label }}
              </button>
            </div>
            <input 
              v-model.number="duration" 
              type="number" min="1"
              class="w-full bg-white/5 border border-white/10 rounded px-4 py-2 text-white font-mono text-sm focus:border-primary/50 outline-none transition-all mt-1"
              placeholder="Custom days..."
              required
            />
          </div>

          <!-- APY -->
          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-end">
              <label class="text-[10px] text-muted uppercase tracking-[0.2em] font-bold">Target APY (%)</label>
              <button type="button" @click="applySuggested" class="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider">
                Apply Suggestion
              </button>
            </div>
            <div class="relative">
              <input 
                v-model.number="apy" 
                type="number" step="0.01" min="1" max="100"
                class="w-full bg-white/5 border border-white/10 rounded px-4 py-3 text-white font-mono text-xl focus:border-primary/50 outline-none transition-all"
                required
              />
              <div class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted font-bold pointer-events-none uppercase">%</div>
            </div>
            
            <!-- Dynamic Suggestion Cue -->
            <div class="mt-1 p-3 rounded bg-white/5 border border-white/5 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-muted uppercase font-bold">Smart Rate:</span>
                <span class="text-xs text-emerald font-mono font-bold">{{ suggestedApy }}%</span>
              </div>
              <p class="text-[10px] text-muted leading-relaxed">
                Based on amount, duration, and your <span class="text-white font-bold">{{ attestationCount || 0 }}</span> active attestations.
                <a 
                  :href="`/profile/${auth.address}`" 
                  target="_blank" 
                  @click="emit('close')"
                  class="text-primary hover:underline ml-1"
                >
                  Complete more attestations to lower your rate.
                </a>
              </p>
            </div>
          </div>

          <div v-if="error" class="p-3 rounded bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">error</span>
            {{ error }}
          </div>

          <button 
            type="submit"
            :disabled="isSubmitting"
            class="mt-2 w-full py-4 rounded bg-primary text-white font-bold text-sm uppercase tracking-widest shadow-glow-primary hover:shadow-glow-primary-strong disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <div class="flex items-center justify-center gap-2">
              <span v-if="isSubmitting" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              {{ isSubmitting ? 'Initializing on-chain...' : 'Create Loan Request' }}
            </div>
          </button>
          
          <p class="text-[9px] text-muted text-center uppercase tracking-widest leading-loose">
            This action initializes a new <strong>Loan Pool PDA</strong>.<br/>
            Borrower pays rent (≈ 0.003 SOL) which is refundable upon closure.
          </p>
        </form>
      </div>
    </div>
  </Teleport>
</template>
