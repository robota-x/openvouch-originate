<script setup lang="ts">
// Static marketing page — no reactive state
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-16 space-y-20 pb-24">

    <!-- ── Hero ──────────────────────────────────────────────────── -->
    <section class="text-center flex flex-col items-center gap-6 pt-8">
      <p class="font-mono text-xs text-muted uppercase tracking-widest">Permissionless DeFi Lending</p>
      <h1 class="font-display font-bold text-white text-5xl tracking-tight leading-tight max-w-2xl">
        Borrow & Lend with<br />
        <span class="text-primary">On-chain Credit</span>
      </h1>
      <p class="text-muted text-base leading-relaxed max-w-xl">
        Real credit scoring on the blockchain. Transparent loan terms, trustless settlement,
        and identity-backed attestations — no banks, no middlemen.
      </p>
      <div class="flex items-center gap-4">
        <RouterLink
          to="/marketplace"
          class="px-6 py-3 rounded bg-primary text-white font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow"
        >
          Browse Loans
        </RouterLink>
        <RouterLink
          to="/login"
          class="px-6 py-3 rounded border border-border text-muted hover:text-white hover:border-border-hover transition-colors"
        >
          Connect Wallet
        </RouterLink>
      </div>
    </section>

    <!-- ── Features ──────────────────────────────────────────────── -->
    <section>
      <h2 class="font-display font-bold text-white text-2xl tracking-tight text-center mb-10">Why OpenVouch Originate?</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div class="glass-panel rounded p-6 flex flex-col gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary">verified_user</span>
          </div>
          <h3 class="font-display font-bold text-white text-lg">On-chain Attestations</h3>
          <p class="text-muted text-sm leading-relaxed">
            KYC, credit scores, ENS domains, and repayment history — all verifiable on-chain via EAS.
          </p>
        </div>
        <div class="glass-panel rounded p-6 flex flex-col gap-3">
          <div class="w-10 h-10 rounded-full bg-emerald/20 border border-emerald/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-emerald">contract</span>
          </div>
          <h3 class="font-display font-bold text-white text-lg">Transparent Terms</h3>
          <p class="text-muted text-sm leading-relaxed">
            APY, duration, and collateral requirements are all visible before you commit a single dollar.
          </p>
        </div>
        <div class="glass-panel rounded p-6 flex flex-col gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary">hub</span>
          </div>
          <h3 class="font-display font-bold text-white text-lg">Trustless Settlement</h3>
          <p class="text-muted text-sm leading-relaxed">
            Smart contracts handle disbursement and repayment automatically — no custodians, no delays.
          </p>
        </div>
      </div>
    </section>

    <!-- ── How it works ───────────────────────────────────────────── -->
    <section>
      <h2 class="font-display font-bold text-white text-2xl tracking-tight text-center mb-10">How It Works</h2>
      <div class="glass-panel rounded p-8 flex flex-col sm:flex-row items-start gap-8">
        <div class="flex flex-col gap-2 flex-1">
          <span class="font-mono text-3xl font-bold text-primary">01</span>
          <h3 class="font-display font-bold text-white text-lg">Lender deposits</h3>
          <p class="text-muted text-sm leading-relaxed">Connect your wallet and browse open loan requests. Filter by APY, duration, and borrower trust score.</p>
        </div>
        <div class="w-px self-stretch bg-border hidden sm:block" />
        <div class="flex flex-col gap-2 flex-1">
          <span class="font-mono text-3xl font-bold text-primary">02</span>
          <h3 class="font-display font-bold text-white text-lg">Borrower verified</h3>
          <p class="text-muted text-sm leading-relaxed">Borrowers accumulate on-chain attestations from KYC providers, credit protocols, and repayment history.</p>
        </div>
        <div class="w-px self-stretch bg-border hidden sm:block" />
        <div class="flex flex-col gap-2 flex-1">
          <span class="font-mono text-3xl font-bold text-primary">03</span>
          <h3 class="font-display font-bold text-white text-lg">Smart contract settles</h3>
          <p class="text-muted text-sm leading-relaxed">Funds disburse and repayments are collected automatically. Defaults are recorded on-chain, affecting future scores.</p>
        </div>
      </div>
    </section>

    <!-- ── CTA strip ──────────────────────────────────────────────── -->
    <section>
      <div class="glass-panel rounded p-10 flex flex-col items-center gap-5 text-center">
        <h2 class="font-display font-bold text-white text-3xl tracking-tight">Ready to lend?</h2>
        <p class="text-muted text-sm max-w-md leading-relaxed">
          Put your idle assets to work with real yield backed by on-chain credit data.
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
