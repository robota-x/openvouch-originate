<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth";
import { useSolana } from "../composables/useSolana";
import { solanaBridge } from "../utils/solana-bridge";
import type {
  Profile,
  ProfileLoan,
  ContractView,
  Attestation,
  AttestationProvider,
} from "../types";
import { ApiError } from "../types";
import {
  backendClient,
  identityClient,
  attestationClient,
} from "../api/client";
import { fmt, fmtDate } from "../utils/format";
import { toLamports, toSol } from "../utils/precision";
import { profileLoanToContractView } from "../utils/loans";
import AttestationCard from "../components/AttestationCard.vue";
import AttestationModal from "../components/AttestationModal.vue";
import ProfileLoanCard from "../components/ProfileLoanCard.vue";
import ContractModal from "../components/ContractModal.vue";
import ReviewModal from "../components/ReviewModal.vue";

const auth = useAuth();
const solana = useSolana();
const route = useRoute();
const router = useRouter();
const address = route.params.address as string;

const isOwnProfile = computed(() => auth.address === address);
const profile = ref<Profile | null>(null);
const providers = ref<AttestationProvider[]>([]);
const loadError = ref<string | null>(null);
const activeTab = ref<"attestations" | "loans">("attestations");
const isProcessing = ref(false);

// --- Review System State ---
const isReviewModalOpen = ref(false);
const activeReviewLoan = ref<ProfileLoan | null>(null);

async function refreshProfile() {
  try {
    const [prof, provs, externalAtts] = await Promise.all([
      backendClient.getProfile(address),
      backendClient.getAttestationProviders(),
      fetchExternalAttestations(address),
    ]);

    profile.value = {
      ...prof,
      attestations: [...prof.attestations, ...externalAtts],
    };
    providers.value = provs;
    if (isOwnProfile.value) {
      auth.attestationCount = profile.value.attestations.length;
    }
    updateModalFromUrl();
  } catch (e) {
    console.error("[ProfilePage] Failed to load data:", e);
    loadError.value =
      e instanceof ApiError ? e.message : "Failed to load profile";
  }
}

onMounted(refreshProfile);

async function handleDisburse(loanId: string) {
  if (!auth.isAuthenticated) return;

  isProcessing.value = true;
  try {
    const { transaction: txBase64 } = await backendClient.initiateDisbursement(
      auth.token!,
      loanId,
    );
    const tx = solanaBridge.deserializeTx(txBase64);
    const signature = await solanaBridge.signAndBroadcast(
      solana.connection,
      tx,
      auth.connectedWallet,
    );
    await backendClient.finalizeDisbursement(auth.token!, loanId, {
      signature,
    });
    await refreshProfile();
    alert("Loan funds disbursed to your wallet!");
  } catch (e: any) {
    console.error("[ProfilePage] Disbursement failed:", e);
    alert(`Disbursement failed: ${e.message}`);
  } finally {
    isProcessing.value = false;
  }
}

async function handleRepay(loanId: string, amount: string) {
  if (!auth.isAuthenticated) return;

  isProcessing.value = true;
  try {
    // Note: We use installment 1 as a placeholder/prototype value
    const { transaction: txBase64 } = await backendClient.initiateRepayment(
      auth.token!,
      loanId,
      1,
      amount,
    );
    const tx = solanaBridge.deserializeTx(txBase64);
    const signature = await solanaBridge.signAndBroadcast(
      solana.connection,
      tx,
      auth.connectedWallet,
    );
    await backendClient.finalizeRepayment(auth.token!, loanId, {
      signature,
      amount,
    });
    await refreshProfile();
    alert("Repayment successful!");
  } catch (e: any) {
    console.error("[ProfilePage] Repayment failed:", e);
    alert(`Repayment failed: ${e.message}`);
  } finally {
    isProcessing.value = false;
  }
}

// --- Review Handlers ---
function openReviewModal(loan: ProfileLoan) {
  if (!auth.isAuthenticated) {
    alert("Please connect your wallet to leave a review.");
    return;
  }
  activeReviewLoan.value = loan;
  isReviewModalOpen.value = true;
}

function closeReviewModal() {
  isReviewModalOpen.value = false;
  activeReviewLoan.value = null;
  // Refresh profile to show new review stats if needed
  refreshProfile();
}

const activeAttestation = ref<Attestation | null>(null);
const activeProvider = ref<AttestationProvider | null>(null);

// ── URL-Synced Modal Logic ───────────────────────────────────────────────
const viewAttestationTitle = computed(
  () => route.query.viewAttestation as string | undefined,
);

function updateModalFromUrl() {
  if (!profile.value) return;
  const title = viewAttestationTitle.value;
  if (title) {
    const att = profile.value.attestations.find((a) => a.title === title);
    if (att) {
      activeAttestation.value = att;
      activeProvider.value =
        providers.value.find((p) => p.id === att.providerId) ?? null;
      return;
    }
  }
  activeAttestation.value = null;
  activeProvider.value = null;
}

function openAttestation(att: Attestation) {
  router.push({ query: { ...route.query, viewAttestation: att.title } });
}

function closeAttestation() {
  const query = { ...route.query };
  delete query.viewAttestation;
  delete query.justVerified;
  router.push({ query });
}

watch(() => route.query.viewAttestation, updateModalFromUrl);

/**
 * Fetches dynamic attestations from the identity and company microservices.
 */
async function fetchExternalAttestations(
  wallet: string,
): Promise<Attestation[]> {
  const attestations: Attestation[] = [];

  try {
    const [identity, company] = await Promise.all([
      identityClient.getIdentity(wallet),
      attestationClient.getStatus(wallet),
    ]);

    if (identity.verified && identity.identity) {
      attestations.push({
        icon: "fingerprint",
        title: "Identity Verified",
        status: "Verified",
        verified: true,
        issuedAt: new Date(identity.identity.verifiedAt).toISOString(),
        metadata: {
          "Full Name": identity.identity.fullName,
          "Date of Birth": fmtDate(identity.identity.dob),
          Country: identity.identity.country,
        },
      });
    }

    if (company.verified) {
      attestations.push({
        icon: "business",
        title: "UK Company Ownership",
        status: "Active",
        verified: true,
        issuedAt: company.issuedAt
          ? new Date(company.issuedAt * 1000).toISOString()
          : undefined,
        onChainRef: company.attestationAddress,
        metadata: {
          "Company Name": company.companyName ?? "Unknown",
          "Company Number": company.companyNumber ?? "Unknown",
          "Authorized Director": company.directorName ?? "Unknown",
          Expires: company.expiresAt
            ? fmtDate(company.expiresAt * 1000)
            : "Never",
        },
      });
    }
  } catch (err) {
    console.warn("[ProfilePage] Failed to fetch external attestations:", err);
  }

  return attestations;
}

// ── Contract modal ─────────────────────────────────────────────────────────
const activeContract = ref<ContractView | null>(null);

function openContract(loan: ProfileLoan) {
  if (!profile.value) return;
  activeContract.value = profileLoanToContractView(loan, profile.value);
}

// ── Trust score color ──────────────────────────────────────────────────────
const trustColor = computed(() => {
  const s = profile.value?.trustScore ?? 0;
  if (s >= 700) return "text-emerald";
  if (s >= 400) return "text-orange";
  return "text-danger";
});

// ── Loan groups ────────────────────────────────────────────────────────────
const openLoans = computed(
  () => profile.value?.loans.filter((l) => l.status === "open") ?? [],
);
const activeLoans = computed(
  () => profile.value?.loans.filter((l) => l.status === "active") ?? [],
);
const settledLoans = computed(
  () =>
    profile.value?.loans.filter(
      (l) => l.status === "repaid" || l.status === "defaulted",
    ) ?? [],
);

// ── Loan recap stats ───────────────────────────────────────────────────────
const totalRepaid = computed(() =>
  toSol(
    profile.value?.loans.reduce((s, l) => s + toLamports(l.repaid), 0n) ?? 0n,
  ),
);
const totalRequested = computed(() =>
  toSol(openLoans.value.reduce((s, l) => s + toLamports(l.amount), 0n)),
);
// Active loans are fully outstanding (repaid is always 0 until expiry)
const totalOutstanding = computed(() =>
  toSol(activeLoans.value.reduce((s, l) => s + toLamports(l.amount), 0n)),
);
// Repayment rate is computed only over settled loans (active loans are still pending)
const repaymentRate = computed(() => {
  const borrowed = settledLoans.value.reduce(
    (s, l) => s + toLamports(l.amount),
    0n,
  );
  const repaid = settledLoans.value.reduce(
    (s, l) => s + toLamports(l.repaid),
    0n,
  );
  return borrowed > 0n ? Number((repaid * 100n) / borrowed) : 100;
});

// ── Attestation recap ──────────────────────────────────────────────────────
const verifiedCount = computed(
  () =>
    profile.value?.attestations.filter((a) => a.verified !== false).length ?? 0,
);
const pendingCount = computed(
  () =>
    profile.value?.attestations.filter((a) => a.verified === false).length ?? 0,
);

const redirectUrlForIdentity = computed(() => {
  return `${window.location.origin}/profile/${address}?viewAttestation=Identity+Verified&justVerified=1`;
});

const redirectUrlForCompany = computed(() => {
  return `${window.location.origin}/profile/${address}?viewAttestation=UK+Company+Ownership&justVerified=1`;
});
</script>

<template>
  <div class="max-w-[860px] mx-auto px-4 py-12 flex flex-col gap-8 pb-20">
    <!-- ── Error state ───────────────────────────────────────────────── -->
    <div
      v-if="loadError"
      class="glass-panel rounded p-6 flex items-center gap-4 text-danger"
    >
      <span class="material-symbols-outlined text-2xl">error_outline</span>
      <p class="text-sm">{{ loadError }}</p>
    </div>

    <!-- ── Loading skeleton ──────────────────────────────────────────── -->
    <template v-if="!profile && !loadError">
      <div class="flex flex-col items-center gap-4">
        <div class="w-24 h-24 rounded-full bg-white/5 animate-pulse" />
        <div class="h-5 w-32 bg-white/5 rounded animate-pulse" />
        <div class="h-3 w-64 bg-white/5 rounded animate-pulse" />
      </div>
    </template>

    <template v-else-if="profile">
      <!-- ── Profile header ──────────────────────────────────────────── -->
      <section class="flex flex-col items-center gap-3 text-center">
        <!-- 96px avatar with glow -->
        <div class="relative">
          <div
            class="w-24 h-24 rounded-full bg-surface border border-white/10 flex items-center justify-center relative z-10 backdrop-blur-2xl"
          >
            <span class="font-mono text-xl text-primary">0x</span>
          </div>
          <div
            class="absolute inset-0 bg-primary/30 rounded-full blur-2xl -z-10 scale-150"
          />
        </div>

        <!-- Nickname -->
        <h1 class="font-display text-2xl font-bold text-white">
          {{ profile.nickname }}
        </h1>

        <!-- Full address -->
        <p class="font-mono text-xs text-muted">{{ profile.address }}</p>

        <!-- Trust score -->
        <div
          class="flex flex-col items-center gap-0.5 mt-1"
          :class="trustColor"
        >
          <div class="flex items-baseline gap-1">
            <span class="font-mono font-bold text-3xl leading-none">{{
              profile.trustScore
            }}</span>
            <span
              class="material-symbols-outlined text-sm leading-none"
              style="font-variation-settings: 'FILL' 1"
              >auto_awesome</span
            >
          </div>
          <span class="text-[10px] text-muted uppercase tracking-widest"
            >Trust Score</span
          >
        </div>

        <!-- Verified attestations badge -->
        <div class="flex items-center gap-2 mt-1">
          <span class="material-symbols-outlined text-emerald text-base"
            >verified_user</span
          >
          <span class="text-emerald text-sm font-medium"
            >{{ verifiedCount }} Verified Attestations</span
          >
        </div>
      </section>

      <!-- ── Tab bar ─────────────────────────────────────────────────── -->
      <div class="flex items-center gap-6 border-b border-border">
        <button
          class="pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
          :class="
            activeTab === 'attestations'
              ? 'border-primary text-white'
              : 'border-transparent text-muted hover:text-white'
          "
          @click="activeTab = 'attestations'"
        >
          Attestations
        </button>
        <button
          class="pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
          :class="
            activeTab === 'loans'
              ? 'border-primary text-white'
              : 'border-transparent text-muted hover:text-white'
          "
          @click="activeTab = 'loans'"
        >
          Loans
        </button>
      </div>

      <!-- ── Attestations tab ────────────────────────────────────────── -->
      <div v-if="activeTab === 'attestations'" class="flex flex-col gap-6">
        <!-- Recap bar -->
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div class="flex items-center gap-4 font-mono text-sm">
            <span class="text-emerald font-bold"
              >{{ verifiedCount }} verified</span
            >
            <span class="text-muted">·</span>
            <span class="text-muted">{{ pendingCount }} pending</span>
          </div>

          <div v-if="isOwnProfile" class="flex items-center gap-2">
            <RouterLink
              :to="{
                path: '/verify/company',
                query: { redirectUrl: redirectUrlForCompany },
              }"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white/5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <span class="material-symbols-outlined text-sm">business</span>
              Verify UK Company Ownership
            </RouterLink>
            <RouterLink
              :to="{
                path: '/verify/portal',
                query: { redirectUrl: redirectUrlForIdentity },
              }"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
            >
              <span class="material-symbols-outlined text-sm">fingerprint</span>
              Verify Identity
            </RouterLink>
          </div>
        </div>

        <!-- Attestation cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <AttestationCard
            v-for="att in profile.attestations"
            :key="att.title"
            v-bind="att"
            @view="openAttestation(att)"
          />
        </div>
      </div>

      <!-- ── Loans tab ───────────────────────────────────────────────── -->
      <div v-else class="flex flex-col gap-6">
        <!-- Recap bar -->
        <div class="flex items-center gap-4 flex-wrap font-mono text-sm">
          <span class="text-white font-bold"
            >{{ profile.loans.length }} loans</span
          >
          <span class="text-muted">·</span>
          <span>
            <span class="text-white font-bold">{{ repaymentRate }}%</span>
            <span class="text-muted"> repaid</span>
          </span>
          <span class="text-muted">·</span>
          <span class="text-muted">{{ fmt(totalRequested) }} requested</span>
          <span class="text-muted">·</span>
          <span class="text-muted"
            >{{ fmt(totalOutstanding) }} outstanding</span
          >
          <span class="text-muted">·</span>
          <span class="text-muted">{{ fmt(totalRepaid) }} repaid total</span>
        </div>

        <!-- Open offers -->
        <template v-if="openLoans.length">
          <p class="text-xs uppercase tracking-widest text-muted">
            Open offers
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileLoanCard
              v-for="loan in openLoans"
              :key="loan.id"
              v-bind="loan"
              @view="openContract(loan)"
              @disburse="handleDisburse(loan.id)"
            />
          </div>
        </template>

        <!-- Active loans -->
        <template v-if="activeLoans.length">
          <p class="text-xs uppercase tracking-widest text-muted">
            Active loans
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileLoanCard
              v-for="loan in activeLoans"
              :key="loan.id"
              v-bind="loan"
              @view="openContract(loan)"
              @repay="
                handleRepay(
                  loan.id,
                  toSol(toLamports(loan.amount) / BigInt(loan.duration)),
                )
              "
            />
          </div>
        </template>

        <!-- Settled loans (repaid or defaulted) -->
        <template v-if="settledLoans.length">
          <p class="text-xs uppercase tracking-widest text-muted">
            Closed loans
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProfileLoanCard
              v-for="loan in settledLoans"
              :key="loan.id"
              v-bind="loan"
              @view="openContract(loan)"
            >
              <!-- Leave Review Button for Closed Loans -->
              <template #actions>
                <button
                  v-if="
                    isOwnProfile &&
                    (loan.status === 'repaid' || loan.status === 'defaulted')
                  "
                  @click="openReviewModal(loan)"
                  class="mt-2 w-full py-1.5 px-3 rounded bg-primary/20 border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/30 transition-colors"
                >
                  Leave Review
                </button>
              </template>
            </ProfileLoanCard>
          </div>
        </template>

        <!-- Empty state -->
        <p v-if="!profile.loans.length" class="text-muted text-sm">
          No loan history.
        </p>
      </div>
    </template>
  </div>

  <!-- Attestation modal -->
  <AttestationModal
    v-if="activeAttestation"
    :attestation="activeAttestation"
    :provider="activeProvider ?? undefined"
    :address="address"
    @close="closeAttestation"
  />

  <!-- Contract modal -->
  <ContractModal
    v-if="activeContract"
    :contract="activeContract"
    @close="activeContract = null"
    @fund="activeContract = null"
  />

  <!-- Review Modal -->
  <ReviewModal
    v-if="isReviewModalOpen && activeReviewLoan"
    :loan-id="activeReviewLoan.id"
    :target-address="activeReviewLoan.counterparty ?? ''"
    :is-open="isReviewModalOpen"
    @close="closeReviewModal"
  />
</template>
