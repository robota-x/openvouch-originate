<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import type { Attestation, AttestationProvider } from '../types'

const props = defineProps<{
  attestation: Attestation
  provider?: AttestationProvider
  address: string          // profile address — used to resolve claimUrl
}>()
const emit = defineEmits<{ close: [] }>()

// ── Status badge ───────────────────────────────────────────────────────────
const isVerified = computed(() => props.attestation.verified !== false)
const isPending  = computed(() =>
  !isVerified.value && props.attestation.status.toLowerCase() === 'pending'
)
const statusStyle = computed(() => {
  if (isVerified.value) return 'border-emerald/40 bg-emerald/10 text-emerald'
  if (isPending.value)  return 'border-orange/40  bg-orange/10  text-orange'
  return                       'border-danger/40  bg-danger/10  text-danger'
})

// ── Links ──────────────────────────────────────────────────────────────────
// Resolved claim URL with the subject's address substituted in
const resolvedClaimUrl = computed(() =>
  props.provider?.claimUrl.replace('{address}', props.address) ?? null
)

// Solscan is the Solana equivalent of Etherscan
const solscanUrl = computed(() =>
  props.attestation.onChainRef
    ? `https://solscan.io/tx/${props.attestation.onChainRef}`
    : null
)

// ── Date formatting ────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}
function truncate(s: string, chars = 8) {
  return s.length > chars * 2 + 1 ? `${s.slice(0, chars)}…${s.slice(-4)}` : s
}

// ── ESC to close ───────────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') emit('close') }
onMounted(()   => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <div class="glass-panel rounded-xl max-w-lg w-full flex flex-col gap-0 overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-white text-base">{{ attestation.icon }}</span>
            </div>
            <h2 class="text-white font-display font-bold text-base">{{ attestation.title }}</h2>
            <span
              class="px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wide"
              :class="statusStyle"
            >{{ attestation.status }}</span>
          </div>
          <button
            class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
            @click="emit('close')"
          >
            <span class="material-symbols-outlined text-base leading-none">close</span>
          </button>
        </div>

        <div class="px-6 py-5 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-8rem)]">

          <!-- ── Attestor ─────────────────────────────────────────────── -->
          <div v-if="provider" class="flex flex-col gap-2">
            <p class="text-[10px] text-muted uppercase tracking-widest">Attested by</p>
            <div class="bg-black/20 rounded-lg px-4 py-3 flex flex-col gap-2">
              <!-- Name + on-chain signer badge -->
              <div class="flex items-center justify-between">
                <span class="text-white font-bold text-sm">{{ provider.name }}</span>
                <span
                  v-if="isVerified"
                  class="flex items-center gap-1 text-[10px] text-emerald font-mono"
                >
                  <span class="material-symbols-outlined text-[11px]" style="font-variation-settings: 'FILL' 1">verified</span>
                  On-chain signer
                </span>
              </div>

              <!-- Wallet + links row -->
              <div class="flex items-center gap-3 flex-wrap text-[11px]">
                <!-- Signing wallet -->
                <span class="font-mono text-muted">{{ truncate(provider.wallet) }}</span>

                <span class="text-white/20">·</span>

                <!-- Provider website -->
                <a
                  :href="provider.website"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex items-center gap-0.5 text-primary hover:underline"
                >
                  {{ provider.website.replace('https://', '') }}
                  <span class="material-symbols-outlined text-[10px] leading-none">open_in_new</span>
                </a>

                <template v-if="resolvedClaimUrl">
                  <span class="text-white/20">·</span>
                  <!-- Claim page for this specific address -->
                  <a
                    :href="resolvedClaimUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-0.5 text-primary hover:underline"
                  >
                    View claim
                    <span class="material-symbols-outlined text-[10px] leading-none">open_in_new</span>
                  </a>
                </template>
              </div>

              <!-- Provider description -->
              <p class="text-xs text-muted leading-relaxed mt-0.5">{{ provider.description }}</p>
            </div>
          </div>

          <!-- ── Issued date ──────────────────────────────────────────── -->
          <div v-if="attestation.issuedAt" class="flex flex-col gap-0.5">
            <span class="text-[10px] text-muted uppercase tracking-widest">Issued</span>
            <span class="font-mono text-sm text-white">{{ fmtDate(attestation.issuedAt) }}</span>
          </div>

          <!-- ── Metadata / details ──────────────────────────────────── -->
          <div v-if="attestation.metadata && Object.keys(attestation.metadata).length" class="flex flex-col gap-2">
            <p class="text-[10px] text-muted uppercase tracking-widest">Details</p>
            <div class="flex flex-col gap-1.5">
              <div
                v-for="(val, key) in attestation.metadata"
                :key="key"
                class="flex items-baseline justify-between gap-4 text-sm"
              >
                <span class="text-muted flex-shrink-0">{{ key }}</span>
                <span class="font-mono text-white text-right">{{ val }}</span>
              </div>
            </div>
          </div>

          <!-- ── On-chain reference ──────────────────────────────────── -->
          <div v-if="solscanUrl" class="flex flex-col gap-2 pt-1 border-t border-border">
            <p class="text-[10px] text-muted uppercase tracking-widest">On-chain reference</p>
            <div class="flex items-center gap-3 flex-wrap">
              <span class="font-mono text-[11px] text-muted bg-white/5 px-2 py-1 rounded">
                {{ truncate(attestation.onChainRef!, 10) }}
              </span>
              <a
                :href="solscanUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                View on Solscan
                <span class="material-symbols-outlined text-[11px] leading-none">open_in_new</span>
              </a>
            </div>
          </div>

          <!-- ── Unverified notice ───────────────────────────────────── -->
          <div
            v-if="!isVerified"
            class="flex items-start gap-3 bg-orange/5 border border-orange/20 rounded-lg px-4 py-3"
          >
            <span class="material-symbols-outlined text-orange text-base flex-shrink-0 mt-0.5">warning</span>
            <p class="text-orange text-xs leading-relaxed">
              <template v-if="isPending">
                This attestation is pending review and has not yet been confirmed by the attestor.
              </template>
              <template v-else>
                This attestation could not be verified. Treat with caution when evaluating creditworthiness.
              </template>
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-border flex items-center justify-end">
          <button
            class="px-4 py-2 rounded text-sm text-muted hover:text-white transition-colors"
            @click="emit('close')"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
