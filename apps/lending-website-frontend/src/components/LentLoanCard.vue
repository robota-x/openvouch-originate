<script setup lang="ts">
import { computed } from 'vue'
import type { LentLoan } from '../types'
import { toSol } from '../utils/precision'
import { truncate } from '../utils/format'

const props = defineProps<LentLoan>()
const emit  = defineEmits<{ view: [] }>()

// Status badge
const statusStyle = computed(() => {
  if (props.status === 'active')    return 'border-white/20   bg-white/5   text-muted'
  if (props.status === 'repaid')    return 'border-emerald/40 bg-emerald/10 text-emerald'
  return                                   'border-danger/40  bg-danger/10  text-danger'
})
const statusLabel = computed(() => ({
  active: 'Active', repaid: 'Repaid', defaulted: 'Defaulted',
}[props.status]))

// Trust score colour
const trustColor = computed(() => {
  if (props.borrowerTrustScore >= 700) return 'text-emerald'
  if (props.borrowerTrustScore >= 400) return 'text-orange'
  return 'text-danger'
})

// Net outcome for the lender
const interest = computed(() => {
  const principal = BigInt(props.amount)
  const interestLamports = (principal * BigInt(props.apy) * BigInt(props.duration)) / (10000n * 365n)
  return toSol(interestLamports)
})
const netLabel = computed(() => {
  if (props.status === 'repaid')    return `+${interest.value} ${props.currency}`
  if (props.status === 'defaulted') return `−${toSol(BigInt(props.amount))} ${props.currency}`
  return null
})
const netColor = computed(() => {
  if (props.status === 'repaid')    return 'text-emerald'
  if (props.status === 'defaulted') return 'text-danger'
  return 'text-muted'
})

// Days remaining for active loans
const daysRemaining = computed(() => {
  if (!props.dueDate) return null
  const due   = new Date(props.dueDate).getTime()
  const today = new Date('2026-04-12').getTime()
  return Math.ceil((due - today) / 86_400_000)
})
</script>

<template>
  <div
    class="glass-panel rounded px-5 py-4 flex items-center gap-5 hover:bg-surface-hover transition-colors cursor-pointer"
    @click="emit('view')"
  >
    <!-- Borrower column -->
    <RouterLink
      :to="`/profile/${borrower}`"
      class="w-56 flex-shrink-0 flex items-center gap-3 min-w-0 hover:bg-white/5 rounded transition-colors"
      @click.stop
    >
      <div class="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
        <span class="font-mono text-xs text-primary">0x</span>
      </div>
      <div class="min-w-0 flex flex-col gap-0.5">
        <span class="text-sm font-bold text-white truncate">{{ borrowerNickname }}</span>
        <span class="font-mono text-[10px] text-muted leading-tight">{{ truncate(borrower) }}</span>
      </div>
    </RouterLink>

    <!-- Trust Score -->
    <div class="w-20 flex-shrink-0">
      <span class="font-mono font-bold text-xs px-1.5 py-0.5 rounded bg-white/5" :class="trustColor">
        {{ borrowerTrustScore }}
      </span>
    </div>

    <!-- Amount -->
    <div class="flex-1 min-w-0 flex flex-col">
      <p class="font-mono font-bold text-white">
        {{ toSol(BigInt(amount)) }}
        <span class="text-white/50 text-sm font-normal">{{ currency }}</span>
      </p>
      <span v-if="totalLoanAmount" class="text-[9px] text-muted uppercase tracking-tighter">
        of {{ toSol(BigInt(totalLoanAmount)) }} {{ currency }} pool
      </span>
    </div>

    <!-- APY -->
    <div class="w-20 flex-shrink-0">
      <p class="font-mono font-bold text-white">{{ (Number(apy) / 100).toFixed(2) }}%</p>
    </div>

    <!-- Duration -->
    <div class="w-20 flex-shrink-0">
      <p class="font-mono font-bold text-white">{{ duration }}d</p>
    </div>

    <!-- Status / due -->
    <div class="w-32 flex-shrink-0 flex flex-col gap-1">
      <span
        class="self-start px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono"
        :class="statusStyle"
      >{{ statusLabel }}</span>
      <span v-if="status === 'active' && daysRemaining !== null" class="text-[10px] text-muted">
        due in <span class="font-mono font-bold text-white">{{ daysRemaining }}d</span>
      </span>
    </div>

    <!-- Net gain/loss -->
    <div class="w-28 flex-shrink-0 text-right">
      <span v-if="netLabel" class="font-mono text-sm font-bold" :class="netColor">{{ netLabel }}</span>
      <span v-else class="font-mono text-sm text-muted">—</span>
    </div>
  </div>
</template>
