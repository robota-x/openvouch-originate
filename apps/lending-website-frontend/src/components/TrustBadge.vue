// <script setup lang="ts">
// defineProps<{ score: number }>()
// </script>

// <template>
//   <span
//     class="px-3 py-1 rounded-full border border-emerald/50 bg-emerald/10
//            text-xs font-bold text-emerald font-mono shadow-glow-emerald"
//   >
//     {{ score }}
//   </span>
// </template>

<script setup lang="ts">
/**
 * TrustBadge Component
 * Displays the user's trust score and, optionally, their social review rating.
 * 
 * Props:
 * - score: The primary trust score (integer).
 * - reviewCount: Total number of reviews received.
 * - avgRating: Average rating from reviews (1.0 - 5.0). If undefined, stars are hidden.
 */
defineProps<{ 
  score: number; 
  reviewCount?: number; 
  avgRating?: number 
}>();
</script>

<template>
  <div class="flex flex-col items-center gap-1">
    <!-- Primary Trust Score -->
    <div class="flex items-baseline gap-1">
      <span class="font-mono font-bold text-lg text-emerald-400">
        {{ score }}
      </span>
      <span class="material-symbols-outlined text-xs text-emerald-500/70">
        auto_awesome
      </span>
    </div>
    
    <!-- Social Review Rating (Stars) -->
    <div 
      v-if="avgRating !== undefined" 
      class="flex items-center gap-0.5 text-yellow-400 text-xs font-medium"
    >
      <!-- Render 5 stars -->
      <span 
        v-for="i in 5" 
        :key="i"
        class="transition-colors duration-200"
        :class="i <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-600/50'"
      >
        {{ i <= Math.round(avgRating) ? '★' : '☆' }}
      </span>
      
      <!-- Review Count -->
      <span 
        v-if="reviewCount !== undefined" 
        class="ml-1 text-gray-400 font-normal"
      >
        ({{ reviewCount }})
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Optional: Add subtle glow or hover effects if needed */
.text-yellow-400 {
  text-shadow: 0 0 2px rgba(250, 204, 21, 0.3);
}
</style>