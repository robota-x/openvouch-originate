<script setup lang="ts">
import { useRoute } from "vue-router";
import { onMounted } from "vue";
import AppNav from "./components/AppNav.vue";
import { useAuth } from "./composables/useAuth";

const route = useRoute();
const auth = useAuth();

// ✅ Restore wallet session on app load
onMounted(() => {
  auth.restoreSession();
});
</script>

<template>
  <div
    class="min-h-screen bg-background font-body text-fg relative overflow-x-hidden"
  >
    <div class="fixed inset-0 pointer-events-none -z-10 ambient-glows" />
    <AppNav v-if="!route.meta.hideNav" />
    <RouterView />
  </div>
</template>
