<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import LoanCard from '../components/LoanCard.vue'

type View   = 'grid' | 'list'
type SortBy = 'apy' | 'repayment' | 'attestations' | 'amount'

interface Loan {
  borrower: string
  nickname: string
  repaymentRate: number   // 0–100
  attestationCount: number
  amount: number
  currency: string
  apy: number
  duration: number        // days
}

// ── Static data ─────────────────────────────────────────────────────────────
const loans: Loan[] = [
  { borrower: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F', nickname: 'alice.eth',      repaymentRate: 100, attestationCount: 12, amount: 5000,   currency: 'USDC', apy: 12.5, duration: 30  },
  { borrower: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', nickname: 'vitalik.eth',    repaymentRate: 100, attestationCount: 8,  amount: 2500,   currency: 'USDC', apy: 9.0,  duration: 60  },
  { borrower: '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B', nickname: 'defi-whale.eth', repaymentRate: 94,  attestationCount: 5,  amount: 10000,  currency: 'USDC', apy: 11.0, duration: 30  },
  { borrower: '0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6', nickname: 'anon-3439',      repaymentRate: 78,  attestationCount: 2,  amount: 1500,   currency: 'USDC', apy: 14.0, duration: 90  },
  { borrower: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4', nickname: 'cobie.base',     repaymentRate: 100, attestationCount: 9,  amount: 7500,   currency: 'USDC', apy: 10.5, duration: 60  },
]

// ── View & sort state ────────────────────────────────────────────────────────
const view   = ref<View>('grid')
const sortBy = ref<SortBy>('apy')

// ── Exponential scale helpers ────────────────────────────────────────────────
// slider 0–100  →  1–3650 days  (≈ 1 day to 10 years)
function sliderToDays(s: number): number {
  return Math.max(1, Math.round(Math.pow(3650, s / 100)))
}

// slider 0–100  →  0–1,000,000
function sliderToAmount(s: number): number {
  if (s === 0) return 0
  return Math.round(Math.pow(1_000_000, s / 100))
}

function fmtDays(d: number): string {
  if (d >= 730)  return `${(d / 365).toFixed(0)}y`
  if (d >= 365)  return `${(d / 365).toFixed(1)}y`
  if (d >= 60)   return `${Math.round(d / 30)}mo`
  return `${d}d`
}

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return '1M'
  if (n >= 100_000)   return `${(n / 1000).toFixed(0)}k`
  if (n >= 1_000)     return `${(n / 1000).toFixed(1)}k`
  return n.toString()
}

// ── Filter state (defaults = show everything) ────────────────────────────────
const DEFAULTS = {
  apyMin:             0,    // direct value, 0–50
  apyMax:             50,   // direct value, 0–50  (ignored when apyMaxUnbound)
  apyMaxUnbound:      true,

  durationMaxSlider:  100,  // exponential, 0–100  (ignored when durationMaxUnbound)
  durationMaxUnbound: true,

  amountMinSlider:    0,    // exponential, 0–100
  amountMaxSlider:    100,  // exponential, 0–100  (ignored when amountMaxUnbound)
  amountMaxUnbound:   true,

  attestationMin:     0,
  repaymentMin:       0,
}

const filters = reactive({ ...DEFAULTS })

// Derived actual values from exponential sliders
const durationMax = computed(() => sliderToDays(filters.durationMaxSlider))
const amountMin   = computed(() => sliderToAmount(filters.amountMinSlider))
const amountMax   = computed(() => sliderToAmount(filters.amountMaxSlider))

function reset() { Object.assign(filters, DEFAULTS) }

function clampApy(which: 'min' | 'max') {
  if (which === 'min' && filters.apyMin > filters.apyMax) filters.apyMax = filters.apyMin
  if (which === 'max' && filters.apyMax < filters.apyMin) filters.apyMin = filters.apyMax
}

function clampAmount() {
  if (filters.amountMinSlider > filters.amountMaxSlider)
    filters.amountMaxSlider = filters.amountMinSlider
}

// ── Derived list ─────────────────────────────────────────────────────────────
const visibleLoans = computed(() => {
  const f = filters
  return loans
    .filter(l =>
      l.apy              >= f.apyMin                                   &&
      (f.apyMaxUnbound      || l.apy      <= f.apyMax)                 &&
      (f.durationMaxUnbound || l.duration <= durationMax.value)        &&
      l.amount           >= amountMin.value                            &&
      (f.amountMaxUnbound   || l.amount   <= amountMax.value)          &&
      l.attestationCount >= f.attestationMin                           &&
      l.repaymentRate    >= f.repaymentMin
    )
    .sort((a, b) => {
      switch (sortBy.value) {
        case 'apy':          return b.apy              - a.apy
        case 'repayment':    return b.repaymentRate    - a.repaymentRate
        case 'attestations': return b.attestationCount - a.attestationCount
        case 'amount':       return b.amount           - a.amount
      }
    })
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-3.5rem)]">

    <!-- ── Sidebar ───────────────────────────────────────────────── -->
    <aside class="hidden md:flex flex-col w-64 flex-shrink-0 glass-panel border-r border-border overflow-y-auto">
      <div class="p-6 flex flex-col gap-6">

        <div class="flex items-center justify-between">
          <h2 class="font-display font-bold text-white text-sm tracking-tight">Filters</h2>
          <button class="text-xs text-muted hover:text-white transition-colors" @click="reset">Reset</button>
        </div>

        <!-- APY range -->
        <div class="flex flex-col gap-3">
          <p class="text-xs text-muted uppercase tracking-widest">APY</p>
          <div class="flex flex-col gap-2">
            <!-- Min -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">Min</span>
              <span class="font-mono text-xs text-white">{{ filters.apyMin }}%</span>
            </div>
            <input
              v-model.number="filters.apyMin"
              type="range" min="0" max="50" step="0.5"
              class="w-full accent-primary"
              @input="clampApy('min')"
            />
            <!-- Max with ∞ toggle -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">Max</span>
              <div class="flex items-center gap-1.5">
                <span class="font-mono text-xs" :class="filters.apyMaxUnbound ? 'text-primary' : 'text-white'">
                  {{ filters.apyMaxUnbound ? '∞' : `${filters.apyMax}%` }}
                </span>
                <button
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors"
                  :class="filters.apyMaxUnbound
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'bg-white/5 text-muted border-white/10 hover:text-white'"
                  @click="filters.apyMaxUnbound = !filters.apyMaxUnbound"
                >∞</button>
              </div>
            </div>
            <input
              v-model.number="filters.apyMax"
              type="range" min="0" max="50" step="0.5"
              class="w-full accent-primary transition-opacity"
              :class="filters.apyMaxUnbound ? 'opacity-30 pointer-events-none' : ''"
              :disabled="filters.apyMaxUnbound"
              @input="clampApy('max')"
            />
          </div>
        </div>

        <!-- Amount range (exponential) -->
        <div class="flex flex-col gap-3">
          <p class="text-xs text-muted uppercase tracking-widest">Amount (USDC)</p>
          <div class="flex flex-col gap-2">
            <!-- Min -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">Min</span>
              <span class="font-mono text-xs text-white">{{ fmtAmount(amountMin) }}</span>
            </div>
            <input
              v-model.number="filters.amountMinSlider"
              type="range" min="0" max="100" step="1"
              class="w-full accent-primary"
              @input="clampAmount"
            />
            <!-- Max with ∞ toggle -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">Max</span>
              <div class="flex items-center gap-1.5">
                <span class="font-mono text-xs" :class="filters.amountMaxUnbound ? 'text-primary' : 'text-white'">
                  {{ filters.amountMaxUnbound ? '∞' : fmtAmount(amountMax) }}
                </span>
                <button
                  class="text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors"
                  :class="filters.amountMaxUnbound
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'bg-white/5 text-muted border-white/10 hover:text-white'"
                  @click="filters.amountMaxUnbound = !filters.amountMaxUnbound"
                >∞</button>
              </div>
            </div>
            <input
              v-model.number="filters.amountMaxSlider"
              type="range" min="0" max="100" step="1"
              class="w-full accent-primary transition-opacity"
              :class="filters.amountMaxUnbound ? 'opacity-30 pointer-events-none' : ''"
              :disabled="filters.amountMaxUnbound"
              @input="clampAmount"
            />
          </div>
        </div>

        <!-- Duration max (exponential, up to 10y) -->
        <div class="flex flex-col gap-3">
          <p class="text-xs text-muted uppercase tracking-widest">Max Duration</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">Up to</span>
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-xs" :class="filters.durationMaxUnbound ? 'text-primary' : 'text-white'">
                {{ filters.durationMaxUnbound ? '∞' : fmtDays(durationMax) }}
              </span>
              <button
                class="text-[10px] font-bold px-1.5 py-0.5 rounded border transition-colors"
                :class="filters.durationMaxUnbound
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'bg-white/5 text-muted border-white/10 hover:text-white'"
                @click="filters.durationMaxUnbound = !filters.durationMaxUnbound"
              >∞</button>
            </div>
          </div>
          <input
            v-model.number="filters.durationMaxSlider"
            type="range" min="0" max="100" step="1"
            class="w-full accent-primary transition-opacity"
            :class="filters.durationMaxUnbound ? 'opacity-30 pointer-events-none' : ''"
            :disabled="filters.durationMaxUnbound"
          />
        </div>

        <!-- Min attestations -->
        <div class="flex flex-col gap-3">
          <p class="text-xs text-muted uppercase tracking-widest">Min Attestations</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">At least</span>
            <span class="font-mono text-xs text-white">{{ filters.attestationMin }}</span>
          </div>
          <input
            v-model.number="filters.attestationMin"
            type="range" min="0" max="15" step="1"
            class="w-full accent-primary"
          />
        </div>

        <!-- Min repayment rate -->
        <div class="flex flex-col gap-3">
          <p class="text-xs text-muted uppercase tracking-widest">Min Repayment Rate</p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">At least</span>
            <span
              class="font-mono text-xs font-bold"
              :class="filters.repaymentMin === 100 ? 'text-emerald'
                    : filters.repaymentMin >= 90  ? 'text-orange'
                    : filters.repaymentMin > 0    ? 'text-danger'
                    : 'text-white'"
            >
              {{ filters.repaymentMin }}%
            </span>
          </div>
          <input
            v-model.number="filters.repaymentMin"
            type="range" min="0" max="100" step="1"
            class="w-full accent-primary"
          />
        </div>

      </div>
    </aside>

    <!-- ── Main ─────────────────────────────────────────────────── -->
    <main class="flex-1 px-6 py-8 min-w-0">

      <div class="flex items-center justify-between mb-6">
        <div class="flex items-baseline gap-3">
          <h1 class="font-display font-bold text-white text-2xl tracking-tight">Open Requests</h1>
          <span class="font-mono text-xs text-muted">{{ visibleLoans.length }} / {{ loans.length }}</span>
        </div>

        <div class="flex items-center gap-3">
          <select
            v-model="sortBy"
            class="bg-black/20 border border-border text-muted text-xs rounded px-3 py-1.5 cursor-pointer"
          >
            <option value="apy">Sort: Highest APY</option>
            <option value="repayment">Sort: Best Repayment</option>
            <option value="attestations">Sort: Most Attested</option>
            <option value="amount">Sort: Largest Amount</option>
          </select>

          <!-- View toggle -->
          <div class="flex items-center border border-border rounded overflow-hidden">
            <button
              class="px-3 py-1.5 transition-colors"
              :class="view === 'grid' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'"
              title="Grid view"
              @click="view = 'grid'"
            >
              <span class="material-symbols-outlined text-xl leading-none align-middle">grid_view</span>
            </button>
            <div class="w-px h-6 bg-border" />
            <button
              class="px-3 py-1.5 transition-colors"
              :class="view === 'list' ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'"
              title="List view"
              @click="view = 'list'"
            >
              <span class="material-symbols-outlined text-xl leading-none align-middle">view_list</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="visibleLoans.length === 0" class="glass-panel rounded p-12 flex flex-col items-center gap-3 text-center">
        <span class="material-symbols-outlined text-4xl text-muted">search_off</span>
        <p class="text-white font-bold">No requests match your filters</p>
        <p class="text-muted text-sm">Try widening the ranges or
          <button class="text-primary hover:underline" @click="reset">reset filters</button>.
        </p>
      </div>

      <!-- Grid view -->
      <div v-else-if="view === 'grid'" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <LoanCard v-for="loan in visibleLoans" :key="loan.borrower" v-bind="loan" />
      </div>

      <!-- List view -->
      <div v-else class="flex flex-col gap-2">
        <div class="px-5 pb-1 flex items-center gap-4">
          <div class="w-72 flex-shrink-0 text-xs text-muted uppercase tracking-widest">Borrower</div>
          <div class="flex-1 text-xs text-muted uppercase tracking-widest">Amount</div>
          <div class="w-16 flex-shrink-0 text-xs text-muted uppercase tracking-widest">APY</div>
          <div class="w-20 flex-shrink-0 text-xs text-muted uppercase tracking-widest">Duration</div>
          <div class="w-16 flex-shrink-0" />
        </div>
        <LoanCard v-for="loan in visibleLoans" :key="loan.borrower" v-bind="loan" variant="list" />
      </div>

    </main>
  </div>
</template>
