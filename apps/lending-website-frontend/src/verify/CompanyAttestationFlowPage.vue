<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { attestationClient, identityClient } from '../api/client'
import IdentityStepCard from './components/IdentityStepCard.vue'
import { ApiError } from '../types'

type FlowStep = 'details' | 'identity' | 'processing' | 'completed'

type Director = {
  name: string
  role: string
  appointedOn: string
  dob?: string
  country?: string
}

const auth = useAuth()
const router = useRouter()
const route = useRoute()

const step = ref<FlowStep>('details')
const busy = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const walletAddress = ref('')
const companyNumber = ref('')
const directors = ref<Director[]>([])
const selectedDirector = ref('')
const companyName = ref('')
const statusText = ref('')
const selectedDirectorDetails = computed(() =>
  directors.value.find((director) => director.name === selectedDirector.value),
)

const stepIndex = computed(() => {
  if (step.value === 'details') return 1
  if (step.value === 'identity') return 2
  if (step.value === 'processing') return 3
  return 4
})

function normaliseName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function identityMatchesDirector(identityName: string, directorName: string): boolean {
  const identity = normaliseName(identityName)
  const director = normaliseName(directorName)
  return identity.includes(director) || director.includes(identity)
}

async function lookupCompany() {
  error.value = null
  success.value = null
  if (!companyNumber.value) {
    error.value = 'Company number is required'
    return
  }
  busy.value = true
  try {
    const company = await attestationClient.getCompany(companyNumber.value)
    companyName.value = company.name
    directors.value = company.directors
    selectedDirector.value = company.directors[0]?.name ?? ''
    if (!company.directors.length) {
      error.value = 'No active directors found for this company'
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 400) {
        error.value = 'Invalid company number format. Use 8 digits (for example 06770815) or 2 letters + 6 digits.'
      } else if (err.message === 'company_not_found') {
        error.value = 'Company not found. Check the company number and try again.'
      } else if (err.message === 'ch_api_auth_failed') {
        error.value = 'Companies House API key is missing or invalid in attestation service configuration.'
      } else if (err.message === 'ch_api_rate_limited') {
        error.value = 'Companies House API rate limit reached. Please retry shortly.'
      } else {
        error.value = 'Companies House lookup is currently unavailable. Please retry.'
      }
    } else {
      error.value = err instanceof Error ? err.message : 'Failed to load company details'
    }
  } finally {
    busy.value = false
  }
}

async function completeAttestationFlow() {
  step.value = 'processing'
  const start = await attestationClient.startVerificationSession({
    walletAddress: walletAddress.value,
    companyNumber: companyNumber.value,
    directorName: selectedDirector.value,
  })
  const completion = await attestationClient.completeVerificationSession(start.sessionId)
  const status = await attestationClient.getStatus(walletAddress.value)
  if (!status.verified) {
    throw new Error('Attestation status is not verified after completion')
  }
  statusText.value = status.attestationAddress ?? ''
  success.value = `Attestation issued for ${completion.companyName}`
  step.value = 'completed'
}

async function startAttestation() {
  error.value = null
  success.value = null

  if (!walletAddress.value || !companyNumber.value || !selectedDirector.value) {
    error.value = 'Wallet, company and director are required'
    return
  }

  busy.value = true
  try {
    const identity = await identityClient.getIdentity(walletAddress.value)
    if (identity.verified && identity.identity && identityMatchesDirector(identity.identity.fullName, selectedDirector.value)) {
      await completeAttestationFlow()
      return
    }

    step.value = 'identity'
    const redirectUrl = new URL('/verify/company', window.location.origin)
    redirectUrl.searchParams.set('resume', '1')
    redirectUrl.searchParams.set('walletAddress', walletAddress.value)
    redirectUrl.searchParams.set('companyNumber', companyNumber.value)
    redirectUrl.searchParams.set('directorName', selectedDirector.value)
    if (selectedDirectorDetails.value?.dob) redirectUrl.searchParams.set('directorDob', selectedDirectorDetails.value.dob)
    if (selectedDirectorDetails.value?.country) redirectUrl.searchParams.set('directorCountry', selectedDirectorDetails.value.country)

    const verification = await identityClient.startVerification(
      walletAddress.value,
      redirectUrl.toString(),
      {
        fullName: selectedDirector.value,
        dob: selectedDirectorDetails.value?.dob,
        country: selectedDirectorDetails.value?.country,
      },
    )
    window.location.assign(verification.verificationUrl)
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      if (err.message === 'wallet_already_attested') {
        error.value = 'This wallet already has an attestation for a company.'
      } else if (err.message === 'already_verified') {
        // This shouldn't normally be reachable if identityMatchesDirector worked, 
        // but identity-service might still return it if session logic changes.
        error.value = 'Identity is already verified, but does not match the selected director.'
      } else {
        error.value = 'A conflict occurred. You might already have an active session or record.'
      }
    } else {
      error.value = err instanceof Error ? err.message : 'Failed to progress attestation flow'
    }
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  walletAddress.value = auth.address ?? ''
  if (typeof route.query.walletAddress === 'string') walletAddress.value = route.query.walletAddress
  if (typeof route.query.companyNumber === 'string') companyNumber.value = route.query.companyNumber
  if (typeof route.query.directorName === 'string') selectedDirector.value = route.query.directorName

  if (typeof route.query.companyNumber === 'string') {
    await lookupCompany()
  }

  if (route.query.resume === '1' && route.query.identityVerified === '1') {
    await completeAttestationFlow()
    await router.replace('/verify/company')
  }
})
</script>

<template>
  <div class="min-h-screen px-6 py-10 font-body text-fg">
    <div class="mx-auto w-full max-w-4xl space-y-6">
      <header class="glass-panel rounded-xl p-6">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Company Attestation</p>
        <h1 class="mt-2 font-display text-3xl">Company Verification Flow</h1>
        <p class="mt-2 text-sm text-muted">
          Verify company-director ownership and complete an attestation in one guided flow.
        </p>
      </header>

      <section class="grid gap-3 sm:grid-cols-4">
        <IdentityStepCard :step="1" title="Company" description="Select target company." :state="stepIndex > 1 ? 'done' : 'active'" />
        <IdentityStepCard :step="2" title="Identity" description="Secure identity verification." :state="stepIndex === 2 ? 'active' : stepIndex > 2 ? 'done' : 'pending'" />
        <IdentityStepCard :step="3" title="Attestation" description="Issue secure attestation." :state="stepIndex === 3 ? 'active' : stepIndex > 3 ? 'done' : 'pending'" />
        <IdentityStepCard :step="4" title="Completed" description="Verification confirmed." :state="stepIndex === 4 ? 'done' : 'pending'" />
      </section>

      <section class="glass-panel rounded-xl p-6 space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block text-sm">
            <span class="mb-1 block text-muted">Wallet address</span>
            <input v-model.trim="walletAddress" data-testid="company-wallet-input" type="text" class="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm outline-none focus:border-primary" />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block text-muted">Company number</span>
            <div class="flex gap-2">
              <input v-model.trim="companyNumber" data-testid="company-number-input" type="text" class="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm outline-none focus:border-primary" />
              <button type="button" data-testid="lookup-company-button" class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="busy" @click="lookupCompany">
                Lookup
              </button>
            </div>
          </label>
        </div>

        <div v-if="directors.length" class="space-y-2">
          <p class="text-sm text-muted">Directors for {{ companyName || companyNumber }}:</p>
          <label
            v-for="director in directors"
            :key="director.name"
            class="flex items-center gap-2 rounded-lg border border-border/60 bg-black/10 px-3 py-2 text-sm"
          >
            <input v-model="selectedDirector" :value="director.name" type="radio" name="director" />
            <span>{{ director.name }}</span>
          </label>
        </div>

        <button
          type="button"
          data-testid="start-company-flow-button"
          class="rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          :disabled="busy"
          @click="startAttestation"
        >
          {{ busy ? 'Processing...' : 'Verify Company Ownership' }}
        </button>

        <div v-if="step === 'completed'" class="rounded-lg border border-emerald/40 bg-emerald/10 px-4 py-3">
          <h2 class="font-display text-lg">Attestation completed</h2>
          <p class="text-sm text-muted">{{ success }}</p>
          <p v-if="statusText" class="mt-1 text-xs text-muted">
            Ref: <code>{{ statusText }}</code>
          </p>
        </div>

        <p v-if="error" data-testid="company-flow-error" class="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {{ error }}
        </p>
      </section>
    </div>
  </div>
</template>
