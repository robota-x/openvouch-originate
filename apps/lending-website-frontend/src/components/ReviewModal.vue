<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuth } from "../composables/useAuth";

const props = defineProps<{
  loanId: string;
  targetAddress: string;
  isOpen: boolean;
}>();
const emit = defineEmits<{ close: [] }>();

const auth = useAuth();
const rating = ref(0);
const comment = ref("");
const isSubmitting = ref(false);

const wordCount = computed(
  () => comment.value.trim().split(/\s+/).filter(Boolean).length,
);
const isValid = computed(
  () => rating.value > 0 && wordCount.value <= 150 && comment.value.length > 0,
);

async function submit() {
  if (!isValid.value) return;
  if (!auth.connectedWallet) {
    alert("Please connect your wallet to submit a review.");
    return;
  }

  isSubmitting.value = true;
  try {
    alert("Review submission is not available yet.");
    emit("close");
  } catch (e) {
    console.error("[ReviewModal] Review submission failed:", e);
    alert("Failed to submit review");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay">
    <div class="glass-panel p-6 rounded-xl">
      <h3>Leave a Review</h3>

      <!-- Star Rating -->
      <div class="flex gap-2 my-4">
        <button
          v-for="i in 5"
          :key="i"
          @click="rating = i"
          class="text-2xl"
          :class="i <= rating ? 'text-yellow-400' : 'text-gray-600'"
        >
          ★
        </button>
      </div>

      <!-- Comment Input -->
      <textarea
        v-model="comment"
        class="w-full bg-black/20 border border-white/10 rounded p-3 text-white"
        rows="4"
        placeholder="Share your experience (max 150 words)..."
      ></textarea>
      <div class="text-right text-xs text-muted mt-1">
        {{ wordCount }}/150 words
      </div>

      <div class="flex justify-end gap-3 mt-4">
        <button @click="emit('close')" class="text-muted">Cancel</button>
        <button
          @click="submit"
          :disabled="!isValid || isSubmitting"
          class="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {{ isSubmitting ? "Submitting..." : "Submit Review" }}
        </button>
      </div>
    </div>
  </div>
</template>
B
