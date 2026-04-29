<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileLoan } from '../types'

const props = defineProps<ProfileLoan>()
const emit  = defineEmits<{ view: []; disburse: []; repay: [] }>()

const isFunded = computed(() => props.raisedAmount >= props.amount && props.status === 'open')
const canRepay = computed(() => props.status === 'active' && props.repaid < props.amount)

// Status badge
const statusStyle = computed(() => {
  if (props.status === 'open')                return 'border-primary/40 bg-primary/10 text-primary'
  if (props.status === 'active')              return 'border-white/20   bg-white/5   text-muted'
  if (props.repaid >= props.amount)           return 'border-emerald/40 bg-emerald/10 text-emerald'
  return                                             'border-danger/40  bg-danger/10  text-danger'
})
const statusLabel = computed(() => {
  if (props.status === 'open')                return 'Open offer'
  if (props.status === 'active')              return 'Active'
  if (props.repaid >= props.amount)           return 'Repaid'
  return                                             'Defaulted'
})

// Total due (principal + simple interest)
const interest = computed(() =>
  +(props.amount * (props.apy / 100) * (props.duration / 365)).toFixed(2)
)
const totalDue = computed(() => +(props.amount + interest.value).toFixed(2))

// Net column label — borrower's cost perspective
const netLabel = computed(() => {
  if (props.status === 'open')              return null
  if (props.repaid >= props.amount)         return `${totalDue.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${props.currency}`
  if (props.status === 'active')            return `${totalDue.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${props.currency}`
  return                                           `${totalDue.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${props.currency}`
})
const netColor = computed(() => {
  if (props.repaid >= props.amount)         return 'text-emerald'
  if (props.status === 'active')            return 'text-muted'
  if (props.status === 'open')              return 'text-muted'
  return                                           'text-danger'
})

// Days remaining for active loans
const daysRemaining = computed(() => {
  if (!props.dueDate) return null
  const due   = new Date(props.dueDate).getTime()
  const today = new Date('2026-04-12').getTime()
  return Math.ceil((due - today) / 86_400_000)
})

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
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
        {{ amount.toLocaleString() }}
        <span class="text-white/50 text-sm font-normal">{{ currency }}</span>
      </p>
    </div>

    <!-- APY -->
    <div class="w-20 flex-shrink-0">
      <p class="font-mono font-bold text-white">{{ apy }}%</p>
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
