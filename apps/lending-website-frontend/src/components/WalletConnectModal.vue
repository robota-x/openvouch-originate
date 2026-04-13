<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuth, type DetectedWallet } from '../composables/useAuth'

defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
  connected: []
}>()

const auth    = useAuth()
const loading = ref(false)
const error   = ref<string | null>(null)
const wallets = computed(() => auth.getSolanaWallets())

async function connect(wallet: DetectedWallet) {
  loading.value = true
  error.value   = null
  try {
    await auth.connect(wallet)
    emit('connected')
    emit('update:modelValue', false)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Connection failed'
  } finally {
    loading.value = false
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('update:modelValue', false)
}
onMounted(()   => document.addEventListener('keydown', onKey))
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="emit('update:modelValue', false)"
    >
      <div class="glass-panel rounded-xl max-w-sm w-full flex flex-col gap-0 overflow-hidden">

        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <h2 class="text-white font-display font-bold text-base">Connect Wallet</h2>
          <button
            class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
            @click="emit('update:modelValue', false)"
          >
            <span class="material-symbols-outlined text-base leading-none">close</span>
          </button>
        </div>

        <div class="px-6 py-5 flex flex-col gap-4">

          <!-- Explanation -->
          <p class="text-muted text-sm leading-relaxed">
            Connect your Solana wallet to access your loans and fund open requests.
            You'll be asked to sign a message — no transaction fees involved.
          </p>

          <!-- Wallet list -->
          <div v-if="wallets.length > 0" class="flex flex-col gap-2">
            <button
              v-for="wallet in wallets"
              :key="wallet.name"
              :disabled="loading"
              class="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-white/5 hover:bg-white/10 hover:border-primary/40 transition-colors text-left disabled:opacity-50 disabled:pointer-events-none"
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
              <span class="text-white font-medium text-sm">{{ wallet.name }}</span>
              <span
                v-if="loading"
                class="ml-auto material-symbols-outlined text-muted text-base animate-spin"
              >progress_activity</span>
            </button>
          </div>

          <!-- No wallets detected -->
          <div v-else class="flex flex-col items-center gap-3 py-4 text-center">
            <span class="material-symbols-outlined text-3xl text-muted">account_balance_wallet</span>
            <p class="text-muted text-sm">No Solana wallet detected.</p>
            <a
              href="https://phantom.app"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary text-sm hover:underline"
            >
              Get Phantom →
            </a>
          </div>

          <!-- Error -->
          <div v-if="error" class="flex items-center gap-2 px-3 py-2 rounded bg-danger/10 border border-danger/30">
            <span class="material-symbols-outlined text-danger text-base flex-shrink-0">error_outline</span>
            <p class="text-danger text-xs">{{ error }}</p>
          </div>

        </div>
      </div>
    </div>
  </Teleport>
</template>
