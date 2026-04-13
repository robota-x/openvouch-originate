<script setup lang="ts">
defineProps<{ score: number }>()
</script>

<template>
  <span
    class="px-3 py-1 rounded-full border border-emerald/50 bg-emerald/10
           text-xs font-bold text-emerald font-mono shadow-glow-emerald"
  >
    {{ score }}
  </span>
</template>
