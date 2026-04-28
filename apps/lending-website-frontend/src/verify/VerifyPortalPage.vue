<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import IdentityStepCard from './components/IdentityStepCard.vue'
import { identityClient } from '../api/client'
import { fmtMonthYear } from '../utils/format'

type FlowStep = 'start' | 'document-check' | 'biometric' | 'processing' | 'completed'

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

// Biometric state
const videoRef = ref<HTMLVideoElement | null>(null)
const capturedPhoto = ref<string | null>(null)
const scanProgress = ref(0)
let stream: MediaStream | null = null

const isPartialDob = computed(() => {
  // Companies House format is YYYY-MM-01 or just YYYY-MM
  return dob.value && (dob.value.length === 7 || dob.value.endsWith('-01'))
})

const stepIndex = computed(() => {
  if (step.value === 'start') return 1
  if (step.value === 'document-check') return 2
  if (step.value === 'biometric') return 3
  if (step.value === 'processing') return 4
  return 5
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
    step.value = 'document-check'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to start verification'
  } finally {
    busy.value = false
  }
}

async function proceedToBiometric() {
  if (!fullName.value) {
    error.value = 'Full legal name is required'
    return
  }
  step.value = 'biometric'
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }
  } catch (err) {
    error.value = 'Camera access denied. Please enable camera to proceed with biometric verification.'
    step.value = 'document-check'
  }
}

async function captureAndProcess() {
  if (!videoRef.value) return

  // Capture frame
  const canvas = document.createElement('canvas')
  canvas.width = videoRef.value.videoWidth
  canvas.height = videoRef.value.videoHeight
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(videoRef.value, 0, 0)
    capturedPhoto.value = canvas.toDataURL('image/jpeg')
  }

  // Stop camera
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }

  step.value = 'processing'
  
  // Simulate AI scanning
  for (let i = 0; i <= 100; i += 5) {
    scanProgress.value = i
    await new Promise(r => setTimeout(r, 100))
  }

  await completeVerification()
}

async function completeVerification() {
  error.value = null
  success.value = null

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
    step.value = 'document-check'
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
  if (typeof prefillDob === 'string' && !dob.value) {
    // If we get YYYY-MM-DD but only want month/year for the UI
    dob.value = prefillDob
  }
  if (typeof prefillCountry === 'string' && !country.value) country.value = prefillCountry
  handoverPrefilled.value = (
    typeof prefillName === 'string'
    || typeof prefillDob === 'string'
    || typeof prefillCountry === 'string'
  )
  if (sessionId.value && walletAddress.value) {
    step.value = 'document-check'
  }
})
</script>

<template>
  <div class="min-h-screen px-6 py-10 font-body text-fg">
    <div class="mx-auto w-full max-w-3xl space-y-6">
      <header class="glass-panel rounded-xl p-6">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">Identity Verification</p>
        <h1 class="mt-2 font-display text-3xl">Secure Verification Portal</h1>
        <p class="mt-2 text-sm text-muted">
          Provide your legal identity details and complete a biometric scan to secure your on-chain attestation.
        </p>
      </header>

      <section class="grid gap-3 sm:grid-cols-4">
        <IdentityStepCard
          :step="1"
          title="Session"
          description="Initialize secure session."
          :state="stepIndex > 1 ? 'done' : 'active'"
        />
        <IdentityStepCard
          :step="2"
          title="Document"
          description="Verify identity details."
          :state="stepIndex === 2 ? 'active' : stepIndex > 2 ? 'done' : 'pending'"
        />
        <IdentityStepCard
          :step="3"
          title="Biometric"
          description="Liveness verification scan."
          :state="stepIndex === 3 ? 'active' : stepIndex > 3 ? 'done' : 'pending'"
        />
        <IdentityStepCard
          :step="4"
          title="Finalizing"
          description="Securing identity record."
          :state="stepIndex === 4 ? 'active' : stepIndex > 4 ? 'done' : 'pending'"
        />
      </section>

      <section class="glass-panel rounded-xl p-6">
        <!-- Step 1: Start -->
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
            {{ busy ? 'Initializing...' : 'Start Verification' }}
          </button>
        </div>

        <!-- Step 2: Document Check -->
        <div v-else-if="step === 'document-check'" class="space-y-4">
          <p class="text-sm text-muted">
            Secure Session <code class="rounded bg-black/30 px-1 py-0.5 text-xs">{{ sessionId }}</code>
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
              <template v-if="isPartialDob">
                <div class="flex h-[38px] items-center rounded-lg border border-border bg-black/10 px-3 py-2 text-sm text-muted italic">
                  {{ fmtMonthYear(dob) }}
                </div>
              </template>
              <input
                v-else
                v-model="dob"
                type="date"
                :readonly="handoverPrefilled"
                class="w-full rounded-lg border border-border bg-black/20 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <label class="block text-sm">
              <span class="mb-1 block text-muted">Nationality</span>
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
            Identity details are prefilled from the selected director record.
          </p>
          <button
            type="button"
            class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
            @click="proceedToBiometric"
          >
            Continue to Biometric Scan
          </button>
        </div>

        <!-- Step 3: Biometric -->
        <div v-else-if="step === 'biometric'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-display text-xl">Identity Verification Scan</h2>
            <div class="flex items-center gap-2 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald">
              <span class="relative flex h-2 w-2">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75"></span>
                <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald"></span>
              </span>
              Live Video Secure
            </div>
          </div>
          <p class="text-sm text-muted">Position your face within the frame and look directly at the camera. This ensures you are the authorized director of the company.</p>
          
          <div class="relative mx-auto aspect-square max-w-sm overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
            <video
              ref="videoRef"
              autoplay
              playsinline
              class="h-full w-full object-cover"
            ></video>
            
            <!-- Face Outline Overlay -->
            <div class="absolute inset-0 flex items-center justify-center">
              <div class="h-4/5 w-3/5 rounded-[50%] border-2 border-dashed border-primary/50 shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]">
                <!-- Scanning line animation -->
                <div class="absolute left-0 top-0 h-0.5 w-full animate-[scan_3s_ease-in-out_infinite] bg-primary/40 shadow-[0_0_15px_rgba(var(--color-primary),0.8)]"></div>
              </div>
            </div>
            
            <!-- Scan Indicators -->
            <div class="absolute bottom-6 left-0 right-0 text-center">
              <div class="inline-block rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                Alignment: <span class="text-emerald">Optimal</span>
              </div>
            </div>
          </div>

          <div class="flex justify-center pt-4">
            <button
              type="button"
              class="group relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-black shadow-xl transition-all hover:scale-105 active:scale-95"
              @click="captureAndProcess"
            >
              <div class="h-16 w-16 rounded-full border-2 border-black/10"></div>
              <div class="absolute inset-0 rounded-full border-4 border-primary/20 opacity-0 group-hover:animate-ping group-hover:opacity-100"></div>
            </button>
          </div>
        </div>

        <!-- Step 4: Processing -->
        <div v-else-if="step === 'processing'" class="space-y-6 py-8 text-center">
          <div class="mx-auto h-48 w-48 overflow-hidden rounded-xl bg-black/40 shadow-inner">
            <img v-if="capturedPhoto" :src="capturedPhoto" class="h-full w-full object-cover opacity-50 grayscale" />
          </div>
          <div class="space-y-2">
            <p class="font-display text-lg">Analyzing biometric data...</p>
            <div class="mx-auto h-1.5 max-w-xs overflow-hidden rounded-full bg-black/30">
              <div 
                class="h-full bg-emerald transition-all duration-100 ease-out" 
                :style="{ width: `${scanProgress}%` }"
              ></div>
            </div>
            <p class="text-xs text-muted">Liveness verification in progress</p>
          </div>
        </div>

        <!-- Step 5: Completed -->
        <div v-else class="space-y-6 py-6 text-center">
          <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald/20 text-emerald">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="space-y-1">
            <h2 class="font-display text-2xl text-fg">Identity Verified</h2>
            <p class="text-muted">{{ success }}</p>
          </div>
          <p class="text-xs text-muted italic">Redirecting back to attestation flow...</p>
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

<style scoped>
@keyframes scan {
  0%, 100% { top: 0%; }
  50% { top: 100%; }
}
</style>
