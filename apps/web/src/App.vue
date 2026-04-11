<script setup lang="ts">
// Pure reference page — no reactive state

const colourTokens = [
  { label: 'Primary',       token: 'primary',        value: '#8c51f0',                desc: 'CTAs · buttons · active states · glows' },
  { label: 'Emerald',       token: 'emerald',        value: '#10B981',                desc: 'Trust scores · verified · success' },
  { label: 'Orange',        token: 'orange',         value: '#F97316',                desc: 'Failure rate 0–1% · caution' },
  { label: 'Danger',        token: 'danger',         value: '#EF4444',                desc: 'Failure rate >1% · errors' },
  { label: 'Foreground',    token: 'fg',             value: '#F8FAFC',                desc: 'Primary text' },
  { label: 'Muted',         token: 'muted',          value: '#94A3B8',                desc: 'Labels · secondary text · timestamps' },
  { label: 'Surface',        token: 'surface',        value: 'rgba(255,255,255,0.03)', desc: 'Glass panel base fill' },
  { label: 'Surface Hover',  token: 'surface-hover',  value: 'rgba(255,255,255,0.06)', desc: 'Glass panel hover fill' },
  { label: 'Border',         token: 'border',         value: 'rgba(255,255,255,0.08)', desc: 'Panel borders (resting)' },
  { label: 'Border Hover',   token: 'border-hover',   value: 'rgba(255,255,255,0.15)', desc: 'Panel borders (hover/active)' },
  { label: 'Background',     token: 'background',     value: '#0A0B0E',                desc: 'Page void' },
]

const depthLayers = [
  { label: 'Sticky nav / header backgrounds', cls: 'bg-black/40', value: 'black/40' },
  { label: 'Inset data rows inside cards',    cls: 'bg-black/20', value: 'black/20' },
  { label: 'Skeleton / loading fills',        cls: 'bg-black/10', value: 'black/10' },
]
</script>

<template>
  <div class="min-h-screen bg-background font-body text-fg relative overflow-x-hidden">

    <!-- Ambient glows: fixed, non-interactive, behind all content -->
    <div class="fixed inset-0 pointer-events-none -z-10 ambient-glows" />

    <div class="max-w-4xl mx-auto px-8 py-16 space-y-20">

      <!-- ── Header ────────────────────────────────────────────────── -->
      <header class="border-b border-border pb-8">
        <p class="font-mono text-xs text-muted uppercase tracking-widest mb-3">defi-hack</p>
        <h1 class="font-display text-4xl font-bold text-white tracking-tight">Design System</h1>
        <p class="text-muted mt-2 text-sm">Glassmorphic Void — token reference</p>
      </header>

      <!-- ── Colour Palette ─────────────────────────────────────────── -->
      <section>
        <h2 class="font-display text-xl font-bold text-white tracking-tight mb-6">Colour Palette</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div
            v-for="c in colourTokens"
            :key="c.token"
            class="glass-panel rounded p-4"
          >
            <div
              class="w-full h-10 rounded mb-3 border border-white/10"
              :style="{ background: c.value }"
            />
            <p class="font-mono text-xs text-white font-medium">{{ c.token }}</p>
            <p class="font-mono text-xs text-muted mt-0.5">{{ c.value }}</p>
            <p class="text-xs text-muted mt-2 leading-relaxed">{{ c.desc }}</p>
          </div>
        </div>
      </section>

      <!-- ── Depth Layers ───────────────────────────────────────────── -->
      <section>
        <h2 class="font-display text-xl font-bold text-white tracking-tight mb-2">Depth Layers</h2>
        <p class="text-muted text-sm mb-6">
          Black with opacity overlaid on <code class="font-mono text-xs text-primary">background</code>.
          Uses Tailwind's built-in <code class="font-mono text-xs text-primary">bg-black/X</code> — no custom token needed.
        </p>
        <div class="glass-panel rounded p-6 space-y-4">
          <div v-for="d in depthLayers" :key="d.value" class="flex items-center gap-4">
            <div class="w-28 h-10 rounded flex-shrink-0 border border-white/10" :class="d.cls" />
            <div>
              <p class="font-mono text-xs text-white">bg-{{ d.value }}</p>
              <p class="text-xs text-muted mt-0.5">{{ d.label }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Typography ─────────────────────────────────────────────── -->
      <section>
        <h2 class="font-display text-xl font-bold text-white tracking-tight mb-6">Typography</h2>
        <div class="space-y-4">

          <!-- Outfit — display headings -->
          <div class="glass-panel rounded p-6">
            <p class="font-mono text-xs text-muted uppercase tracking-widest mb-4">font-display · Outfit 700</p>
            <p class="font-display font-bold text-white text-4xl tracking-tight leading-tight">Open Requests</p>
            <p class="font-display font-bold text-white text-2xl tracking-tight mt-2 leading-tight">Lender Marketplace</p>
            <p class="font-display font-bold text-white text-xl tracking-tight mt-2 leading-tight">Identity Profile</p>
          </div>

          <!-- Plus Jakarta Sans — body -->
          <div class="glass-panel rounded p-6">
            <p class="font-mono text-xs text-muted uppercase tracking-widest mb-4">font-body · Plus Jakarta Sans</p>
            <p class="text-white text-sm font-bold">Semibold label · 14px</p>
            <p class="text-fg text-sm mt-2 leading-relaxed max-w-lg">
              Regular body copy — this profile's trust score is calculated based on on-chain
              activity and 3rd-party identity verifications.
            </p>
            <p class="text-muted text-xs uppercase tracking-widest font-medium mt-3">Small label · 12px · uppercase</p>
          </div>

          <!-- Space Grotesk — data / numbers -->
          <div class="glass-panel rounded p-6">
            <p class="font-mono text-xs text-muted uppercase tracking-widest mb-4">font-mono · Space Grotesk · numbers & data</p>
            <div class="flex items-end gap-8 flex-wrap">
              <div>
                <p class="text-xs text-muted mb-1 uppercase tracking-widest">APY</p>
                <p class="font-mono text-3xl font-bold text-white">12.5%</p>
              </div>
              <div>
                <p class="text-xs text-muted mb-1 uppercase tracking-widest">Amount</p>
                <p class="font-mono text-3xl font-bold text-white">
                  5,000 <span class="text-lg text-white/70">USDC</span>
                </p>
              </div>
              <div>
                <p class="text-xs text-muted mb-1 uppercase tracking-widest">Wallet</p>
                <p class="font-mono text-sm text-white">0x71C...976F</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      <!-- ── Glass Surfaces ─────────────────────────────────────────── -->
      <section>
        <h2 class="font-display text-xl font-bold text-white tracking-tight mb-6">Surfaces</h2>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="font-mono text-xs text-muted mb-3">glass-panel · resting</p>
            <div class="glass-panel rounded p-6 h-24 flex items-center justify-center">
              <span class="text-xs text-muted">surface · rgba(255,255,255,0.03)</span>
            </div>
          </div>
          <div>
            <p class="font-mono text-xs text-muted mb-3">glass-panel · hover state</p>
            <div class="bg-surface-hover border border-border-hover backdrop-blur-[24px] rounded p-6 h-24 flex items-center justify-center">
              <span class="text-xs text-muted">surface-hover · rgba(255,255,255,0.06)</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Glows & Shadows ────────────────────────────────────────── -->
      <section>
        <h2 class="font-display text-xl font-bold text-white tracking-tight mb-6">Glows & Shadows</h2>
        <div class="glass-panel rounded p-8 space-y-10">

          <!-- Primary CTA -->
          <div>
            <p class="font-mono text-xs text-muted uppercase tracking-widest mb-5">
              Primary CTA · shadow-glow-primary / shadow-glow-primary-strong
            </p>
            <div class="flex items-center gap-4 flex-wrap">
              <div class="flex flex-col items-center gap-2">
                <button class="px-6 py-2.5 rounded bg-primary text-white text-sm font-bold shadow-glow-primary">
                  Fund Request
                </button>
                <span class="font-mono text-xs text-muted">resting</span>
              </div>
              <div class="flex flex-col items-center gap-2">
                <button class="px-6 py-2.5 rounded bg-primary text-white text-sm font-bold shadow-glow-primary-strong">
                  Fund Request
                </button>
                <span class="font-mono text-xs text-muted">hover</span>
              </div>
              <div class="flex flex-col items-center gap-2">
                <button class="px-6 py-2.5 rounded bg-primary text-white text-sm font-bold shadow-glow-primary hover:shadow-glow-primary-strong transition-shadow">
                  Fund Request ↗
                </button>
                <span class="font-mono text-xs text-muted">interactive</span>
              </div>
            </div>
          </div>

          <!-- Emerald badge glows -->
          <div>
            <p class="font-mono text-xs text-muted uppercase tracking-widest mb-5">
              Trust badge · shadow-glow-emerald / shadow-glow-emerald-strong
            </p>
            <div class="flex items-center gap-4">
              <div class="flex flex-col items-center gap-2">
                <span class="px-3 py-1 rounded-full border border-emerald/50 bg-emerald/10 text-xs font-bold text-emerald font-mono shadow-glow-emerald">
                  845
                </span>
                <span class="font-mono text-xs text-muted">badge resting</span>
              </div>
              <div class="flex flex-col items-center gap-2">
                <span class="px-3 py-1 rounded-full border border-emerald bg-emerald/20 text-xs font-bold text-emerald font-mono shadow-glow-emerald-strong">
                  700
                </span>
                <span class="font-mono text-xs text-muted">active filter</span>
              </div>
            </div>
          </div>

          <!-- Ambient glow reference -->
          <div>
            <p class="font-mono text-xs text-muted uppercase tracking-widest mb-3">Ambient glows · page background layer</p>
            <p class="text-xs text-muted max-w-md leading-relaxed">
              Fixed behind all content via the <code class="text-primary font-mono">ambient-glows</code> utility
              on a <code class="text-primary font-mono">fixed inset-0 pointer-events-none -z-10</code> div.
              Purple top-left · emerald bottom-right. Visible in the page background of this very page.
            </p>
          </div>

        </div>
      </section>

      <!-- ── Status System ──────────────────────────────────────────── -->
      <section>
        <h2 class="font-display text-xl font-bold text-white tracking-tight mb-6">Status System</h2>
        <div class="grid grid-cols-3 gap-4">
          <div class="glass-panel rounded p-5">
            <div class="w-2.5 h-2.5 rounded-full bg-emerald mb-4" />
            <p class="text-sm font-bold text-emerald">Verified · Success</p>
            <p class="text-xs text-muted mt-1 leading-relaxed">0% failure rate · high trust score · emerald</p>
            <p class="font-mono text-xs text-muted mt-3">#10B981</p>
          </div>
          <div class="glass-panel rounded p-5">
            <div class="w-2.5 h-2.5 rounded-full bg-orange mb-4" />
            <p class="text-sm font-bold text-orange">Caution</p>
            <p class="text-xs text-muted mt-1 leading-relaxed">&gt;0–1% failure · moderate risk · orange</p>
            <p class="font-mono text-xs text-muted mt-3">#F97316</p>
          </div>
          <div class="glass-panel rounded p-5">
            <div class="w-2.5 h-2.5 rounded-full bg-danger mb-4" />
            <p class="text-sm font-bold text-danger">High Risk</p>
            <p class="text-xs text-muted mt-1 leading-relaxed">&gt;1% failure · danger · red</p>
            <p class="font-mono text-xs text-muted mt-3">#EF4444</p>
          </div>
        </div>
      </section>

      <!-- ── Radius ─────────────────────────────────────────────────── -->
      <section class="pb-20">
        <h2 class="font-display text-xl font-bold text-white tracking-tight mb-6">Radius</h2>
        <p class="text-muted text-sm mb-6">4px everywhere. <code class="font-mono text-xs text-primary">rounded-full</code> (9999px) reserved for pills and avatar circles.</p>
        <div class="glass-panel rounded p-6 flex items-end gap-10 flex-wrap">
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 bg-primary/20 border border-primary/40 rounded" />
            <p class="font-mono text-xs text-muted">rounded</p>
            <p class="font-mono text-xs text-primary">4px</p>
          </div>
          <div class="flex flex-col items-center gap-3">
            <div class="w-16 h-16 bg-primary/20 border border-primary/40 rounded-full" />
            <p class="font-mono text-xs text-muted">rounded-full</p>
            <p class="font-mono text-xs text-primary">9999px</p>
          </div>
          <div class="flex flex-col items-center gap-3">
            <button class="h-9 px-5 bg-primary text-white text-xs font-bold rounded shadow-glow-primary">
              Fund Request
            </button>
            <p class="font-mono text-xs text-muted">button · rounded</p>
          </div>
          <div class="flex flex-col items-center gap-3">
            <span class="h-9 px-4 flex items-center bg-emerald/10 border border-emerald/50 text-emerald text-xs font-bold font-mono rounded-full shadow-glow-emerald">
              Trust 845
            </span>
            <p class="font-mono text-xs text-muted">badge · rounded-full</p>
          </div>
          <div class="flex flex-col items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 overflow-hidden flex items-center justify-center">
              <span class="font-mono text-xs text-primary">0x</span>
            </div>
            <p class="font-mono text-xs text-muted">avatar · rounded-full</p>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>
