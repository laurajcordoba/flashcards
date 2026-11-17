<script lang="ts">
  import { db } from '../lib/db'
  import Icon from '../lib/Icon.svelte'
  import { clock, live } from '../lib/state.svelte'
  import { computeStats } from '../lib/stats'

  const stats = live(() => clock.now, (now) => computeStats(db, now), null)

  const W = 320
  const H = 120
  const max = $derived(Math.max(1, ...(stats.value?.last30.map((d) => d.count) ?? [1])))
  const total30 = $derived(stats.value?.last30.reduce((s, d) => s + d.count, 0) ?? 0)
  const activeDays = $derived(stats.value?.last30.filter((d) => d.count > 0).length ?? 0)
</script>

<div class="page">
  <header>
    <h1>Estadísticas</h1>
  </header>

  {#if stats.value}
    {@const s = stats.value}
    <section class="card hero">
      <div class="flame" class:on={s.studiedToday}><Icon name="flame" size={32} /></div>
      <div>
        <p class="big">{s.streak} {s.streak === 1 ? 'día' : 'días'}</p>
        <p class="muted small">
          {#if s.streak === 0}Estudiá hoy para empezar una racha.{:else if !s.studiedToday}Estudiá hoy para no perder la racha.{:else}Racha actual · récord {s.bestStreak}{/if}
        </p>
      </div>
    </section>

    <section class="grid">
      <div class="card tile"><p class="num">{s.reviewsToday}</p><p class="muted small">repasos hoy</p></div>
      <div class="card tile">
        <p class="num">{s.retention30 === null ? '—' : `${Math.round(s.retention30 * 100)}%`}</p>
        <p class="muted small">aciertos en repasos (30 días)</p>
      </div>
      <div class="card tile"><p class="num">{s.totalCards}</p><p class="muted small">tarjetas en total</p></div>
      <div class="card tile"><p class="num c-review">{s.learnedCards}</p><p class="muted small">ya en repaso</p></div>
    </section>

    <section class="card">
      <div class="row chart-head">
        <h2>Últimos 30 días</h2>
        <span class="spacer"></span>
        <span class="muted small">{total30} {total30 === 1 ? 'repaso' : 'repasos'} · {activeDays} {activeDays === 1 ? 'día activo' : 'días activos'}</span>
      </div>
      <svg viewBox="0 0 {W} {H + 18}" role="img" aria-label="Repasos por día en los últimos 30 días">
        <line x1="0" x2={W} y1={H} y2={H} class="axis" />
        {#each s.last30 as d, i (d.key)}
          {@const bw = W / 30}
          {@const h = d.count === 0 ? 0 : Math.max(3, (d.count / max) * (H - 8))}
          <rect x={i * bw + 1.5} y={H - h} width={bw - 3} height={h} rx="2" class:today={i === 29}>
            <title>{d.label}: {d.count} repasos</title>
          </rect>
        {/each}
        <text x="0" y={H + 14} class="lbl">{s.last30[0].label}</text>
        <text x={W} y={H + 14} class="lbl" text-anchor="end">Hoy</text>
      </svg>
    </section>
  {/if}
</div>

<style>
  .hero {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .flame {
    width: 60px;
    height: 60px;
    border-radius: 18px;
    display: grid;
    place-items: center;
    background: var(--surface-2);
    color: var(--muted);
  }

  .flame.on {
    background: #fff7ed;
    color: #ea580c;
  }

  @media (prefers-color-scheme: dark) {
    .flame.on {
      background: #3a2010;
      color: #fb923c;
    }
  }

  .big {
    font-size: 1.7rem;
    font-weight: 750;
    letter-spacing: -0.02em;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .tile {
    padding: 14px 16px;
  }

  .num {
    font-size: 1.5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .chart-head {
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  svg {
    width: 100%;
    height: auto;
    display: block;
  }

  rect {
    fill: var(--accent);
    opacity: 0.55;
  }

  rect.today {
    opacity: 1;
  }

  .axis {
    stroke: var(--border);
  }

  .lbl {
    font-size: 9px;
    fill: var(--muted);
  }
</style>
