<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuth, type DetectedWallet } from '../composables/useAuth'
import WalletConnectModal from '../components/WalletConnectModal.vue'
import { ref, computed } from 'vue'

const router = useRouter()
const route  = useRoute()
const auth   = useAuth()

const loading = ref(false)
const error   = ref<string | null>(null)
const wallets = computed(() => auth.getSolanaWallets())

async function connect(wallet: DetectedWallet) {
  loading.value = true
  error.value   = null
  try {
    await auth.connect(wallet)
    
    // Support redirect back to the intended page if redirect query is present
    const redirectPath = route.query.redirect as string
    if (redirectPath && redirectPath.startsWith('/')) {
      router.push(redirectPath)
    } else {
      router.push('/my-profile')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Connection failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <!-- Localised card glow -->
    <div class="absolute bg-primary/20 blur-[120px] rounded-full w-96 h-96 -z-10 pointer-events-none" />

    <div class="glass-panel rounded w-[360px] p-8 flex flex-col gap-6">

      <!-- Logo + name -->
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="size-10 text-primary">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor" />
          </svg>
        </div>
        <h1 class="font-display font-bold text-white text-2xl tracking-tight">OpenVouch Originate</h1>
        <p class="text-muted text-sm leading-relaxed">
          Connect your Solana wallet to access the marketplace and manage your lending profile.
        </p>
      </div>

      <!-- Wallet list -->
      <div v-if="wallets.length > 0" class="flex flex-col gap-2">
        <button
          v-for="wallet in wallets"
          :key="wallet.name"
          :disabled="loading"
          class="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-white/5 hover:bg-white/10 hover:border-primary/40 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          @click="connect(wallet)"
        >
          <img
            v-if="wallet.icon"
            :src="wallet.icon"
            :alt="wallet.name"
            class="w-8 h-8 rounded-full flex-shrink-0"
          />
          <div
            v-else
            class="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0"
          >
            <span class="material-symbols-outlined text-primary text-base">account_balance_wallet</span>
          </div>
          <span class="text-white font-bold text-sm">{{ wallet.name }}</span>
          <span v-if="loading" class="ml-auto material-symbols-outlined text-muted text-base animate-spin">
            progress_activity
          </span>
        </button>
      </div>

      <!-- No wallet detected -->
      <div v-else class="flex flex-col items-center gap-3 py-2 text-center">
        <p class="text-muted text-sm">No Solana wallet detected in this browser.</p>
        <a
          href="https://phantom.app"
          target="_blank"
          rel="noopener noreferrer"
          class="w-full py-3 rounded bg-primary text-white font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow text-center"
        >
          Get Phantom
        </a>
      </div>

      <!-- Error -->
      <div v-if="error" class="flex items-center gap-2 px-3 py-2 rounded bg-danger/10 border border-danger/30">
        <span class="material-symbols-outlined text-danger text-base flex-shrink-0">error_outline</span>
        <p class="text-danger text-xs">{{ error }}</p>
      </div>

      <!-- No wallet link -->
      <p class="text-center text-xs text-muted">
        New to Solana?
        <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">
          Learn how to get started
        </a>
      </p>

    </div>
  </div>
</template>
