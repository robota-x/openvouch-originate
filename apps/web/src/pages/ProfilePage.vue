<script setup lang="ts">
import { useRoute } from 'vue-router'
import AttestationCard from '../components/AttestationCard.vue'
import WalletAddress from '../components/WalletAddress.vue'

const route = useRoute()
const address = route.params.address as string

const attestations = [
  { icon: 'account_balance', title: 'Coinbase KYC',      status: 'Verified',    verified: true },
  { icon: 'monitoring',      title: 'Cred Protocol',     status: 'Score: 850',  verified: true },
  { icon: 'language',        title: 'ENS Domain',        status: 'Verified',    verified: true },
  { icon: 'history',         title: 'Repayment History', status: '100% Repaid', verified: true },
]
</script>

<template>
  <div class="max-w-[640px] mx-auto px-4 py-12 flex flex-col gap-8 pb-20">

    <!-- ── Profile header ────────────────────────────────────────── -->
    <section class="flex flex-col items-center gap-4 text-center">

      <!-- Avatar with glow -->
      <div class="relative">
        <div class="w-16 h-16 rounded-full bg-surface border border-white/10 flex items-center justify-center relative z-10 backdrop-blur-2xl overflow-hidden">
          <span class="font-mono text-lg text-primary">0x</span>
        </div>
        <div class="absolute inset-0 bg-primary/30 rounded-full blur-xl -z-10 scale-150" />
      </div>

      <!-- Address + attestation count -->
      <div class="flex flex-col items-center gap-2">
        <div class="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 backdrop-blur-md">
          <WalletAddress :address="address" :truncated="false" />
        </div>
        <div class="flex items-center gap-2 mt-1">
          <span class="material-symbols-outlined text-emerald text-lg">verified_user</span>
          <span class="text-emerald font-medium text-sm tracking-wide uppercase">
            {{ attestations.length }} Verified Attestations
          </span>
        </div>
        <p class="text-muted text-sm max-w-sm mt-2 leading-relaxed">
          This profile's trust score is calculated based on on-chain activity and 3rd-party identity verifications.
        </p>
      </div>

    </section>

    <!-- ── Attestation grid ───────────────────────────────────────── -->
    <section class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <AttestationCard
        v-for="att in attestations"
        :key="att.title"
        v-bind="att"
      />

      <!-- Add new — static, no-op -->
      <div
        class="glass-panel tilt-card rounded aspect-square p-4 flex flex-col items-center justify-center text-center gap-3 cursor-pointer group border-dashed border-white/20 hover:border-primary/50"
      >
        <div class="w-12 h-12 rounded-full bg-white/5 border border-dashed border-white/20 flex items-center justify-center mb-1 group-hover:bg-primary/20 transition-colors duration-300">
          <span class="material-symbols-outlined text-muted group-hover:text-white transition-colors">add</span>
        </div>
        <h3 class="text-muted group-hover:text-white transition-colors text-sm font-medium leading-tight">Link Provider</h3>
      </div>
    </section>

  </div>
</template>
