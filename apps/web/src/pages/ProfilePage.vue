<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { Profile, ProfileLoan, ContractView, Attestation, AttestationProvider } from '../types'
import { ApiError } from '../types'
import { backendClient } from '../api/client'
import AttestationCard from '../components/AttestationCard.vue'
import AttestationModal from '../components/AttestationModal.vue'
import ProfileLoanCard from '../components/ProfileLoanCard.vue'
import ContractModal from '../components/ContractModal.vue'

const route   = useRoute()
const address = route.params.address as string

const profile   = ref<Profile | null>(null)
const providers = ref<AttestationProvider[]>([])
const loadError = ref<string | null>(null)
const activeTab = ref<'attestations' | 'loans'>('attestations')

onMounted(async () => {
  try {
    ;[profile.value, providers.value] = await Promise.all([
      backendClient.getProfile(address),
      backendClient.getAttestationProviders(),
    ])
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'Failed to load profile'
  }
})

// ── Trust score color ──────────────────────────────────────────────────────
const trustColor = computed(() => {
  const s = profile.value?.trustScore ?? 0
  if (s >= 700) return 'text-emerald'
  if (s >= 400) return 'text-orange'
  return 'text-danger'
})

// ── Loan groups ────────────────────────────────────────────────────────────
const openLoans   = computed(() => profile.value?.loans.filter(l => l.status === 'open')   ?? [])
const activeLoans = computed(() => profile.value?.loans.filter(l => l.status === 'active') ?? [])
const closedLoans = computed(() => profile.value?.loans.filter(l => l.status === 'closed') ?? [])

// ── Loan recap stats ───────────────────────────────────────────────────────
const totalRepaid = computed(() =>
  profile.value?.loans.reduce((s, l) => s + l.repaid, 0) ?? 0
)
const totalRequested = computed(() =>
  openLoans.value.reduce((s, l) => s + l.amount, 0)
)
// Active loans are fully outstanding (repaid is always 0 until expiry)
const totalOutstanding = computed(() =>
  activeLoans.value.reduce((s, l) => s + l.amount, 0)
)
// Repayment rate is computed only over closed loans (active loans are still pending)
const repaymentRate = computed(() => {
  const borrowed = closedLoans.value.reduce((s, l) => s + l.amount, 0)
  const repaid   = closedLoans.value.reduce((s, l) => s + l.repaid,  0)
  return borrowed > 0 ? Math.round(repaid / borrowed * 100) : 100
})

// ── Attestation modal ──────────────────────────────────────────────────────
const activeAttestation = ref<Attestation | null>(null)
const activeProvider    = ref<AttestationProvider | null>(null)

function openAttestation(att: Attestation) {
  activeAttestation.value = att
  activeProvider.value    = providers.value.find(p => p.id === att.providerId) ?? null
}

// ── Contract modal ─────────────────────────────────────────────────────────
const activeContract = ref<ContractView | null>(null)

function openContract(loan: ProfileLoan) {
  if (!profile.value) return
  const p = profile.value
  const closedLoans = p.loans.filter(l => l.status === 'closed')
  const borrowed    = closedLoans.reduce((s, l) => s + l.amount, 0)
  const repaid      = closedLoans.reduce((s, l) => s + l.repaid, 0)
  const repaymentRate = borrowed > 0 ? Math.round(repaid / borrowed * 100) : 100

  let status: ContractView['status']
  if (loan.status === 'open')                status = 'open'
  else if (loan.status === 'active')         status = 'active'
  else if (loan.repaid >= loan.amount)       status = 'repaid'
  else                                       status = 'defaulted'

  activeContract.value = {
    id:                      loan.id,
    borrower:                p.address,
    borrowerNickname:        p.nickname,
    borrowerTrustScore:      p.trustScore,
    borrowerAttestationCount: p.attestations.filter(a => a.verified !== false).length,
    borrowerRepaymentRate:   repaymentRate,
    lender:   loan.counterparty,
    amount:   loan.amount,
    currency: loan.currency,
    apy:      loan.apy,
    duration: loan.duration,
    status,
    dueDate:  loan.dueDate,
  }
}

// ── Attestation recap ──────────────────────────────────────────────────────
const verifiedCount = computed(() =>
  profile.value?.attestations.filter(a => a.verified !== false).length ?? 0
)
const pendingCount = computed(() =>
  profile.value?.attestations.filter(a => a.verified === false).length ?? 0
)

function fmt(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`
  return `$${n}`
}
</script>

<template>
  <div class="max-w-[860px] mx-auto px-4 py-12 flex flex-col gap-8 pb-20">

    <!-- ── Error state ───────────────────────────────────────────────── -->
    <div v-if="loadError" class="glass-panel rounded p-6 flex items-center gap-4 text-danger">
      <span class="material-symbols-outlined text-2xl">error_outline</span>
      <p class="text-sm">{{ loadError }}</p>
    </div>

    <template v-else-if="profile">

      <!-- ── Profile header ──────────────────────────────────────────── -->
      <section class="flex flex-col items-center gap-3 text-center">

        <!-- 96px avatar with glow -->
        <div class="relative">
          <div class="w-24 h-24 rounded-full bg-surface border border-white/10 flex items-center justify-center relative z-10 backdrop-blur-2xl">
            <span class="font-mono text-xl text-primary">0x</span>
          </div>
          <div class="absolute inset-0 bg-primary/30 rounded-full blur-2xl -z-10 scale-150" />
        </div>

        <!-- Nickname -->
        <h1 class="font-display text-2xl font-bold text-white">{{ profile.nickname }}</h1>

        <!-- Full address -->
        <p class="font-mono text-xs text-muted">{{ profile.address }}</p>

        <!-- Trust score -->
        <div class="flex flex-col items-center gap-0.5 mt-1" :class="trustColor">
          <div class="flex items-baseline gap-1">
            <span class="font-mono font-bold text-3xl leading-none">{{ profile.trustScore }}</span>
            <span class="material-symbols-outlined text-sm leading-none" style="font-variation-settings: 'FILL' 1">auto_awesome</span>
          </div>
          <span class="text-[10px] text-muted uppercase tracking-widest">Trust Score</span>
        </div>

        <!-- Verified attestations badge -->
        <div class="flex items-center gap-2 mt-1">
          <span class="material-symbols-outlined text-emerald text-base">verified_user</span>
          <span class="text-emerald text-sm font-medium">{{ verifiedCount }} Verified Attestations</span>
        </div>

      </section>

      <!-- ── Tab bar ─────────────────────────────────────────────────── -->
      <div class="flex items-center gap-6 border-b border-border">
        <button
          class="pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
          :class="activeTab === 'attestations'
            ? 'border-primary text-white'
            : 'border-transparent text-muted hover:text-white'"
          @click="activeTab = 'attestations'"
        >
          Attestations
        </button>
        <button
          class="pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
          :class="activeTab === 'loans'
            ? 'border-primary text-white'
            : 'border-transparent text-muted hover:text-white'"
          @click="activeTab = 'loans'"
        >
          Loans
        </button>
      </div>

      <!-- ── Attestations tab ────────────────────────────────────────── -->
      <div v-if="activeTab === 'attestations'" class="flex flex-col gap-6">

        <!-- Recap bar -->
        <div class="flex items-center gap-4 flex-wrap font-mono text-sm">
          <span class="text-emerald font-bold">{{ verifiedCount }} verified</span>
          <span class="text-muted">·</span>
          <span class="text-muted">{{ pendingCount }} pending</span>
        </div>

        <!-- Attestation cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <AttestationCard
            v-for="att in profile.attestations"
            :key="att.title"
            v-bind="att"
            @view="openAttestation(att)"
          />
        </div>

      </div>

      <!-- ── Loans tab ───────────────────────────────────────────────── -->
      <div v-else class="flex flex-col gap-6">

        <!-- Recap bar -->
        <div class="flex items-center gap-4 flex-wrap font-mono text-sm">
          <span class="text-white font-bold">{{ profile.loans.length }} loans</span>
          <span class="text-muted">·</span>
          <span>
            <span class="text-white font-bold">{{ repaymentRate }}%</span>
            <span class="text-muted"> repaid</span>
          </span>
          <span class="text-muted">·</span>
          <span class="text-muted">{{ fmt(totalRequested) }} requested</span>
          <span class="text-muted">·</span>
          <span class="text-muted">{{ fmt(totalOutstanding) }} outstanding</span>
          <span class="text-muted">·</span>
          <span class="text-muted">{{ fmt(totalRepaid) }} repaid total</span>
        </div>

        <!-- Open offers -->
        <template v-if="openLoans.length">
          <p class="text-xs uppercase tracking-widest text-muted">Open offers</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileLoanCard v-for="loan in openLoans" :key="loan.id" v-bind="loan" @view="openContract(loan)" />
          </div>
        </template>

        <!-- Active loans -->
        <template v-if="activeLoans.length">
          <p class="text-xs uppercase tracking-widest text-muted">Active loans</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileLoanCard v-for="loan in activeLoans" :key="loan.id" v-bind="loan" @view="openContract(loan)" />
          </div>
        </template>

        <!-- Closed loans -->
        <template v-if="closedLoans.length">
          <p class="text-xs uppercase tracking-widest text-muted">Closed loans</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileLoanCard v-for="loan in closedLoans" :key="loan.id" v-bind="loan" @view="openContract(loan)" />
          </div>
        </template>

        <!-- Empty state -->
        <p v-if="!profile.loans.length" class="text-muted text-sm">No loan history.</p>

      </div>

    </template>

    <!-- ── Loading skeleton ──────────────────────────────────────────── -->
    <template v-else>
      <div class="flex flex-col items-center gap-4">
        <div class="w-24 h-24 rounded-full bg-white/5 animate-pulse" />
        <div class="h-5 w-32 bg-white/5 rounded animate-pulse" />
        <div class="h-3 w-64 bg-white/5 rounded animate-pulse" />
      </div>
    </template>

  </div>

  <!-- Attestation modal -->
  <AttestationModal
    v-if="activeAttestation"
    :attestation="activeAttestation"
    :provider="activeProvider ?? undefined"
    :address="address"
    @close="activeAttestation = null; activeProvider = null"
  />

  <!-- Contract modal -->
  <ContractModal
    v-if="activeContract"
    :contract="activeContract"
    @close="activeContract = null"
    @fund="activeContract = null"
  />
</template>
