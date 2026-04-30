<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { ContractView } from '../types'
import { truncate, fmtDate } from '../utils/format'
import { useAuth } from '../composables/useAuth'
import { toSol } from '../utils/precision'

const props = defineProps<{
  contract: ContractView
  hideContribute?: boolean
  success?: boolean
}>()
const emit  = defineEmits<{
  close: []
  fund: [loanId: string, amount: string]
  default: [loanId: string]
}>()

const auth = useAuth()

// ── Lamport base values (API returns lamport strings) ──────────────────────────
const totalLamports   = computed(() => BigInt(props.contract.amount       || '0'))
const raisedLamports  = computed(() => BigInt(props.contract.raisedAmount || '0'))
const remainingLamports = computed(() => totalLamports.value - raisedLamports.value)

// ── Contribution input (SOL string — user-facing only) ─────────────────────────
const contributionAmount = ref(toSol(remainingLamports.value))

onMounted(() => { contributionAmount.value = toSol(remainingLamports.value) })
watch(() => props.contract.id, () => { contributionAmount.value = toSol(remainingLamports.value) })
function setMax() { contributionAmount.value = toSol(remainingLamports.value) }

// ── Progress ──────────────────────────────────────────────────────────────────
const progressPercent = computed(() => {
  if (totalLamports.value === 0n) return 0n
  const pct = (raisedLamports.value * 100n) / totalLamports.value
  return pct > 100n ? 100n : pct
})

// ── Financials ────────────────────────────────────────────────────────────────
// Simple interest: principal × (apy_bps / 10000) × (duration / 365)
const interestLamports = computed(() =>
  (totalLamports.value * BigInt(props.contract.apy) * BigInt(props.contract.duration)) / (10000n * 365n)
)
const interest = computed(() => toSol(interestLamports.value))
const totalDue = computed(() => toSol(totalLamports.value + interestLamports.value))

// Net outcome from lender's perspective (closed loans only)
const netGain = computed(() => {
  if (props.contract.status === 'repaid')    return `+${interest.value} ${props.contract.currency}`
  if (props.contract.status === 'defaulted') return `−${toSol(totalLamports.value)} ${props.contract.currency}`
  return null
})
const netGainColor = computed(() => {
  if (props.contract.status === 'repaid')    return 'text-emerald'
  if (props.contract.status === 'defaulted') return 'text-danger'
  return 'text-muted'
})

// ── Participants ───────────────────────────────────────────────────────────────
const isParticipant = computed(() =>
  !!auth.address && (props.contract.borrower === auth.address || props.contract.lender === auth.address)
)

const canTriggerDefault = computed(() => {
  if (props.contract.status !== 'active' || !isParticipant.value) return false
  if (!props.contract.dueDate) return false
  const due = new Date(props.contract.dueDate).getTime()
  return Date.now() > due + 30 * 24 * 60 * 60 * 1000
})

// ── Trust score color ──────────────────────────────────────────────────────────
const trustColor = computed(() => {
  const s = props.contract.borrowerTrustScore
  if (s >= 700) return 'text-emerald'
  if (s >= 400) return 'text-orange'
  return 'text-danger'
})

// ── Repayment rate style ───────────────────────────────────────────────────────
const repaymentStyle = computed(() => {
  const r = props.contract.borrowerRepaymentRate
  if (r >= 10000) return 'border-emerald/50 bg-emerald/10 text-emerald'
  if (r >= 9000)  return 'border-orange/50  bg-orange/10  text-orange'
  return                 'border-danger/50  bg-danger/10  text-danger'
})

// ── Status badge ───────────────────────────────────────────────────────────────
const statusStyle = computed(() => {
  const s = props.contract.status
  if (s === 'open')      return 'border-primary/40 bg-primary/10 text-primary'
  if (s === 'active')    return 'border-white/20   bg-white/5   text-muted'
  if (s === 'repaid')    return 'border-emerald/40 bg-emerald/10 text-emerald'
  if (s === 'cancelled') return 'border-orange/40  bg-orange/10  text-orange'
  return                        'border-danger/40  bg-danger/10  text-danger'
})
const statusLabel = computed(() => ({
  open: 'Open offer', active: 'Active', repaid: 'Repaid', defaulted: 'Defaulted', cancelled: 'Cancelled',
}[props.contract.status]))

// ── Timeline ───────────────────────────────────────────────────────────────────
const startDate = computed(() => {
  if (!props.contract.dueDate) return null
  const d = new Date(props.contract.dueDate)
  d.setDate(d.getDate() - props.contract.duration)
  return d.toISOString().slice(0, 10)
})

const daysRemaining = computed(() => {
  if (!props.contract.dueDate) return null
  return Math.ceil((new Date(props.contract.dueDate).getTime() - Date.now()) / 86_400_000)
})

// ── ESC to close ───────────────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
onMounted(()   => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <!-- Modal panel -->
      <div class="glass-panel rounded-xl max-w-lg w-full flex flex-col gap-0 overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div class="flex items-center gap-3">
            <h2 class="text-white font-display font-bold text-base">Contract</h2>
            <span
              class="px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wide"
              :class="statusStyle"
            >{{ statusLabel }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="contract.id" class="font-mono text-[10px] text-muted">#{{ contract.id }}</span>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
              @click="emit('close')"
            >
              <span class="material-symbols-outlined text-base leading-none">close</span>
            </button>
          </div>
        </div>

        <div class="px-6 py-5 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-8rem)]">

          <!-- ── Parties ──────────────────────────────────────────────── -->
          <div class="grid grid-cols-2 gap-4">

            <!-- Borrower -->
            <div class="flex flex-col gap-2">
              <p class="text-[10px] text-muted uppercase tracking-widest">Borrower</p>
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span class="material-symbols-outlined text-primary text-sm">account_balance_wallet</span>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-bold text-white leading-tight">{{ contract.borrowerNickname }}</p>
                  <p class="font-mono text-[10px] text-muted leading-tight">{{ truncate(contract.borrower) }}</p>
                </div>
              </div>
              <div class="flex flex-col gap-1.5 mt-0.5">
                <div class="flex items-baseline gap-0.5" :class="trustColor">
                  <span class="font-mono font-bold text-lg leading-none">{{ contract.borrowerTrustScore }}</span>
                  <span class="material-symbols-outlined text-[9px] leading-none ml-0.5" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
                  <span class="text-[10px] text-muted uppercase tracking-widest ml-1">Trust</span>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="px-1.5 py-0.5 rounded-full border text-[10px] font-bold font-mono" :class="repaymentStyle">
                    {{ (contract.borrowerRepaymentRate / 100).toFixed(0) }}% repaid
                  </span>
                  <span class="px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary/80 text-[10px] font-bold font-mono">
                    {{ contract.borrowerAttestationCount }} att.
                  </span>
                </div>
              </div>
            </div>

            <!-- Lender -->
            <div class="flex flex-col gap-2">
              <p class="text-[10px] text-muted uppercase tracking-widest">Lender</p>
              <template v-if="contract.lender">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-muted text-sm">account_balance_wallet</span>
                  </div>
                  <div class="min-w-0">
                    <p class="font-mono text-sm font-bold text-white leading-tight">{{ truncate(contract.lender) }}</p>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="flex items-center gap-2 opacity-40">
                  <div class="w-8 h-8 rounded-full border border-dashed border-white/30 flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-sm text-muted">person_add</span>
                  </div>
                  <p class="text-muted text-xs">No lender yet</p>
                </div>
              </template>
            </div>

          </div>

          <!-- ── Funding Progress ────────────────────────────────────── -->
          <div class="bg-black/20 rounded-lg px-4 py-3 flex flex-col gap-2">
            <p class="text-[10px] text-muted uppercase tracking-widest mb-1">Funding Progress</p>
            <div class="flex items-baseline justify-between">
              <div class="flex items-baseline gap-2">
                <span class="font-mono text-2xl font-bold text-white">{{ toSol(raisedLamports) }}</span>
                <span class="text-white/50 text-sm">/ {{ toSol(totalLamports) }} {{ contract.currency }}</span>
              </div>
              <span class="font-mono text-xs text-primary font-bold">{{ progressPercent }}%</span>
            </div>
            <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-700"
                :style="{ width: `${progressPercent}%` }"
              />
            </div>
            <div class="flex items-center gap-4 text-sm mt-1">
              <span class="text-muted">APY <span class="font-mono font-bold text-white">{{ (Number(contract.apy) / 100).toFixed(2) }}%</span></span>
              <span class="text-white/20">·</span>
              <span class="text-muted">Duration <span class="font-mono font-bold text-white">{{ contract.duration }}d</span></span>
            </div>
          </div>

          <!-- ── Timeline (funded contracts only) ───────────────────── -->
          <div v-if="contract.dueDate" class="flex flex-col gap-2">
            <p class="text-[10px] text-muted uppercase tracking-widest">Timeline</p>
            <div class="flex items-center gap-3">
              <div class="flex flex-col items-center gap-1">
                <span class="text-[10px] text-muted uppercase tracking-widest">Start</span>
                <span class="font-mono text-sm text-white">{{ startDate ? fmtDate(startDate) : '—' }}</span>
              </div>
              <div class="flex-1 h-px bg-border relative">
                <div
                  v-if="contract.status === 'active'"
                  class="absolute inset-y-0 left-0 bg-primary/60"
                  style="width: 50%"
                />
              </div>
              <div class="flex flex-col items-center gap-1">
                <span class="text-[10px] text-muted uppercase tracking-widest">Due</span>
                <span class="font-mono text-sm text-white">{{ fmtDate(contract.dueDate) }}</span>
              </div>
            </div>
            <p v-if="contract.status === 'active' && daysRemaining !== null" class="text-xs text-muted">
              <span class="font-mono font-bold text-white">{{ daysRemaining }}</span> days remaining
            </p>
          </div>

          <!-- ── Financials (funded contracts only) ─────────────────── -->
          <div v-if="contract.status !== 'open'" class="flex flex-col gap-0">
            <p class="text-[10px] text-muted uppercase tracking-widest mb-3">Financials</p>
            <div class="flex flex-col gap-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-muted">Principal</span>
                <span class="font-mono text-white">{{ toSol(totalLamports) }} {{ contract.currency }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-muted">Interest ({{ (Number(contract.apy) / 100).toFixed(2) }}% × {{ contract.duration }}d)</span>
                <span class="font-mono text-white">+{{ interest }} {{ contract.currency }}</span>
              </div>
              <div class="h-px bg-border my-1" />
              <div class="flex items-center justify-between font-bold">
                <span class="text-muted">Total due</span>
                <span class="font-mono text-white">{{ totalDue }} {{ contract.currency }}</span>
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-muted">{{ contract.status === 'repaid' ? 'Repaid' : contract.status === 'defaulted' ? 'Recovered' : 'Expected repayment' }}</span>
                <span class="font-mono font-bold" :class="contract.status === 'repaid' ? 'text-emerald' : contract.status === 'defaulted' ? 'text-danger' : 'text-muted'">
                  <template v-if="contract.status === 'repaid'">{{ totalDue }} {{ contract.currency }} ✓</template>
                  <template v-else-if="contract.status === 'defaulted'">0 {{ contract.currency }}</template>
                  <template v-else>{{ totalDue }} {{ contract.currency }}</template>
                </span>
              </div>
              <div v-if="netGain" class="flex items-center justify-between">
                <span class="text-muted">Net {{ contract.status === 'repaid' ? 'gain' : 'loss' }} (lender)</span>
                <span class="font-mono font-bold" :class="netGainColor">{{ netGain }}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer / Action Area -->
        <div class="px-6 py-6 border-t border-border flex flex-col gap-6">

          <!-- Success message -->
          <div v-if="props.success" class="flex items-center gap-3 px-4 py-3 rounded-lg bg-emerald/10 border border-emerald/30">
            <span class="material-symbols-outlined text-emerald text-2xl">check_circle</span>
            <div class="flex-1">
              <p class="text-emerald font-bold text-sm">Contribution successful!</p>
              <p class="text-muted text-xs mt-0.5">Your funds have been added to this loan.</p>
            </div>
          </div>

          <!-- Funding input (open loans, not when viewed from My Loans) -->
          <div v-else-if="contract.status === 'open' && !props.hideContribute" class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <label class="text-[10px] text-muted uppercase tracking-widest font-bold">Your Contribution</label>
              <div class="flex items-center gap-2">
                <span class="text-[10px] text-muted tracking-tight">
                  Remaining: <span class="font-mono text-white">{{ toSol(remainingLamports) }} SOL</span>
                </span>
                <button
                  class="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold uppercase transition-colors"
                  @click="setMax"
                >Max</button>
              </div>
            </div>
            <div class="flex flex-col gap-3">
              <div class="relative">
                <input
                  v-model="contributionAmount"
                  type="text"
                  class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-xl focus:border-primary/50 outline-none transition-all pr-16"
                  placeholder="0.00"
                />
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted font-bold pointer-events-none uppercase">SOL</div>
              </div>
              <input
                v-model="contributionAmount"
                type="range"
                min="0"
                :max="toSol(remainingLamports)"
                step="0.01"
                class="w-full accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center justify-end gap-3">
            <button
              v-if="canTriggerDefault && !props.success"
              class="px-4 py-2 rounded bg-danger/10 text-danger text-sm font-bold border border-danger/20 hover:bg-danger/20 transition-colors"
              @click="emit('default', contract.id!)"
            >Trigger Default</button>
            <button
              class="px-4 py-2 rounded text-sm text-muted hover:text-white transition-colors"
              @click="emit('close')"
            >Close</button>
            <button
              v-if="contract.status === 'open' && !props.hideContribute && !props.success"
              class="px-8 py-2.5 rounded bg-primary text-white text-sm font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-all"
              @click="emit('fund', contract.id!, contributionAmount)"
            >Contribute</button>
          </div>

        </div>

      </div>
    </div>
  </Teleport>
</template>
