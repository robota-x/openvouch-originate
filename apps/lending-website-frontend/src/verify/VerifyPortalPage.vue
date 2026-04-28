<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import IdentityStepCard from './components/IdentityStepCard.vue'
import { identityClient } from '../api/client'

type FlowStep = 'start' | 'face-check' | 'completed'

const route = useRoute()

const step = ref<FlowStep>('start')
const busy = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const sessionId = ref('')
const walletAddress = ref('')
const redirectUrl = ref('')
const fullName = ref('')
const dob = ref('')
const country = ref('GB')
const handoverPrefilled = ref(false)

const stepIndex = computed(() => {
  if (step.value === 'start') return 1
  if (step.value === 'face-check') return 2
  return 3
})

async function startFlow() {
  error.value = null
  success.value = null
  if (!walletAddress.value) {
    error.value = 'Wallet address is required'
    return
  }

  busy.value = true
  try {
    const result = await identityClient.startVerification(
      walletAddress.value,
      `${window.location.origin}/verify/portal`,
    )
    sessionId.value = result.sessionId
    step.value = 'face-check'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start verification'
  } finally {
    busy.value = false
  }
}

async function completeFaceCheck() {
  error.value = null
  success.value = null

  if (!sessionId.value || !walletAddress.value || !fullName.value) {
    error.value = 'Session, wallet and full name are required'
    return
  }

  busy.value = true
  try {
    await identityClient.completeVerification({
      sessionId: sessionId.value,
      walletAddress: walletAddress.value,
      fullName: fullName.value,
      dob: dob.value || undefined,
      country: country.value || undefined,
    })
    const identity = await identityClient.getIdentity(walletAddress.value)
    if (!identity.verified) {
      error.value = 'Identity record was not found after completion'
      return
    }
    step.value = 'completed'
    success.value = `Identity verified for ${identity.identity?.fullName ?? fullName.value}`
    if (redirectUrl.value) {
      const target = new URL(redirectUrl.value, window.location.origin)
      target.searchParams.set('identityVerified', '1')
      target.searchParams.set('walletAddress', walletAddress.value)
      window.location.assign(target.toString())
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to complete verification'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  const session = route.query.sessionId
  const wallet = route.query.walletAddress
  const redirect = route.query.redirectUrl
  const prefillName = route.query.fullName
  const prefillDob = route.query.dob
  const prefillCountry = route.query.country
  if (typeof session === 'string') sessionId.value = session
  if (typeof wallet === 'string') walletAddress.value = wallet
  if (typeof redirect === 'string') redirectUrl.value = redirect
  if (typeof prefillName === 'string' && !fullName.value) fullName.value = prefillName
  if (typeof prefillDob === 'string' && !dob.value) dob.value = prefillDob
  if (typeof prefillCountry === 'string' && !country.value) country.value = prefillCountry
  handoverPrefilled.value = (
    typeof prefillName === 'string'
    || typeof prefillDob === 'string'
    || typeof prefillCountry === 'string'
  )
  if (sessionId.value && walletAddress.value) {
    step.value = 'face-check'
  }
})
</script>

<template>
  <div class="min-h-screen px-6 py-10 font-body text-fg">
    <div class="mx-auto w-full max-w-3xl space-y-6">
      <header class="glass-panel rounded-xl p-6">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Identity Verification</p>
        <h1 class="mt-2 font-display text-3xl">Identity Verification Portal</h1>
        <p class="mt-2 text-sm text-muted">
          Complete identity verification before proceeding with company attestation.
        </p>
      </header>

      <section class="grid gap-3 sm:grid-cols-3">
        <IdentityStepCard
          :step="1"
          title="Start Session"
          description="Create a verification session for a wallet."
          :state="stepIndex > 1 ? 'done' : 'active'"
        />
        <IdentityStepCard
          :step="2"
          title="Face Check"
          description="Submit fake identity details as verified."
          :state="stepIndex === 2 ? 'active' : stepIndex > 2 ? 'done' : 'pending'"
        />
        <IdentityStepCard
          :step="3"
          title="Verification Complete"
          description="Identity service now returns verified=true."
          :state="stepIndex === 3 ? 'done' : 'pending'"
        />
      </section>

      <section class="glass-panel rounded-xl p-6">
        <div v-if="step === 'start'" class="space-y-4">
          <label class="block text-sm">
            <span class="mb-1 block text-muted">Wallet address</span>
            <input
              v-model.trim="walletAddress"
              type="text"
              data-testid="wallet-input"
              class="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Enter wallet address"
            />
          </label>

          <button
            type="button"
            data-testid="start-button"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            :disabled="busy"
            @click="startFlow"
          >
            {{ busy ? 'Starting...' : 'Start Verification' }}
          </button>
        </div>

        <div v-else-if="step === 'face-check'" class="space-y-4">
          <p class="text-sm text-muted">
            Session <code class="rounded bg-black/30 px-1 py-0.5 text-xs">{{ sessionId }}</code>
          </p>
          <label class="block text-sm">
            <span class="mb-1 block text-muted">Full legal name</span>
            <input
              v-model.trim="fullName"
              type="text"
              data-testid="full-name-input"
              :readonly="handoverPrefilled"
              class="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Jane Doe"
            />
          </label>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block text-sm">
              <span class="mb-1 block text-muted">Date of birth</span>
              <input
                v-model="dob"
                type="date"
                :readonly="handoverPrefilled"
                class="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label class="block text-sm">
              <span class="mb-1 block text-muted">Country</span>
              <input
                v-model.trim="country"
                type="text"
                maxlength="2"
                :readonly="handoverPrefilled"
                class="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm uppercase outline-none focus:border-primary"
                placeholder="GB"
              />
            </label>
          </div>
          <p v-if="handoverPrefilled" class="text-xs text-muted">
            Director details are prefilled from the selected company officer and cannot be edited in this step.
          </p>
          <button
            type="button"
            data-testid="complete-button"
            class="rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            :disabled="busy"
            @click="completeFaceCheck"
          >
            {{ busy ? 'Completing...' : 'Complete Verification' }}
          </button>
        </div>

        <div v-else class="space-y-2">
          <h2 class="font-display text-xl">Verification complete</h2>
          <p class="text-sm text-muted">{{ success }}</p>
        </div>

        <p
          v-if="error"
          data-testid="error-message"
          class="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {{ error }}
        </p>
      </section>
    </div>
  </div>
</template>
