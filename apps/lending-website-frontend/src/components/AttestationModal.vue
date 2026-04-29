<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import type { Attestation, AttestationProvider } from "../types";

const props = defineProps<{
  attestation: Attestation;
  provider?: AttestationProvider;
  address: string;
}>();

const emit = defineEmits<{ close: [] }>();

// ── Status badge ───────────────────────────────────────────────────────────
const isVerified = computed(() => props.attestation.verified !== false);

const isPending = computed(
  () =>
    !isVerified.value && props.attestation.status.toLowerCase() === "pending",
);

const statusStyle = computed(() => {
  if (isVerified.value) return "border-emerald/40 bg-emerald/10 text-emerald";
  if (isPending.value) return "border-orange/40 bg-orange/10 text-orange";
  return "border-danger/40 bg-danger/10 text-danger";
});

// ── Links ──────────────────────────────────────────────────────────────────
const resolvedClaimUrl = computed(
  () => props.provider?.claimUrl?.replace("{address}", props.address) ?? null,
);

const solscanUrl = computed(() =>
  props.attestation.onChainRef
    ? `https://solscan.io/tx/${props.attestation.onChainRef}`
    : null,
);

// ── TX truncation (FIXED VERSION) ──────────────────────────────────────────
const truncatedTx = computed(() =>
  props.attestation.onChainRef
    ? truncate(props.attestation.onChainRef, 10)
    : null,
);

// ── Date formatting ────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function truncate(s: string, chars = 8) {
  return s.length > chars * 2 + 1 ? `${s.slice(0, chars)}…${s.slice(-4)}` : s;
}

// ── ESC to close ───────────────────────────────────────────────────────────
function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}

onMounted(() => document.addEventListener("keydown", onKey));
onUnmounted(() => document.removeEventListener("keydown", onKey));
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <div
        class="glass-panel rounded-xl max-w-lg w-full flex flex-col overflow-hidden"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
            >
              <span class="material-symbols-outlined text-white text-base">
                {{ attestation.icon }}
              </span>
            </div>

            <h2 class="text-white font-display font-bold text-base">
              {{ attestation.title }}
            </h2>

            <span
              class="px-2 py-0.5 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wide"
              :class="statusStyle"
            >
              {{ attestation.status }}
            </span>
          </div>

          <button
            class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
            @click="emit('close')"
          >
            <span class="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <!-- Body -->
        <div
          class="px-6 py-5 flex flex-col gap-5 overflow-y-auto max-h-[calc(100vh-8rem)]"
        >
          <!-- Provider -->
          <div v-if="provider" class="flex flex-col gap-2">
            <p class="text-[10px] text-muted uppercase tracking-widest">
              Attested by
            </p>

            <div class="bg-black/20 rounded-lg px-4 py-3 flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-white font-bold text-sm">
                  {{ provider.name }}
                </span>

                <span
                  v-if="isVerified"
                  class="flex items-center gap-1 text-[10px] text-emerald font-mono"
                >
                  <span
                    class="material-symbols-outlined text-[11px]"
                    style="font-variation-settings: &quot;FILL&quot; 1"
                  >
                    verified
                  </span>
                  On-chain signer
                </span>
              </div>

              <div class="flex items-center gap-3 flex-wrap text-[11px]">
                <span class="font-mono text-muted">
                  {{ truncate(provider.wallet) }}
                </span>

                <span class="text-white/20">·</span>

                <a
                  :href="provider.website"
                  target="_blank"
                  class="text-primary hover:underline flex items-center gap-0.5"
                >
                  {{ provider.website.replace("https://", "") }}
                </a>

                <template v-if="resolvedClaimUrl">
                  <span class="text-white/20">·</span>
                  <a
                    :href="resolvedClaimUrl"
                    target="_blank"
                    class="text-primary hover:underline"
                  >
                    View claim
                  </a>
                </template>
              </div>

              <p class="text-xs text-muted">
                {{ provider.description }}
              </p>
            </div>
          </div>

          <!-- Issued -->
          <div v-if="attestation.issuedAt">
            <span class="text-[10px] text-muted uppercase tracking-widest"
              >Issued</span
            >
            <div class="font-mono text-sm text-white">
              {{ fmtDate(attestation.issuedAt) }}
            </div>
          </div>

          <!-- Metadata -->
          <div
            v-if="
              attestation.metadata && Object.keys(attestation.metadata).length
            "
          >
            <p class="text-[10px] text-muted uppercase tracking-widest">
              Details
            </p>

            <div class="flex flex-col gap-1.5">
              <div
                v-for="(val, key) in attestation.metadata"
                :key="key"
                class="flex justify-between text-sm"
              >
                <span class="text-muted">{{ key }}</span>
                <span class="font-mono text-white">{{ val ?? "" }}</span>
              </div>
            </div>
          </div>

          <!-- On-chain -->
          <div v-if="solscanUrl" class="pt-1 border-t border-border">
            <p class="text-[10px] text-muted uppercase tracking-widest">
              On-chain reference
            </p>

            <div class="flex items-center gap-3 flex-wrap">
              <span
                v-if="truncatedTx"
                class="font-mono text-[11px] text-muted bg-white/5 px-2 py-1 rounded"
              >
                {{ truncatedTx }}
              </span>

              <a
                :href="solscanUrl"
                target="_blank"
                class="text-[11px] text-primary hover:underline"
              >
                View on Solscan
              </a>
            </div>
          </div>

          <!-- Warning -->
          <div
            v-if="!isVerified"
            class="bg-orange/5 border border-orange/20 rounded-lg px-4 py-3"
          >
            <p class="text-orange text-xs">
              <template v-if="isPending">
                This attestation is pending review.
              </template>
              <template v-else>
                This attestation could not be verified.
              </template>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-border flex justify-end">
          <button
            class="text-sm text-muted hover:text-white"
            @click="emit('close')"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
