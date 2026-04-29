<script setup lang="ts">
defineProps<{
  step: number
  title: string
  description: string
  state: 'pending' | 'active' | 'done'
}>()
</script>

<template>
  <section class="glass-panel rounded-xl p-4">
    <div class="flex items-start gap-3">
      <div
        class="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
        :class="{
          'bg-emerald text-black': state === 'done',
          'bg-primary text-white': state === 'active',
          'bg-black/30 text-muted': state === 'pending',
        }"
      >
        {{ step }}
      </div>
      <div class="min-w-0">
        <h3 class="font-display text-base text-fg">{{ title }}</h3>
        <p class="mt-1 text-sm text-muted">{{ description }}</p>
      </div>
    </div>
  </section>
</template>
