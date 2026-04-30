<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileLoan } from '../types'
import { toSol, toLamports } from '../utils/precision'
import { truncate } from '../utils/format'

const props = defineProps<ProfileLoan & { createdAt?: number | string | Date }>()
const emit  = defineEmits<{ view: []; disburse: []; repay: []; cancel: [] }>()

const isFunded = computed(() => toLamports(props.raisedAmount) >= toLamports(props.amount) && props.status === 'open')
const canRepay = computed(() => props.status === 'active' && toLamports(props.repaid) < toLamports(props.amount))

const canCancel = computed(() => {
  if (props.status !== 'open') return false;
  const created = props.createdAt ? new Date(props.createdAt).getTime() : 0;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() > created + sevenDays;
})

// Status badge
const isRepaid = computed(() => toLamports(props.repaid) >= toLamports(props.amount))

const statusStyle = computed(() => {
  if (props.status === 'open')   return 'border-primary/40 bg-primary/10 text-primary'
  if (isRepaid.value)            return 'border-emerald/40 bg-emerald/10 text-emerald'
  if (props.status === 'active') return 'border-white/20   bg-white/5   text-muted'
  return                                'border-danger/40  bg-danger/10  text-danger'
})

const statusLabel = computed(() => {
  if (props.status === 'open')   return 'Open offer'
  if (isRepaid.value)            return 'Repaid'
  if (props.status === 'active') return 'Active'
  return                                'Defaulted'
})

// Total due (principal + simple interest)
const totalDueLamports = computed(() => {
  const principal = toLamports(props.amount)
  const interest = (principal * BigInt(props.apy) * BigInt(props.duration)) / (10000n * 365n)
  return principal + interest
})

const netLabel = computed(() => {
  if (props.status === 'open') return null
  const sol = Number(toSol(totalDueLamports.value))
  return `${sol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${props.currency}`
})
const netColor = computed(() => {
  if (toLamports(props.repaid) >= toLamports(props.amount))         return 'text-emerald'
  if (props.status === 'active')            return 'text-muted'
  if (props.status === 'open')              return 'text-muted'
  return                                           'text-danger'
})

// Days remaining for active loans
const daysRemaining = computed(() => {
  if (!props.dueDate) return null
  const due   = new Date(props.dueDate).getTime()
  const today = new Date().getTime()
  return Math.ceil((due - today) / 86_400_000)
})
</script>

<template>
  <div
    class="glass-panel rounded px-5 py-4 flex items-center gap-5 hover:bg-surface-hover transition-colors cursor-pointer"
    @click="emit('view')"
  >
    <!-- Lender column -->
    <div class="w-56 flex-shrink-0 flex items-center gap-3 min-w-0">
      <template v-if="counterparty">
        <RouterLink
          :to="`/profile/${counterparty}`"
          class="flex items-center gap-3 min-w-0 hover:bg-white/5 rounded transition-colors"
          @click.stop
        >
          <div class="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
            <span class="font-mono text-[10px] text-muted">0x</span>
          </div>
          <span class="font-mono text-sm text-white truncate">{{ truncate(counterparty) }}</span>
        </RouterLink>
      </template>
      <template v-else>
        <div class="flex items-center gap-3 min-w-0 opacity-40">
          <div class="w-9 h-9 rounded-full border border-dashed border-white/30 flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-sm text-muted">person_add</span>
          </div>
          <span class="text-muted text-xs">No lender yet</span>
        </div>
      </template>
    </div>

    <!-- Amount -->
    <div class="flex-1 min-w-0">
      <p class="font-mono font-bold text-white">
        {{ toSol(amount) }}
        <span class="text-white/50 text-sm font-normal">{{ currency }}</span>
      </p>
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

    <!-- Total due (borrower's cost) -->
    <div class="w-28 flex-shrink-0 text-right flex flex-col items-end gap-2">
      <template v-if="isFunded">
        <button 
          class="px-3 py-1.5 rounded bg-emerald text-white text-[10px] font-bold shadow-glow-emerald hover:shadow-glow-emerald-strong transition-shadow"
          @click.stop="emit('disburse')"
        >
          Disburse
        </button>
      </template>
      <template v-else-if="canCancel">
        <button 
          class="px-3 py-1.5 rounded bg-danger text-white text-[10px] font-bold shadow-glow-danger hover:shadow-glow-danger transition-shadow"
          @click.stop="emit('cancel')"
        >
          Cancel
        </button>
      </template>
      <template v-else-if="canRepay">
        <button 
          class="px-3 py-1.5 rounded bg-primary text-white text-[10px] font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow"
          @click.stop="emit('repay')"
        >
          Pay Installment
        </button>
      </template>
      <template v-else>
        <span v-if="netLabel" class="font-mono text-sm font-bold" :class="netColor">{{ netLabel }}</span>
        <span v-else class="font-mono text-sm text-muted">—</span>
      </template>
    </div>
  </div>
</template>
