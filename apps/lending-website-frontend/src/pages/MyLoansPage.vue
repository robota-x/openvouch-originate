<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import type { Profile, LentLoan, ProfileLoan, ContractView } from '../types'
import { ApiError } from '../types'
import { backendClient } from '../api/client'
import { fmt } from '../utils/format'
import { profileLoanToContractView } from '../utils/loans'
import { useSolana } from '../composables/useSolana'
import { solanaBridge } from '../utils/solana-bridge'
import BorrowedLoanCard from '../components/BorrowedLoanCard.vue'
import LentLoanCard from '../components/LentLoanCard.vue'
import ContractModal from '../components/ContractModal.vue'

// Route is auth-guarded — auth.address is always set when this component mounts.
const auth       = useAuth()
const solana     = useSolana()
const MY_ADDRESS = auth.address!

const profile   = ref<Profile | null>(null)
const loadError = ref<string | null>(null)
const isProcessing = ref(false)

async function refreshProfile() {
  try {
    profile.value = await backendClient.getProfile(MY_ADDRESS)
  } catch (e) {
    console.error('[MyLoansPage] Failed to load loans:', e)
    loadError.value = e instanceof ApiError ? e.message : 'Failed to load loans'
  }
}

onMounted(refreshProfile)

async function handleDisburse(loanId: string) {
  if (!auth.isAuthenticated) return
  
  isProcessing.value = true
  try {
    const { transaction: txBase64 } = await backendClient.initiateDisbursement(auth.token!, loanId)
    const tx = solanaBridge.deserializeTx(txBase64)
    const signature = await solanaBridge.signAndBroadcast(solana.connection, tx, auth.connectedWallet)
    await backendClient.finalizeDisbursement(auth.token!, loanId, { signature })
    await refreshProfile()
    alert('Loan funds disbursed to your wallet!')
  } catch (e: any) {
    console.error('[MyLoansPage] Disbursement failed:', e)
    alert(`Disbursement failed: ${e.message}`)
  } finally {
    isProcessing.value = false
  }
}

async function handleRepay(loanId: string, amount: number) {
  if (!auth.isAuthenticated) return
  
  isProcessing.value = true
  try {
    // Note: We use installment 1 as a placeholder/prototype value
    const { transaction: txBase64 } = await backendClient.initiateRepayment(auth.token!, loanId, 1, amount)
    const tx = solanaBridge.deserializeTx(txBase64)
    const signature = await solanaBridge.signAndBroadcast(solana.connection, tx, auth.connectedWallet)
    await backendClient.finalizeRepayment(auth.token!, loanId, { signature, amount })
    await refreshProfile()
    alert('Repayment successful!')
  } catch (e: any) {
    console.error('[MyLoansPage] Repayment failed:', e)
    alert(`Repayment failed: ${e.message}`)
  } finally {
    isProcessing.value = false
  }
}

// ── Borrowed loans ─────────────────────────────────────────────────────────
const borrowedLoans = computed(() =>
  profile.value?.loans.filter(l => l.status !== 'open') ?? []
)
const openOffers = computed(() =>
  profile.value?.loans.filter(l => l.status === 'open') ?? []
)

// ── Lent loans ─────────────────────────────────────────────────────────────
const lentLoans = computed(() => profile.value?.lentLoans ?? [])

// ── Recap stats ────────────────────────────────────────────────────────────
const borrowRepaymentRate = computed(() => {
  const settled = borrowedLoans.value.filter(l => l.status === 'repaid' || l.status === 'defaulted')
  const borrowed = settled.reduce((s, l) => s + l.amount, 0)
  const repaid   = settled.reduce((s, l) => s + l.repaid, 0)
  return borrowed > 0 ? Math.round(repaid / borrowed * 100) : 100
})

const lendInterest = computed(() =>
  lentLoans.value
    .filter(l => l.status === 'repaid')
    .reduce((s, l) => s + l.amount * (l.apy / 100) * (l.duration / 365), 0)
)
const lendLost = computed(() =>
  lentLoans.value
    .filter(l => l.status === 'defaulted')
    .reduce((s, l) => s + l.amount, 0)
)
const lendOutstanding = computed(() =>
  lentLoans.value
    .filter(l => l.status === 'active')
    .reduce((s, l) => s + l.amount, 0)
)

// ── Contract modal ─────────────────────────────────────────────────────────
const activeContract = ref<ContractView | null>(null)

function openBorrowedContract(loan: ProfileLoan) {
  if (!profile.value) return
  activeContract.value = profileLoanToContractView(loan, profile.value)
}

function openLentContract(loan: LentLoan) {
  activeContract.value = {
    id: loan.id,
    borrower: loan.borrower, borrowerNickname: loan.borrowerNickname,
    borrowerTrustScore:      loan.borrowerTrustScore,
    borrowerAttestationCount: loan.borrowerAttestationCount,
    borrowerRepaymentRate:   loan.borrowerRepaymentRate,
    lender:   MY_ADDRESS,
    amount:   loan.amount, currency: loan.currency,
    apy:      loan.apy,    duration: loan.duration,
    status:   loan.status, dueDate:  loan.dueDate,
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-10 pb-20">

    <h1 class="font-display text-2xl font-bold text-white">My Loans</h1>

    <!-- ── Error state ──────────────────────────────────────────────── -->
    <div v-if="loadError" class="glass-panel rounded p-6 flex items-center gap-4 text-danger">
      <span class="material-symbols-outlined text-2xl">error_outline</span>
      <p class="text-sm">{{ loadError }}</p>
    </div>

    <!-- ── Loading skeleton ──────────────────────────────────────────── -->
    <template v-if="!profile && !loadError">
      <div class="flex flex-col gap-2">
        <div v-for="i in 4" :key="i" class="h-16 glass-panel rounded animate-pulse" />
      </div>
    </template>

    <template v-else-if="profile">

      <!-- ── Both empty — full page CTA ──────────────────────────────── -->
      <div
        v-if="borrowedLoans.length === 0 && openOffers.length === 0 && lentLoans.length === 0"
        class="glass-panel rounded p-12 flex flex-col items-center gap-4 text-center"
      >
        <span class="material-symbols-outlined text-4xl text-muted">account_balance_wallet</span>
        <p class="text-white font-bold text-lg">No loan activity yet</p>
        <p class="text-muted text-sm max-w-sm">Browse the marketplace to fund an open request or submit your own borrowing proposal.</p>
        <RouterLink
          to="/marketplace"
          class="mt-2 px-6 py-2.5 rounded bg-primary text-white text-sm font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow"
        >
          Go to Marketplace
        </RouterLink>
      </div>

      <template v-else>

        <!-- ── Borrowing ────────────────────────────────────────────── -->
        <section class="flex flex-col gap-4">
          <div class="flex items-baseline justify-between">
            <h2 class="text-white font-display font-bold text-base">
              Borrowing
              <span class="text-muted font-normal text-sm ml-1.5">{{ borrowedLoans.length + openOffers.length }}</span>
            </h2>
            <div v-if="borrowedLoans.length" class="flex items-center gap-3 font-mono text-sm text-muted">
              <span>{{ borrowRepaymentRate }}% repaid</span>
            </div>
          </div>

          <!-- Column headers -->
          <div v-if="borrowedLoans.length || openOffers.length" class="px-5 pb-1 flex items-center gap-5 text-xs text-muted uppercase tracking-widest">
            <div class="w-56 flex-shrink-0">Lender</div>
            <div class="flex-1 min-w-0">Amount</div>
            <div class="w-20 flex-shrink-0">APY</div>
            <div class="w-20 flex-shrink-0">Duration</div>
            <div class="w-32 flex-shrink-0">Status</div>
            <div class="w-28 flex-shrink-0 text-right">Total due</div>
          </div>

          <div v-if="borrowedLoans.length || openOffers.length" class="flex flex-col gap-2">
            <BorrowedLoanCard
              v-for="loan in openOffers"
              :key="loan.id"
              v-bind="loan"
              @view="openBorrowedContract(loan)"
              @disburse="handleDisburse(loan.id)"
            />
            <BorrowedLoanCard
              v-for="loan in borrowedLoans"
              :key="loan.id"
              v-bind="loan"
              @view="openBorrowedContract(loan)"
              @repay="handleRepay(loan.id, loan.amount / loan.duration)"
            />
          </div>

          <div v-else class="glass-panel rounded px-5 py-8 flex flex-col items-center gap-3 text-center">
            <p class="text-muted text-sm">You haven't borrowed anything yet.</p>
            <RouterLink to="/marketplace" class="text-primary text-sm hover:underline">
              Browse open requests
            </RouterLink>
          </div>
        </section>

        <!-- ── Lending ──────────────────────────────────────────────── -->
        <section class="flex flex-col gap-4">
          <div class="flex items-baseline justify-between">
            <h2 class="text-white font-display font-bold text-base">
              Lending
              <span class="text-muted font-normal text-sm ml-1.5">{{ lentLoans.length }}</span>
            </h2>
            <div v-if="lentLoans.length" class="flex items-center gap-4 font-mono text-sm text-muted flex-wrap justify-end">
              <span v-if="lendOutstanding > 0">{{ fmt(lendOutstanding) }} outstanding</span>
              <span v-if="lendInterest > 0" class="text-emerald">+{{ fmt(lendInterest) }} earned</span>
              <span v-if="lendLost > 0" class="text-danger">−{{ fmt(lendLost) }} lost</span>
            </div>
          </div>

          <!-- Column headers -->
          <div v-if="lentLoans.length" class="px-5 pb-1 flex items-center gap-5 text-xs text-muted uppercase tracking-widest">
            <div class="w-56 flex-shrink-0">Borrower</div>
            <div class="w-20 flex-shrink-0">Trust</div>
            <div class="flex-1 min-w-0">Amount</div>
            <div class="w-20 flex-shrink-0">APY</div>
            <div class="w-20 flex-shrink-0">Duration</div>
            <div class="w-32 flex-shrink-0">Status</div>
            <div class="w-28 flex-shrink-0 text-right">Net</div>
          </div>

          <div v-if="lentLoans.length" class="flex flex-col gap-2">
            <LentLoanCard
              v-for="loan in lentLoans"
              :key="loan.id"
              v-bind="loan"
              @view="openLentContract(loan)"
            />
          </div>

          <div v-else class="glass-panel rounded px-5 py-8 flex flex-col items-center gap-3 text-center">
            <p class="text-muted text-sm">You haven't lent to anyone yet.</p>
            <RouterLink to="/marketplace" class="text-primary text-sm hover:underline">
              Fund a loan request
            </RouterLink>
          </div>
        </section>

      </template>
    </template>

  </div>

  <!-- Contract modal -->
  <ContractModal
    v-if="activeContract"
    :contract="activeContract"
    @close="activeContract = null"
    @fund="activeContract = null"
  />
</template>
