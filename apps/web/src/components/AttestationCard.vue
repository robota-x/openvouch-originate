<script setup lang="ts">
import type { Attestation } from '../types'

defineProps<Attestation>()
const emit = defineEmits<{ view: [] }>()
</script>

<template>
  <div
    class="glass-panel tilt-card rounded aspect-square p-4 flex flex-col items-center justify-center text-center gap-3 relative cursor-pointer group"
    @click="emit('view')"
  >
    <!-- Verified checkmark -->
    <div v-if="verified !== false" class="absolute top-3 right-3 text-emerald animate-pulse">
      <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1">check_circle</span>
    </div>

    <!-- Icon circle -->
    <div
      class="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform duration-300"
    >
      <span class="material-symbols-outlined text-white text-2xl">{{ icon }}</span>
    </div>

    <!-- Title + status -->
    <div>
      <h3 class="text-white text-sm font-bold leading-tight">{{ title }}</h3>
      <p
        class="text-xs font-medium mt-1 font-mono"
        :class="verified !== false ? 'text-emerald' : 'text-muted'"
      >
        {{ status }}
      </p>
    </div>
  </div>
</template>
