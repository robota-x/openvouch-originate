<script setup lang="ts">
import { computed } from 'vue'

// Using `full` instead of `truncated?: boolean` to avoid Vue's absent-boolean-prop
// casting (absent boolean prop → false), which would invert the default behaviour.
const props = defineProps<{ address: string; full?: boolean }>()

// Solana addresses are base58 (no 0x prefix). Show first 4 + last 4 chars.
const display = computed(() =>
  props.full
    ? props.address
    : `${props.address.slice(0, 4)}...${props.address.slice(-4)}`
)
</script>

<template>
  <span class="font-mono text-sm text-white truncate">{{ display }}</span>
</template>
