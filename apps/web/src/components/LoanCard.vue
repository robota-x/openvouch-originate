<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  borrower: string
  nickname: string
  repaymentRate: number
  attestationCount: number
  amount: number
  currency: string
  apy: number
  duration: number        // days
  variant?: 'card' | 'list'
}>()

const emit = defineEmits<{ fund: [borrower: string] }>()

// 100% → emerald  ·  ≥ 90% → orange (caution)  ·  < 90% → danger
const repaymentStyle = computed(() => {
  if (props.repaymentRate === 100)  return 'border-emerald/50 bg-emerald/10 text-emerald'
  if (props.repaymentRate >= 90)    return 'border-orange/50  bg-orange/10  text-orange'
  return                                   'border-danger/50  bg-danger/10  text-danger'
})
</script>

<template>
  <!-- ── List row ──────────────────────────────────────────────────── -->
  <div
    v-if="variant === 'list'"
    class="glass-panel rounded px-5 py-4 flex items-center gap-4 hover:bg-surface-hover transition-colors"
  >
    <!-- Borrower column -->
    <div class="w-72 flex-shrink-0 flex items-center gap-3 min-w-0">
      <div class="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
        <span class="font-mono text-xs text-primary">0x</span>
      </div>
      <div class="min-w-0 flex flex-col gap-1">
        <span class="text-sm font-bold text-white truncate">{{ nickname }}</span>
        <span class="font-mono text-[10px] text-muted leading-tight break-all">{{ borrower }}</span>
        <!-- Badges -->
        <div class="flex items-center gap-1.5 flex-wrap mt-0.5">
          <span class="px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono" :class="repaymentStyle">
            {{ repaymentRate }}% repaid
          </span>
          <span class="px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary/80 text-[10px] font-bold font-mono">
            {{ attestationCount }} attested
          </span>
        </div>
      </div>
    </div>

    <!-- Amount -->
    <div class="flex-1 min-w-0">
      <p class="font-mono font-bold text-white">
        {{ amount.toLocaleString() }}
        <span class="text-white/50 text-sm font-normal">{{ currency }}</span>
      </p>
    </div>

    <!-- APY -->
    <div class="w-16 flex-shrink-0">
      <p class="font-mono font-bold text-white">{{ apy }}%</p>
    </div>

    <!-- Duration -->
    <div class="w-20 flex-shrink-0">
      <p class="font-mono font-bold text-white">{{ duration }}d</p>
    </div>

    <!-- CTA -->
    <button
      class="w-16 flex-shrink-0 px-3 py-1.5 rounded bg-primary text-white text-xs font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow"
      @click="emit('fund', borrower)"
    >
      Fund
    </button>
  </div>

  <!-- ── Card ──────────────────────────────────────────────────────── -->
  <div v-else class="glass-panel rounded p-5 flex flex-col gap-4">

    <!-- Borrower header -->
    <div class="flex items-start gap-3">
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
            {{ attestationCount }} attested
          </span>
        </div>
      </div>
    </div>

    <!-- Amount -->
    <div>
      <p class="text-xs text-muted uppercase tracking-widest mb-1">Amount</p>
      <p class="font-mono text-2xl font-bold text-white">
        {{ amount.toLocaleString() }}
        <span class="text-base text-white/50 font-normal">{{ currency }}</span>
      </p>
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
      @click="emit('fund', borrower)"
    >
      Fund Request
    </button>
  </div>
</template>
