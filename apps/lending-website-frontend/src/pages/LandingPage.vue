<script setup lang="ts">
// Static marketing page — no reactive state
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-16 space-y-20 pb-24">

    <!-- ── Hero ──────────────────────────────────────────────────── -->
    <section class="text-center flex flex-col items-center gap-6 pt-8">
      <p class="font-mono text-xs text-muted uppercase tracking-widest">Permissionless Credit Markets</p>
      <h1 class="font-display font-bold text-white text-5xl tracking-tight leading-tight max-w-2xl">
        Borrow &amp; Lend with<br />
        <span class="text-primary">Verified Credit Risk</span>
      </h1>
      <p class="text-muted text-base leading-relaxed max-w-xl">
        Earn competitive yields on unsecured loans or access funding without posting collateral.
        Counterparty risk is quantified through institutional attestations tied to each borrower's
        on-chain identity — giving credit markets the trust layer they need to function without a bank.
      </p>
      <div class="flex items-center gap-4">
        <RouterLink
          to="/marketplace"
          class="px-6 py-3 rounded bg-primary text-white font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow"
        >
          Browse Loans
        </RouterLink>
        <!-- Login CTA is a conversion funnel: drives wallet adoption for prospective borrowers/lenders -->
        <RouterLink
          to="/login"
          class="px-6 py-3 rounded border border-border text-muted hover:text-white hover:border-border-hover transition-colors"
        >
          Connect Wallet
        </RouterLink>
      </div>
    </section>

    <!-- ── Why OpenVouch Originate ─────────────────────────────────── -->
    <section>
      <h2 class="font-display font-bold text-white text-2xl tracking-tight text-center mb-10">Why OpenVouch Originate?</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div class="glass-panel rounded p-6 flex flex-col gap-3">
          <div class="w-10 h-10 rounded-full bg-emerald/20 border border-emerald/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-emerald">show_chart</span>
          </div>
          <h3 class="font-display font-bold text-white text-lg">Real yield on unsecured loans</h3>
          <p class="text-muted text-sm leading-relaxed">
            Deploy capital at competitive APYs without overcollateralization eating into returns.
            Counterparty risk is verified, not assumed.
          </p>
        </div>
        <div class="glass-panel rounded p-6 flex flex-col gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary">lock_open</span>
          </div>
          <h3 class="font-display font-bold text-white text-lg">Borrow against your credit</h3>
          <p class="text-muted text-sm leading-relaxed">
            Access funding without locking up assets or facing liquidation risk.
            Your attested on-chain reputation is your credit line.
          </p>
        </div>
        <div class="glass-panel rounded p-6 flex flex-col gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary">contract</span>
          </div>
          <h3 class="font-display font-bold text-white text-lg">Trustless settlement</h3>
          <p class="text-muted text-sm leading-relaxed">
            Disbursements, repayments, and defaults execute on-chain automatically.
            No custodians, no intermediaries, no counterparty exposure.
          </p>
        </div>
      </div>
    </section>

    <!-- ── The credit layer ──────────────────────────────────────── -->
    <section>
      <h2 class="font-display font-bold text-white text-2xl tracking-tight text-center mb-10">The credit layer crypto was missing</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        <!-- Wallet-only risk -->
        <div class="glass-panel rounded p-6 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-danger/20 border border-danger/30 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-danger text-base">wallet</span>
            </div>
            <h3 class="font-display font-bold text-white text-base">Wallet-activity risk models</h3>
          </div>
          <ul class="flex flex-col gap-2.5">
            <li class="flex items-start gap-2.5 text-sm text-muted">
              <span class="material-symbols-outlined text-danger text-base mt-0.5 flex-shrink-0">close</span>
              On-chain history is easily manufactured — funded wallets provide no real creditworthiness signal
            </li>
            <li class="flex items-start gap-2.5 text-sm text-muted">
              <span class="material-symbols-outlined text-danger text-base mt-0.5 flex-shrink-0">close</span>
              No real-world recourse — a defaulting wallet can simply be abandoned with no consequences
            </li>
            <li class="flex items-start gap-2.5 text-sm text-muted">
              <span class="material-symbols-outlined text-danger text-base mt-0.5 flex-shrink-0">close</span>
              Collateral requirements to compensate for the lack of trust make unsecured lending impossible
            </li>
          </ul>
        </div>

        <!-- Attestation chain -->
        <div class="glass-panel rounded p-6 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-emerald/20 border border-emerald/30 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-emerald text-base">verified</span>
            </div>
            <h3 class="font-display font-bold text-white text-base">OpenVouch attestation chain</h3>
          </div>
          <ul class="flex flex-col gap-2.5">
            <li class="flex items-start gap-2.5 text-sm text-muted">
              <span class="material-symbols-outlined text-emerald text-base mt-0.5 flex-shrink-0">check</span>
              Independent institutions — KYC providers, credit bureaus, auditors — issue verifiable claims tied to a crypto identity
            </li>
            <li class="flex items-start gap-2.5 text-sm text-muted">
              <span class="material-symbols-outlined text-emerald text-base mt-0.5 flex-shrink-0">check</span>
              Jurisdiction-agnostic: lenders choose which attestors they recognise — no single standard imposed by the protocol
            </li>
            <li class="flex items-start gap-2.5 text-sm text-muted">
              <span class="material-symbols-outlined text-emerald text-base mt-0.5 flex-shrink-0">check</span>
              Composable trust layers enable unsecured lending with quantified, auditable risk — no collateral required
            </li>
          </ul>
        </div>

      </div>
    </section>

    <!-- ── How it works ───────────────────────────────────────────── -->
    <section>
      <h2 class="font-display font-bold text-white text-2xl tracking-tight text-center mb-10">How It Works</h2>
      <div class="glass-panel rounded p-8 flex flex-col sm:flex-row items-start gap-8">
        <div class="flex flex-col gap-2 flex-1">
          <span class="font-mono text-3xl font-bold text-primary">01</span>
          <h3 class="font-display font-bold text-white text-lg">Borrower builds credit</h3>
          <p class="text-muted text-sm leading-relaxed">
            Borrowers accumulate on-chain attestations from institutions they work with — KYC providers,
            credit protocols, auditors — each adding independent, verifiable weight to their crypto identity.
          </p>
        </div>
        <div class="w-px self-stretch bg-border hidden sm:block" />
        <div class="flex flex-col gap-2 flex-1">
          <span class="font-mono text-3xl font-bold text-primary">02</span>
          <h3 class="font-display font-bold text-white text-lg">Lenders review open requests</h3>
          <p class="text-muted text-sm leading-relaxed">
            Browse loan requests and inspect the claims behind each borrower — no deposit required to evaluate.
            Filter by APY, duration, trust score, and the attestors you trust.
          </p>
        </div>
        <div class="w-px self-stretch bg-border hidden sm:block" />
        <div class="flex flex-col gap-2 flex-1">
          <span class="font-mono text-3xl font-bold text-primary">03</span>
          <h3 class="font-display font-bold text-white text-lg">Smart contract settles</h3>
          <p class="text-muted text-sm leading-relaxed">
            Funds disburse and repayments are collected automatically. Defaults are recorded on-chain,
            affecting the borrower's attestation score with no custodians or delays.
          </p>
        </div>
      </div>
    </section>

    <!-- ── CTA strip ──────────────────────────────────────────────── -->
    <section>
      <div class="glass-panel rounded p-10 flex flex-col items-center gap-5 text-center">
        <h2 class="font-display font-bold text-white text-3xl tracking-tight">Lend with confidence</h2>
        <p class="text-muted text-sm max-w-md leading-relaxed">
          Put your idle assets to work with real yield — backed by institutional attestations,
          not just wallet activity.
        </p>
        <RouterLink
          to="/login"
          class="px-8 py-3 rounded bg-primary text-white font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow"
        >
          Connect Wallet
        </RouterLink>
      </div>
    </section>

  </div>
</template>
