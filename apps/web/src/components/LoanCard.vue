<script setup lang="ts">
import TrustBadge from './TrustBadge.vue'
import WalletAddress from './WalletAddress.vue'

defineProps<{
  borrower: string
  trustScore: number
  amount: number
  currency: string
  apy: number
  duration: string
  loading?: boolean
}>()

const emit = defineEmits<{ fund: [borrower: string] }>()
</script>

<template>
  <!-- Skeleton state -->
  <div v-if="loading" class="glass-panel rounded p-5 flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-black/10 animate-pulse" />
      <div class="flex flex-col gap-1.5 flex-1">
        <div class="h-3 w-24 bg-black/10 rounded animate-pulse" />
        <div class="h-3 w-14 bg-black/10 rounded animate-pulse" />
      </div>
    </div>
    <div class="h-8 w-32 bg-black/10 rounded animate-pulse" />
    <div class="h-10 bg-black/20 rounded animate-pulse" />
    <div class="h-9 bg-black/10 rounded animate-pulse" />
  </div>

  <!-- Normal state -->
  <div v-else class="glass-panel rounded p-5 flex flex-col gap-4">
    <!-- Borrower header -->
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
        <span class="font-mono text-xs text-primary">0x</span>
      </div>
      <div class="flex flex-col gap-1 min-w-0">
        <WalletAddress :address="borrower" />
        <TrustBadge :score="trustScore" />
      </div>
    </div>

    <!-- Amount -->
    <div>
      <p class="text-xs text-muted uppercase tracking-widest mb-1">Amount</p>
      <p class="font-mono text-2xl font-bold text-white">
        {{ amount.toLocaleString() }}
        <span class="text-base text-white/60">{{ currency }}</span>
      </p>
    </div>

    <!-- APY / Duration inset row -->
    <div class="bg-black/20 rounded px-4 py-3 flex items-center justify-between">
      <div>
        <p class="text-xs text-muted uppercase tracking-widest">APY</p>
        <p class="font-mono text-lg font-bold text-white">{{ apy }}%</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-muted uppercase tracking-widest">Duration</p>
        <p class="font-mono text-lg font-bold text-white">{{ duration }}</p>
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
