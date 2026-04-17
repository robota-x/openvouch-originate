<script setup lang="ts">
import { useRoute } from 'vue-router'
import AppNav from './components/AppNav.vue'

const route = useRoute()
</script>

<template>
  <div class="min-h-screen bg-background font-body text-fg relative overflow-x-hidden">
    <div class="fixed inset-0 pointer-events-none -z-10 ambient-glows" />
    <AppNav v-if="!route.meta.hideNav" />
    <RouterView />
  </div>
</template>
