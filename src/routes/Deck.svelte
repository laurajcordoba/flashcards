<script lang="ts">
  import CardForm from '../lib/CardForm.svelte'
  import { db, type Card } from '../lib/db'
  import Icon from '../lib/Icon.svelte'
  import { addCard, deckCounts, formatInterval, State } from '../lib/scheduler'
  import { settings } from '../lib/settings.svelte'
  import { clock, go, live } from '../lib/state.svelte'

  let { deckId }: { deckId: number } = $props()

  const LANG_NAMES: Record<string, string> = {
    'es-AR': 'Español',
    'en-US': 'Inglés',
    'en-GB': 'Inglés',
  }

  const deck = live(() => deckId, (id) => db.decks.get(id), undefined)
  const cards = live(() => deckId, (id) => db.cards.where('deckId').equals(id).reverse().sortBy('createdAt'), [] as Card[])
  const counts = live(
    () => ({ id: deckId, now: clock.now, newPerDay: settings.newPerDay, maxReviewsPerDay: settings.maxReviewsPerDay, retention: settings.retention }),
    (d) => deckCounts(db, d.id, d, d.now),
    null,
  )

  let adding = $state(false)
  let editingId = $state<number | null>(null)
  let query = $state('')
  let renaming = $state(false)
  let newName = $state('')

  const pending = $derived(counts.value ? counts.value.newAvailable + counts.value.learning + counts.value.reviews : 0)
  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cards.value
    return cards.value.filter((c) => `${c.front} ${c.back} ${c.context}`.toLowerCase().includes(q))
  })

  function statusOf(c: Card): { label: string; cls: string } {
    if (c.state === State.New) return { label: 'Nueva', cls: 'c-new' }
    const inMs = c.due - clock.now
    const when = inMs <= 0 ? 'hoy' : `en ${formatInterval(inMs)}`
    if (c.state === State.Review) return { label: `Repaso ${when}`, cls: 'c-review' }
    return { label: `Aprendiendo · ${when}`, cls: 'c-learn' }
  }

  async function saveNew(v: { front: string; back: string; context: string; reversed: boolean }) {
    const d = deck.value
    if (!d) return
    await addCard(db, { deckId: d.id, front: v.front, back: v.back, context: v.context, frontLang: d.frontLang, backLang: d.backLang }, v.reversed)
  }

  async function saveEdit(id: number, v: { front: string; back: string; context: string }) {
    await db.cards.update(id, { front: v.front, back: v.back, context: v.context })
    editingId = null
  }

  async function removeCard(c: Card) {
    if (!confirm(`¿Borrar la tarjeta "${c.front}"?`)) return
    await db.transaction('rw', db.cards, db.reviews, async () => {
      await db.reviews.where('cardId').equals(c.id).delete()
      await db.cards.delete(c.id)
    })
  }

  async function rename(e: SubmitEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await db.decks.update(deckId, { name: newName.trim() })
    renaming = false
  }

  async function removeDeck() {
    const n = cards.value.length
    if (!confirm(`¿Borrar el mazo "${deck.value?.name}" y sus ${n} tarjetas? No se puede deshacer.`)) return
    await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
      await db.reviews.where('deckId').equals(deckId).delete()
      await db.cards.where('deckId').equals(deckId).delete()
      await db.decks.delete(deckId)
    })
    go('/')
  }
</script>

<div class="page">
  <header class="row">
    <button class="icon-btn" aria-label="Volver" onclick={() => go('/')}><Icon name="back" /></button>
    {#if renaming}
      <form class="row grow" onsubmit={rename}>
        <!-- svelte-ignore a11y_autofocus -->
        <input type="text" bind:value={newName} autofocus />
        <button class="btn primary" type="submit">Guardar</button>
      </form>
    {:else}
      <h1 class="grow title">{deck.value?.name ?? ''}</h1>
      <button class="icon-btn" aria-label="Renombrar mazo" onclick={() => { newName = deck.value?.name ?? ''; renaming = true }}>
        <Icon name="edit" size={20} />
      </button>
      <button class="icon-btn" aria-label="Borrar mazo" onclick={removeDeck}><Icon name="trash" size={20} /></button>
    {/if}
  </header>

  {#if deck.loaded && !deck.value}
    <section class="card empty"><p>Este mazo no existe.</p><button class="btn" onclick={() => go('/')}>Volver</button></section>
  {:else}
    <section class="card study">
      {#if counts.value}
        <div class="counts">
          <div><span class="num c-new">{counts.value.newAvailable}</span><span class="muted small">nuevas</span></div>
          <div><span class="num c-learn">{counts.value.learning}</span><span class="muted small">aprendiendo</span></div>
          <div><span class="num c-review">{counts.value.reviews}</span><span class="muted small">repasos</span></div>
        </div>
      {/if}
      <button class="btn primary big block" disabled={pending === 0} onclick={() => go(`/study/${deckId}`)}>
        {pending === 0 ? 'Nada pendiente por ahora' : 'Estudiar ahora'}
      </button>
    </section>

    {#if adding}
      <section class="card">
        <div class="row form-head">
          <h2>Nueva tarjeta</h2>
          <span class="spacer"></span>
          <button class="icon-btn" aria-label="Cerrar" onclick={() => (adding = false)}><Icon name="close" size={20} /></button>
        </div>
        <CardForm
          frontLabel={`Frente (${LANG_NAMES[deck.value?.frontLang ?? ''] ?? 'frente'})`}
          backLabel={`Dorso (${LANG_NAMES[deck.value?.backLang ?? ''] ?? 'dorso'})`}
          submitLabel="Agregar"
          onsubmit={saveNew}
        />
        <p class="muted small hint">Al agregar, el formulario queda abierto para cargar la siguiente.</p>
      </section>
    {:else}
      <button class="btn block" onclick={() => (adding = true)}><Icon name="plus" /> Agregar tarjeta</button>
    {/if}

    <section class="list-head row">
      <h2>{cards.value.length} {cards.value.length === 1 ? 'tarjeta' : 'tarjetas'}</h2>
    </section>

    {#if cards.value.length > 5}
      <label class="search">
        <Icon name="search" size={18} />
        <input type="search" bind:value={query} placeholder="Buscar tarjetas" />
      </label>
    {/if}

    <ul class="cards">
      {#each filtered as c (c.id)}
        <li class="card item">
          {#if editingId === c.id}
            <CardForm
              initial={{ front: c.front, back: c.back, context: c.context, reversed: false }}
              frontLabel="Frente"
              backLabel="Dorso"
              submitLabel="Guardar"
              showReversed={false}
              onsubmit={(v) => saveEdit(c.id, v)}
              oncancel={() => (editingId = null)}
            />
          {:else}
            {@const st = statusOf(c)}
            <div class="item-text">
              <p class="front">{c.front}</p>
              <p class="back">{c.back}</p>
              <p class="small {st.cls}">{st.label}</p>
            </div>
            <div class="item-actions">
              <button class="icon-btn" aria-label="Editar" onclick={() => (editingId = c.id)}><Icon name="edit" size={18} /></button>
              <button class="icon-btn" aria-label="Borrar" onclick={() => removeCard(c)}><Icon name="trash" size={18} /></button>
            </div>
          {/if}
        </li>
      {:else}
        {#if cards.loaded}
          <li class="muted small none">{query ? 'Ninguna tarjeta coincide con la búsqueda.' : 'Todavía no hay tarjetas en este mazo.'}</li>
        {/if}
      {/each}
    </ul>
  {/if}
</div>

<style>
  header {
    margin-left: -8px;
  }

  .grow {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 1.35rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .study {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .study .counts {
    justify-content: space-around;
    text-align: center;
  }

  .study .counts div {
    display: flex;
    flex-direction: column;
  }

  .num {
    font-size: 1.6rem;
    font-weight: 700;
  }

  .form-head {
    margin-bottom: 8px;
  }

  .hint {
    margin-top: 10px;
  }

  .list-head {
    margin-top: 8px;
  }

  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 12px;
    border-radius: 12px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    color: var(--muted);
  }

  .search input {
    border: none;
    background: transparent;
    padding-left: 0;
  }

  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .item {
    display: flex;
    gap: 8px;
    padding: 12px 8px 12px 16px;
  }

  .item:has(:global(form)) {
    display: block;
    padding: 16px;
  }

  .item-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .front {
    font-weight: 600;
  }

  .back {
    color: var(--muted);
  }

  .item-actions {
    display: flex;
    flex-direction: column;
  }

  .none {
    padding: 12px 4px;
  }
</style>
