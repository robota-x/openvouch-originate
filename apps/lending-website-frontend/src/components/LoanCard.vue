<script setup lang="ts">
import { computed } from 'vue'
import type { Loan } from '../types'

const props = defineProps<Loan & { variant?: 'card' | 'list' }>()

const emit = defineEmits<{ fund: [borrower: string]; view: [] }>()

// 100% → emerald  ·  ≥ 90% → orange (caution)  ·  < 90% → danger
const repaymentStyle = computed(() => {
  if (props.repaymentRate === 100)  return 'border-emerald/50 bg-emerald/10 text-emerald'
  if (props.repaymentRate >= 90)    return 'border-orange/50  bg-orange/10  text-orange'
  return                                   'border-danger/50  bg-danger/10  text-danger'
})

// ≥ 700 → emerald  ·  ≥ 400 → orange  ·  < 400 → danger
// trustScoreColor  — plain text, used in card header (no bg)
// trustScoreMuted  — subtle bg + text, used in list cell (no border, rounded not rounded-full)
const trustScoreColor = computed(() => {
  if (props.trustScore >= 700) return 'text-emerald'
  if (props.trustScore >= 400) return 'text-orange'
  return 'text-danger'
})
const trustScoreMuted = computed(() => {
  if (props.trustScore >= 700) return 'bg-emerald/10 text-emerald'
  if (props.trustScore >= 400) return 'bg-orange/10  text-orange'
  return                              'bg-danger/10  text-danger'
})
</script>

<template>
  <!-- ── List row ──────────────────────────────────────────────────── -->
  <div
    v-if="variant === 'list'"
    class="glass-panel rounded px-5 py-4 flex items-center gap-5 hover:bg-surface-hover transition-colors cursor-pointer"
    @click="emit('view')"
  >
    <!-- Borrower column -->
    <RouterLink
      :to="`/profile/${borrower}`"
      class="w-56 flex-shrink-0 flex items-center gap-3 min-w-0 hover:bg-white/5 rounded cursor-pointer transition-colors"
      @click.stop
    >
      <div class="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
        <span class="font-mono text-xs text-primary">0x</span>
      </div>
      <div class="min-w-0 flex flex-col gap-0.5">
        <span class="text-sm font-bold text-white truncate">{{ nickname }}</span>
        <span class="font-mono text-[10px] text-muted leading-tight break-all">{{ borrower }}</span>
      </div>
    </RouterLink>

    <!-- Trust Score — subtle rounded chip, no border, no icon in rows -->
    <div class="w-20 flex-shrink-0">
      <span class="font-mono font-bold text-xs px-1.5 py-0.5 rounded" :class="trustScoreMuted">
        {{ trustScore }}
      </span>
    </div>

    <!-- Amount -->
    <div class="flex-1 min-w-0">
      <p class="font-mono font-bold text-white leading-tight">
        {{ raisedAmount.toLocaleString() }} / {{ amount.toLocaleString() }}
        <span class="text-white/50 text-[10px] font-normal uppercase ml-1">{{ currency }}</span>
      </p>
      <div class="w-24 h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
        <div 
          class="h-full bg-primary transition-all duration-500" 
          :style="{ width: `${Math.min(100, (raisedAmount / amount) * 100)}%` }"
        />
      </div>
    </div>

    <!-- APY -->
    <div class="w-20 flex-shrink-0">
      <p class="font-mono font-bold text-white">{{ apy }}%</p>
    </div>

    <!-- Duration -->
    <div class="w-20 flex-shrink-0">
      <p class="font-mono font-bold text-white">{{ duration }}d</p>
    </div>

    <!-- Attestations -->
    <div class="w-24 flex-shrink-0">
      <span class="px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary/80 text-[10px] font-bold font-mono">
        {{ attestationCount }}
      </span>
    </div>

    <!-- Repaid -->
    <div class="w-24 flex-shrink-0">
      <span class="px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono" :class="repaymentStyle">
        {{ repaymentRate }}%
      </span>
    </div>

    <!-- CTA -->
    <button
      class="w-16 flex-shrink-0 px-3 py-1.5 rounded bg-primary text-white text-xs font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow"
      @click.stop="emit('view')"
    >
      Fund
    </button>
  </div>

  <!-- ── Card ──────────────────────────────────────────────────────── -->
  <div v-else class="glass-panel rounded p-5 flex flex-col gap-4 cursor-pointer" @click="emit('view')">

    <!-- Borrower header — profile left, trust score right -->
    <div class="flex items-start justify-between gap-3">
      <RouterLink
        :to="`/profile/${borrower}`"
        class="flex items-start gap-3 min-w-0 flex-1 hover:bg-white/5 rounded transition-colors"
        @click.stop
      >
        <div class="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span class="font-mono text-xs text-primary">0x</span>
        </div>
        <div class="min-w-0 flex flex-col gap-1">
          <span class="text-sm font-bold text-white leading-tight">{{ nickname }}</span>
          <span class="font-mono text-[10px] text-muted leading-tight break-all">{{ borrower }}</span>
          <!-- Badges -->
          <div class="flex items-center gap-1.5 flex-wrap mt-1">
            <span class="px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono" :class="repaymentStyle">
              {{ repaymentRate }}% repaid
            </span>
            <span class="px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary/80 text-[10px] font-bold font-mono">
              {{ attestationCount }} attestations
            </span>
          </div>
        </div>
      </RouterLink>

      <!-- Trust Score — number prominent, icon small and to its right -->
      <div class="flex-shrink-0 flex flex-col items-end gap-0.5">
        <div class="flex items-baseline gap-0.5" :class="trustScoreColor">
          <span class="font-mono font-bold text-xl leading-none">{{ trustScore }}</span>
          <span class="material-symbols-outlined text-[9px] leading-none" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
        </div>
        <span class="text-[9px] text-muted uppercase tracking-widest">Trust</span>
      </div>
    </div>

    <!-- Amount -->
    <div>
      <div class="flex items-end justify-between mb-1">
        <p class="text-xs text-muted uppercase tracking-widest">Amount</p>
        <p class="font-mono text-xs text-white/70">
          {{ Math.round((raisedAmount / amount) * 100) }}% funded
        </p>
      </div>
      <p class="font-mono text-2xl font-bold text-white">
        {{ raisedAmount.toLocaleString() }}
        <span class="text-base text-white/50 font-normal">/ {{ amount.toLocaleString() }} {{ currency }}</span>
      </p>
      <div class="w-full h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
        <div 
          class="h-full bg-primary transition-all duration-500 shadow-glow-primary" 
          :style="{ width: `${Math.min(100, (raisedAmount / amount) * 100)}%` }"
        />
      </div>
    </div>

    <!-- APY / Duration inset row -->
    <div class="bg-black/20 rounded px-4 py-3 flex items-center justify-between">
      <div>
        <p class="text-xs text-muted uppercase tracking-widest mb-0.5">APY</p>
        <p class="font-mono text-lg font-bold text-white">{{ apy }}%</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-muted uppercase tracking-widest mb-0.5">Duration</p>
        <p class="font-mono text-lg font-bold text-white">{{ duration }} days</p>
      </div>
    </div>

    <!-- CTA -->
    <button
      class="w-full py-2.5 rounded bg-primary text-white text-sm font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow"
      @click.stop="emit('view')"
    >
      Fund Request
    </button>
  </div>
</template>
