<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { truncate } from '../utils/format'
import WalletConnectModal from './WalletConnectModal.vue'

const route  = useRoute()
const router = useRouter()
const auth   = useAuth()

const showConnectModal = ref(false)

function isActive(prefix: string) {
  return route.path.startsWith(prefix)
}

async function disconnect() {
  await auth.disconnect()
  router.push('/')
}
</script>

<template>
  <nav class="sticky top-0 z-50 bg-black/40 backdrop-blur-[24px] border-b border-border">
    <div class="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">

      <!-- Logo -->
      <RouterLink to="/" class="flex items-center gap-2 text-white">
        <div class="size-5 text-primary">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor" />
          </svg>
        </div>
        <span class="font-display font-bold text-sm tracking-tight">OpenVouch Originate</span>
      </RouterLink>

      <!-- Nav links -->
      <div class="flex items-center gap-6">
        <RouterLink
          to="/marketplace"
          class="text-sm transition-colors"
          :class="isActive('/marketplace') ? 'text-white' : 'text-muted hover:text-white'"
        >
          Marketplace
        </RouterLink>
        <RouterLink
          v-if="auth.isAuthenticated"
          to="/my-loans"
          class="text-sm transition-colors"
          :class="isActive('/my-loans') ? 'text-white' : 'text-muted hover:text-white'"
        >
          My Loans
        </RouterLink>
      </div>

      <!-- Wallet area -->
      <div class="flex items-center gap-2">
        <!-- Connected: address + disconnect -->
        <template v-if="auth.isAuthenticated && auth.address">
          <RouterLink
            to="/my-profile"
            class="h-8 px-4 rounded-full border border-primary/50 bg-primary/10 text-primary font-mono text-xs font-bold hover:bg-primary/20 transition-colors inline-flex items-center"
          >
            {{ truncate(auth.address) }}
          </RouterLink>
          <button
            class="h-8 w-8 rounded-full border border-border text-muted hover:text-white hover:border-border-hover transition-colors inline-flex items-center justify-center"
            title="Disconnect wallet"
            @click="disconnect"
          >
            <span class="material-symbols-outlined text-base leading-none">logout</span>
          </button>
        </template>

        <!-- Disconnected: connect button -->
        <button
          v-else
          class="h-8 px-4 rounded-full border border-primary/50 bg-primary/10 text-primary font-mono text-xs font-bold hover:bg-primary/20 transition-colors inline-flex items-center"
          @click="showConnectModal = true"
        >
          Connect Wallet
        </button>
      </div>

    </div>
  </nav>

  <WalletConnectModal v-model="showConnectModal" />
</template>
