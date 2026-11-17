<script lang="ts">
  import { db } from '../lib/db'
  import Icon from '../lib/Icon.svelte'
  import { deckCounts } from '../lib/scheduler'
  import { settings } from '../lib/settings.svelte'
  import { clock, go, live } from '../lib/state.svelte'
  import { computeStats } from '../lib/stats'

  const LANGS = [
    { value: 'es-AR', label: 'Español' },
    { value: 'en-US', label: 'Inglés (EE. UU.)' },
    { value: 'en-GB', label: 'Inglés (Reino Unido)' },
  ]

  const decks = live(
    () => ({ now: clock.now, newPerDay: settings.newPerDay, maxReviewsPerDay: settings.maxReviewsPerDay, retention: settings.retention }),
    async (limits) => {
      const list = await db.decks.orderBy('createdAt').toArray()
      return Promise.all(list.map(async (deck) => ({ deck, counts: await deckCounts(db, deck.id, limits, limits.now) })))
    },
    [],
  )

  const stats = live(() => clock.now, (now) => computeStats(db, now), null)

  const pendingToday = $derived(
    decks.value.reduce((sum, d) => sum + d.counts.newAvailable + d.counts.learning + d.counts.reviews, 0),
  )

  let creating = $state(false)
  let name = $state('')
  let frontLang = $state('es-AR')
  let backLang = $state('en-US')

  async function createDeck(e: SubmitEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const id = await db.decks.add({ name: trimmed, frontLang, backLang, createdAt: Date.now() } as never)
    name = ''
    creating = false
    go(`/deck/${id}`)
  }
</script>

<div class="page">
  <header class="row">
    <div>
      <p class="muted small">Flashcards</p>
      <h1>Tus mazos</h1>
    </div>
    <span class="spacer"></span>
    {#if stats.value}
      <div class="streak" class:active={stats.value.studiedToday} title="Racha de días seguidos">
        <Icon name="flame" size={20} />
        <span>{stats.value.streak}</span>
      </div>
    {/if}
  </header>

  {#if decks.loaded && decks.value.length > 0}
    <section class="card today">
      {#if pendingToday > 0}
        <p class="muted small">Para hoy</p>
        <p class="today-count">{pendingToday} {pendingToday === 1 ? 'tarjeta' : 'tarjetas'}</p>
      {:else}
        <p class="today-count done"><Icon name="check" /> Todo al día</p>
        <p class="muted small">Volvé mañana o agregá tarjetas nuevas.</p>
      {/if}
    </section>
  {/if}

  {#if decks.loaded && decks.value.length === 0 && !creating}
    <section class="card empty">
      <h2>Creá tu primer mazo</h2>
      <p class="muted">Por ejemplo: "Inglés para entrevistas". Después le agregás tarjetas y empezás a repasar.</p>
      <button class="btn primary" onclick={() => (creating = true)}><Icon name="plus" /> Nuevo mazo</button>
    </section>
  {/if}

  <ul class="decks">
    {#each decks.value as { deck, counts } (deck.id)}
      {@const pending = counts.newAvailable + counts.learning + counts.reviews}
      <li class="card deck">
        <button class="deck-main" onclick={() => go(`/deck/${deck.id}`)}>
          <h2>{deck.name}</h2>
          <div class="counts small">
            <span class="c-new" title="Nuevas">{counts.newAvailable} nuevas</span>
            <span class="c-learn" title="Aprendiendo">{counts.learning} aprendiendo</span>
            <span class="c-review" title="Repasos">{counts.reviews} repasos</span>
          </div>
        </button>
        <button class="btn primary" disabled={pending === 0} onclick={() => go(`/study/${deck.id}`)}>
          Estudiar
        </button>
      </li>
    {/each}
  </ul>

  {#if creating}
    <form class="card form" onsubmit={createDeck}>
      <h2>Nuevo mazo</h2>
      <label class="field">
        <span>Nombre</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input type="text" bind:value={name} placeholder="Inglés para entrevistas" autofocus />
      </label>
      <div class="langs">
        <label class="field">
          <span>Idioma del frente</span>
          <select bind:value={frontLang}>
            {#each LANGS as l (l.value)}<option value={l.value}>{l.label}</option>{/each}
          </select>
        </label>
        <label class="field">
          <span>Idioma del dorso</span>
          <select bind:value={backLang}>
            {#each LANGS as l (l.value)}<option value={l.value}>{l.label}</option>{/each}
          </select>
        </label>
      </div>
      <div class="row">
        <button type="button" class="btn ghost" onclick={() => (creating = false)}>Cancelar</button>
        <span class="spacer"></span>
        <button type="submit" class="btn primary" disabled={!name.trim()}>Crear mazo</button>
      </div>
    </form>
  {:else if decks.value.length > 0}
    <button class="btn block" onclick={() => (creating = true)}><Icon name="plus" /> Nuevo mazo</button>
  {/if}
</div>

<style>
  .streak {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--muted);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  .streak.active {
    color: #ea580c;
    border-color: #fed7aa;
    background: #fff7ed;
  }

  @media (prefers-color-scheme: dark) {
    .streak.active {
      background: #3a2010;
      border-color: #7c3a12;
      color: #fb923c;
    }
  }

  .today-count {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .today-count.done {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--review);
  }

  .decks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .deck {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px 16px;
  }

  .deck-main {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: none;
    border: none;
    padding: 4px 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .deck-main h2 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .deck .counts {
    flex-wrap: wrap;
    gap: 4px 10px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .langs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
</style>
