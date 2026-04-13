<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import LoanCard from '../components/LoanCard.vue'
import ContractModal from '../components/ContractModal.vue'
import WalletConnectModal from '../components/WalletConnectModal.vue'
import { backendClient } from '../api/client'
import { ApiError, type Loan, type ContractView } from '../types'
import { useAuth } from '../composables/useAuth'

type View   = 'grid' | 'list'
type SortBy  = 'trustScore' | 'apy' | 'repaymentRate' | 'attestationCount' | 'amount' | 'duration'
type SortDir = 'desc' | 'asc'

// ── Remote data ──────────────────────────────────────────────────────────────
const loans     = ref<Loan[]>([])
const loadError = ref<string | null>(null)

onMounted(async () => {
  try {
    loans.value = await backendClient.getOpenRequests()
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'Failed to load open requests'
  }
})

const auth = useAuth()

// ── Contract modal ────────────────────────────────────────────────────────────
const activeContract     = ref<ContractView | null>(null)
const showConnectModal   = ref(false)
// Held while the user completes auth, then the fund action resumes automatically.
const pendingFundBorrower = ref<string | null>(null)

function openContract(loan: Loan) {
  activeContract.value = {
    borrower:                loan.borrower,
    borrowerNickname:        loan.nickname,
    borrowerTrustScore:      loan.trustScore,
    borrowerAttestationCount: loan.attestationCount,
    borrowerRepaymentRate:   loan.repaymentRate,
    amount:   loan.amount,
    currency: loan.currency,
    apy:      loan.apy,
    duration: loan.duration,
    status:   'open',
  }
}

// ── Fund action ───────────────────────────────────────────────────────────────
// NOTE: auth intercept here is an intentional UX funnel, not a security boundary.
// A non-authed user could fund directly on-chain. We intercept to drive wallet adoption.
function handleFund(borrower: string) {
  activeContract.value = null
  if (!auth.isConnected) {
    pendingFundBorrower.value = borrower
    showConnectModal.value    = true
    return
  }
  // TODO: proceed with on-chain funding action for borrower
}

function onConnected() {
  if (pendingFundBorrower.value) {
    // TODO: resume fund action for pendingFundBorrower.value
    pendingFundBorrower.value = null
  }
}

// ── View & sort state ────────────────────────────────────────────────────────
const view    = ref<View>('grid')
const sortBy  = ref<SortBy>('trustScore')
const sortDir = ref<SortDir>('desc')

// Clicking the active sort key toggles direction; a new key resets to desc.
function setSort(key: SortBy) {
  if (sortBy.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortBy.value = key
    sortDir.value = 'desc'
  }
}

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
  trustScoreMin:      0,
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
  return loans.value
    .filter(l =>
      l.apy              >= f.apyMin                                   &&
      (f.apyMaxUnbound      || l.apy      <= f.apyMax)                 &&
      (f.durationMaxUnbound || l.duration <= durationMax.value)        &&
      l.amount           >= amountMin.value                            &&
      (f.amountMaxUnbound   || l.amount   <= amountMax.value)          &&
      l.attestationCount >= f.attestationMin                           &&
      l.repaymentRate    >= f.repaymentMin                             &&
      l.trustScore       >= f.trustScoreMin
    )
    .sort((a, b) => {
      let diff: number
      switch (sortBy.value) {
        case 'trustScore':   diff = b.trustScore       - a.trustScore;       break
        case 'apy':          diff = b.apy              - a.apy;              break
        case 'repaymentRate':    diff = b.repaymentRate    - a.repaymentRate;    break
        case 'attestationCount': diff = b.attestationCount - a.attestationCount; break
        case 'amount':       diff = b.amount           - a.amount;           break
        case 'duration':     diff = b.duration         - a.duration;         break
      }
      return sortDir.value === 'desc' ? diff : -diff
    })
})
</script>

<template>
  <div class="flex min-h-[calc(100vh-3.5rem)]">

    <!-- ── Sidebar ───────────────────────────────────────────────── -->
    <aside class="hidden md:flex flex-col w-64 flex-shrink-0 glass-panel border-r border-border overflow-y-auto">
      <div class="p-6 flex flex-col gap-6">

        <!-- Sort -->
        <div class="flex flex-col gap-3">
          <h2 class="font-display font-bold text-white text-sm tracking-tight">Sort</h2>
          <div class="flex flex-col gap-1">
            <button
              v-for="opt in ([
                { value: 'trustScore',   label: 'Trust Score',   icon: 'auto_awesome' },
                { value: 'apy',          label: 'APY',           icon: '' },
                { value: 'repaymentRate',    label: 'Repayment',     icon: '' },
                { value: 'attestationCount', label: 'Attestations',  icon: '' },
                { value: 'amount',       label: 'Amount',        icon: '' },
                { value: 'duration',     label: 'Duration',      icon: '' },
              ] as const)"
              :key="opt.value"
              class="w-full px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5"
              :class="sortBy === opt.value
                ? 'bg-primary/20 text-primary font-bold'
                : 'text-muted hover:text-white hover:bg-white/5'"
              @click="setSort(opt.value)"
            >
              <span class="flex-1 text-left">{{ opt.label }}</span>
              <span
                v-if="opt.icon"
                class="material-symbols-outlined text-[11px] leading-none flex-shrink-0"
                style="font-variation-settings: 'FILL' 1"
              >{{ opt.icon }}</span>
              <span
                v-if="sortBy === opt.value"
                class="material-symbols-outlined text-[9px] leading-none flex-shrink-0"
              >{{ sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}</span>
            </button>
          </div>
        </div>

        <div class="border-t border-border" />

        <!-- Filters heading -->
        <div class="flex items-center justify-between">
          <h2 class="font-display font-bold text-white text-sm tracking-tight">Filters</h2>
          <button class="text-xs text-muted hover:text-white transition-colors" @click="reset">Reset</button>
        </div>

        <!-- Trust Score min -->
        <div class="flex flex-col gap-3">
          <p class="text-xs text-muted uppercase tracking-widest flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[11px] leading-none text-primary" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
            Min Trust Score
          </p>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted">At least</span>
            <span
              class="font-mono text-xs font-bold"
              :class="filters.trustScoreMin >= 700 ? 'text-emerald'
                    : filters.trustScoreMin >= 400 ? 'text-orange'
                    : filters.trustScoreMin  >  0  ? 'text-danger'
                    : 'text-white'"
            >{{ filters.trustScoreMin }}</span>
          </div>
          <input
            v-model.number="filters.trustScoreMin"
            type="range" min="0" max="1000" step="10"
            class="w-full accent-primary"
          />
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
            <!-- Max -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">
                Max<span v-if="!filters.apyMaxUnbound" class="font-mono text-white ml-1">{{ filters.apyMax }}%</span>
              </span>
              <label class="flex items-center gap-1.5 cursor-pointer select-none">
                <input v-model="filters.apyMaxUnbound" type="checkbox" class="accent-primary cursor-pointer" />
                <span class="text-xs text-muted">No limit</span>
              </label>
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
            <!-- Max -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted">
                Max<span v-if="!filters.amountMaxUnbound" class="font-mono text-white ml-1">{{ fmtAmount(amountMax) }}</span>
              </span>
              <label class="flex items-center gap-1.5 cursor-pointer select-none">
                <input v-model="filters.amountMaxUnbound" type="checkbox" class="accent-primary cursor-pointer" />
                <span class="text-xs text-muted">No limit</span>
              </label>
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
            <span class="text-xs text-muted">
              Up to<span v-if="!filters.durationMaxUnbound" class="font-mono text-white ml-1">{{ fmtDays(durationMax) }}</span>
            </span>
            <label class="flex items-center gap-1.5 cursor-pointer select-none">
              <input v-model="filters.durationMaxUnbound" type="checkbox" class="accent-primary cursor-pointer" />
              <span class="text-xs text-muted">No limit</span>
            </label>
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

      <!-- Error state -->
      <div v-if="loadError" class="glass-panel rounded p-12 flex flex-col items-center gap-3 text-center">
        <span class="material-symbols-outlined text-4xl text-danger">error_outline</span>
        <p class="text-white font-bold">Could not load open requests</p>
        <p class="text-muted text-sm font-mono">{{ loadError }}</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="visibleLoans.length === 0" class="glass-panel rounded p-12 flex flex-col items-center gap-3 text-center">
        <span class="material-symbols-outlined text-4xl text-muted">search_off</span>
        <p class="text-white font-bold">No requests match your filters</p>
        <p class="text-muted text-sm">Try widening the ranges or
          <button class="text-primary hover:underline" @click="reset">reset filters</button>.
        </p>
      </div>

      <!-- Grid view -->
      <div v-else-if="view === 'grid'" class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <LoanCard v-for="loan in visibleLoans" :key="loan.borrower" v-bind="loan" @view="openContract(loan)" />
      </div>

      <!-- List view -->
      <div v-else-if="view === 'list'" class="flex flex-col gap-2">
        <div class="px-5 pb-1 flex items-center gap-5">
          <!-- Non-sortable -->
          <div class="w-56 flex-shrink-0 text-xs text-muted uppercase tracking-widest">Borrower</div>

          <!-- Sortable columns — shared style via a local pattern -->
          <button class="w-20 flex-shrink-0 flex items-center gap-1 text-xs uppercase tracking-widest transition-colors"
            :class="sortBy === 'trustScore' ? 'text-white' : 'text-muted hover:text-white'"
            @click="setSort('trustScore')">
            <span class="material-symbols-outlined text-[11px] leading-none" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
            Trust
            <span v-if="sortBy === 'trustScore'" class="material-symbols-outlined text-[9px] leading-none ml-0.5">{{ sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}</span>
          </button>

          <button class="flex-1 min-w-0 flex items-center gap-1 text-xs uppercase tracking-widest transition-colors"
            :class="sortBy === 'amount' ? 'text-white' : 'text-muted hover:text-white'"
            @click="setSort('amount')">
            Amount
            <span v-if="sortBy === 'amount'" class="material-symbols-outlined text-[9px] leading-none ml-0.5">{{ sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}</span>
          </button>

          <button class="w-20 flex-shrink-0 flex items-center gap-1 text-xs uppercase tracking-widest transition-colors"
            :class="sortBy === 'apy' ? 'text-white' : 'text-muted hover:text-white'"
            @click="setSort('apy')">
            APY
            <span v-if="sortBy === 'apy'" class="material-symbols-outlined text-[9px] leading-none ml-0.5">{{ sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}</span>
          </button>

          <button class="w-20 flex-shrink-0 flex items-center gap-1 text-xs uppercase tracking-widest transition-colors"
            :class="sortBy === 'duration' ? 'text-white' : 'text-muted hover:text-white'"
            @click="setSort('duration')">
            Duration
            <span v-if="sortBy === 'duration'" class="material-symbols-outlined text-[9px] leading-none ml-0.5">{{ sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}</span>
          </button>

          <button class="w-24 flex-shrink-0 flex items-center gap-1 text-xs uppercase tracking-widest transition-colors"
            :class="sortBy === 'attestationCount' ? 'text-white' : 'text-muted hover:text-white'"
            @click="setSort('attestationCount')">
            Attestations
            <span v-if="sortBy === 'attestationCount'" class="material-symbols-outlined text-[9px] leading-none ml-0.5">{{ sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}</span>
          </button>

          <button class="w-24 flex-shrink-0 flex items-center gap-1 text-xs uppercase tracking-widest transition-colors"
            :class="sortBy === 'repaymentRate' ? 'text-white' : 'text-muted hover:text-white'"
            @click="setSort('repaymentRate')">
            Repaid
            <span v-if="sortBy === 'repaymentRate'" class="material-symbols-outlined text-[9px] leading-none ml-0.5">{{ sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}</span>
          </button>

          <div class="w-16 flex-shrink-0" />
        </div>
        <LoanCard v-for="loan in visibleLoans" :key="loan.borrower" v-bind="loan" variant="list" @view="openContract(loan)" />
      </div>

    </main>
  </div>

  <!-- Contract modal -->
  <ContractModal
    v-if="activeContract"
    :contract="activeContract"
    @close="activeContract = null"
    @fund="handleFund"
  />

  <!-- Auth intercept modal for unauthenticated fund attempts -->
  <WalletConnectModal v-model="showConnectModal" @connected="onConnected" />
</template>
