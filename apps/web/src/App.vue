<script setup lang="ts">
const projectName = 'defi-hack'
const statusMessage = 'Lending platform — ready'
</script>

<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center">
    <div class="bg-gray-900 rounded-2xl shadow-xl p-10 max-w-sm w-full text-center">
      <h1 class="text-2xl font-bold text-white mb-2">{{ projectName }}</h1>
      <p class="text-gray-400 text-sm">{{ statusMessage }}</p>
    </div>
  </div>
</template>
