<script setup lang="ts">
// No-op — wallet connect will be wired later
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <!-- Localised card glow — different from the global ambient background -->
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
          Connect your wallet to access the marketplace and manage your lending profile.
        </p>
      </div>

      <!-- Connect button -->
      <button
        class="w-full py-3 rounded bg-primary text-white font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow"
      >
        Connect Wallet
      </button>

      <!-- No wallet link -->
      <p class="text-center text-xs text-muted">
        No wallet?
        <a href="#" class="text-primary hover:underline">Learn how to get started</a>
      </p>

    </div>
  </div>
</template>
