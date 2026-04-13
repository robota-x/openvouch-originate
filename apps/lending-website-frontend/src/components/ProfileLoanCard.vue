<script setup lang="ts">
import { computed } from 'vue'
import type { ProfileLoan } from '../types'

const props = defineProps<ProfileLoan>()
const emit  = defineEmits<{ view: [] }>()

// active = grey  ·  closed+fully-repaid = emerald  ·  closed+defaulted = danger
const statusStyle = computed(() => {
  if (props.status === 'open')                    return 'border-primary/40 bg-primary/10 text-primary'
  if (props.status === 'active')                  return 'border-white/20   bg-white/5   text-muted'
  if (props.repaid >= props.amount)               return 'border-emerald/40 bg-emerald/10 text-emerald'
  return                                                  'border-danger/40  bg-danger/10  text-danger'
})

const statusLabel = computed(() => {
  if (props.status === 'open')          return 'Open offer'
  if (props.status === 'active')        return 'Active'
  if (props.repaid >= props.amount)     return 'Repaid'
  return                                        'Defaulted'
})

// Days remaining until dueDate (negative means overdue, but active loans always have future dates)
const daysRemaining = computed(() => {
  if (!props.dueDate) return null
  const due   = new Date(props.dueDate).getTime()
  const today = new Date('2026-04-12').getTime()
  return Math.ceil((due - today) / 86_400_000)
})

function fmt(n: number) {
  return n.toLocaleString()
}
</script>

<template>
  <div class="glass-panel rounded p-4 flex flex-col gap-3 cursor-pointer" @click="emit('view')">

    <!-- Status badge -->
    <div class="flex items-center justify-between">
      <span class="px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wide" :class="statusStyle">
        {{ statusLabel }}
      </span>
      <span class="font-mono text-[10px] text-muted">{{ currency }}</span>
    </div>

    <!-- Amount -->
    <div>
      <p class="font-mono text-xl font-bold text-white">
        {{ fmt(amount) }} <span class="text-white/50 text-sm font-normal">{{ currency }}</span>
      </p>
      <!-- Active: due date countdown -->
      <p v-if="status === 'active' && daysRemaining !== null" class="text-[11px] text-muted mt-0.5">
        due in <span class="font-mono font-bold text-white">{{ daysRemaining }}d</span>
      </p>
    </div>

    <!-- Stats row -->
    <div class="flex items-center gap-3 text-[11px] text-muted flex-wrap">
      <span>APY <span class="font-mono font-bold text-white">{{ apy }}%</span></span>
      <span class="text-white/20">·</span>
      <span>{{ duration }}d</span>
      <template v-if="counterparty">
        <span class="text-white/20">·</span>
        <span class="font-mono">{{ counterparty.slice(0, 10) }}…</span>
      </template>
    </div>

  </div>
</template>
