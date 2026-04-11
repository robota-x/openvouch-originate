<script setup lang="ts">
import LoanCard from '../components/LoanCard.vue'

interface Loan {
  borrower: string
  trustScore: number
  amount: number
  currency: string
  apy: number
  duration: string
}

const loans: Loan[] = [
  { borrower: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', trustScore: 845, amount: 5000,  currency: 'USDC', apy: 12.5, duration: '30 days' },
  { borrower: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', trustScore: 720, amount: 2500,  currency: 'USDC', apy: 9.0,  duration: '60 days' },
  { borrower: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', trustScore: 780, amount: 10000, currency: 'USDC', apy: 11.0, duration: '30 days' },
  { borrower: '0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6', trustScore: 650, amount: 1500,  currency: 'USDC', apy: 14.0, duration: '90 days' },
  { borrower: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4', trustScore: 810, amount: 7500,  currency: 'USDC', apy: 10.5, duration: '60 days' },
]
</script>

<template>
  <div class="flex min-h-[calc(100vh-3.5rem)]">

    <!-- ── Sidebar ────────────────────────────────────────────────── -->
    <aside class="hidden md:flex flex-col w-60 flex-shrink-0 glass-panel border-r border-border p-6 gap-6">

      <div class="flex items-center justify-between">
        <h2 class="font-display font-bold text-white text-sm tracking-tight">Filters</h2>
        <button class="text-xs text-muted hover:text-white transition-colors">Reset</button>
      </div>

      <!-- Min APY -->
      <div class="flex flex-col gap-2">
        <p class="text-xs text-muted uppercase tracking-widest">Min APY</p>
        <input
          type="range"
          min="0"
          max="20"
          value="8"
          class="w-full accent-primary"
        />
        <p class="font-mono text-xs text-white">8%</p>
      </div>

      <!-- Duration -->
      <div class="flex flex-col gap-2">
        <p class="text-xs text-muted uppercase tracking-widest">Duration</p>
        <label v-for="dur in ['Any', '30 Days', '60 Days', '90+ Days']" :key="dur" class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="dur === '30 Days'"
            class="accent-primary"
          />
          <span class="text-sm" :class="dur === '30 Days' ? 'text-white' : 'text-muted'">{{ dur }}</span>
        </label>
      </div>

      <!-- Min Trust Score -->
      <div class="flex flex-col gap-2">
        <p class="text-xs text-muted uppercase tracking-widest">Min Trust Score</p>
        <div class="flex gap-2">
          <button
            v-for="score in [600, 700, 800]"
            :key="score"
            class="flex-1 py-1.5 rounded border text-xs font-mono font-bold transition-colors"
            :class="score === 700
              ? 'border-emerald bg-emerald/10 text-emerald shadow-glow-emerald'
              : 'border-border text-muted hover:border-border-hover hover:text-white'"
          >
            {{ score }}
          </button>
        </div>
      </div>

    </aside>

    <!-- ── Main ───────────────────────────────────────────────────── -->
    <main class="flex-1 px-6 py-8">

      <div class="flex items-center justify-between mb-6">
        <h1 class="font-display font-bold text-white text-2xl tracking-tight">Open Requests</h1>
        <select class="bg-black/20 border border-border text-muted text-xs rounded px-3 py-1.5 cursor-pointer">
          <option>Sort: Highest APY</option>
          <option>Sort: Highest Trust</option>
          <option>Sort: Newest</option>
        </select>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <LoanCard
          v-for="(loan, i) in loans"
          :key="loan.borrower"
          v-bind="loan"
          :loading="i === 2"
        />
      </div>

    </main>
  </div>
</template>
