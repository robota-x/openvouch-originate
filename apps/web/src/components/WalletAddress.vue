<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ address: string; truncated?: boolean }>()

// Full 42-char addresses break layouts — truncate to 0xABC...DEF by default
const display = computed(() =>
  props.truncated === false
    ? props.address
    : `${props.address.slice(0, 6)}...${props.address.slice(-4)}`
)
</script>

<template>
  <span class="font-mono text-sm text-white">{{ display }}</span>
</template>
