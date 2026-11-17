<script lang="ts">
  import { onMount } from 'svelte'
  import { db, type Card } from '../lib/db'
  import Icon from '../lib/Icon.svelte'
  import { answer, deckCounts, nextCard, previewIntervals, Rating, undo, type Grade, type UndoEntry } from '../lib/scheduler'
  import { settings } from '../lib/settings.svelte'
  import { clock, go, live } from '../lib/state.svelte'
  import { computeStats } from '../lib/stats'
  import { speak, stopSpeaking, ttsSupported } from '../lib/tts'

  let { deckId }: { deckId: number } = $props()

  const deck = live(() => deckId, (id) => db.decks.get(id), undefined)
  const counts = live(
    () => ({ id: deckId, now: clock.now, newPerDay: settings.newPerDay, maxReviewsPerDay: settings.maxReviewsPerDay, retention: settings.retention }),
    (d) => deckCounts(db, d.id, d, Date.now()),
    null,
  )

  let card = $state<Card | null>(null)
  let loading = $state(true)
  let revealed = $state(false)
  let busy = $state(false)
  let history = $state<UndoEntry[]>([])
  let sessionCount = $state(0)
  let streak = $state<number | null>(null)

  const intervals = $derived(card ? previewIntervals(card, settings.retention, Date.now()) : null)

  const BUTTONS: { grade: Grade; label: string; cls: string; key: string }[] = [
    { grade: Rating.Again as Grade, label: 'Otra vez', cls: 'again', key: '1' },
    { grade: Rating.Hard as Grade, label: 'Difícil', cls: 'hard', key: '2' },
    { grade: Rating.Good as Grade, label: 'Bien', cls: 'good', key: '3' },
    { grade: Rating.Easy as Grade, label: 'Fácil', cls: 'easy', key: '4' },
  ]

  const isLearningLang = (lang: string) => !lang.startsWith('es')

  function say(text: string, lang: string) {
    speak(text, lang, { voiceName: settings.voiceName, rate: settings.speechRate })
  }

  async function load() {
    loading = true
    revealed = false
    card = await nextCard(db, deckId, settings, Date.now())
    loading = false
    if (card && settings.autoPlay && isLearningLang(card.frontLang)) say(card.front, card.frontLang)
    if (!card) {
      stopSpeaking()
      streak = (await computeStats(db, Date.now())).streak
    }
  }

  function reveal() {
    if (!card || revealed) return
    revealed = true
    if (settings.autoPlay && isLearningLang(card.backLang)) say(card.back, card.backLang)
  }

  async function rate(grade: Grade) {
    if (!card || !revealed || busy) return
    busy = true
    try {
      const entry = await answer(db, $state.snapshot(card) as Card, grade, settings.retention, Date.now())
      history = [...history, entry]
      sessionCount++
      await load()
    } finally {
      busy = false
    }
  }

  async function undoLast() {
    const entry = history.at(-1)
    if (!entry || busy) return
    busy = true
    try {
      await undo(db, entry)
      history = history.slice(0, -1)
      sessionCount = Math.max(0, sessionCount - 1)
      card = entry.before
      revealed = true
      streak = null
    } finally {
      busy = false
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault()
      reveal()
      return
    }
    if (revealed) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        rate(Rating.Good as Grade)
        return
      }
      const b = BUTTONS.find((x) => x.key === e.key)
      if (b) rate(b.grade)
    }
  }

  onMount(() => {
    load()
    return () => stopSpeaking()
  })
</script>

<svelte:window onkeydown={onKey} />

<div class="study">
  <header class="row">
    <button class="icon-btn" aria-label="Salir" onclick={() => go(`/deck/${deckId}`)}><Icon name="close" /></button>
    <p class="deck-name">{deck.value?.name ?? ''}</p>
    <span class="spacer"></span>
    {#if counts.value && card}
      <div class="counts small">
        <span class="c-new">{counts.value.newAvailable}</span>
        <span class="c-learn">{counts.value.learning}</span>
        <span class="c-review">{counts.value.reviews}</span>
      </div>
    {/if}
    <button class="icon-btn" aria-label="Deshacer" disabled={history.length === 0 || busy} onclick={undoLast}>
      <Icon name="undo" size={20} />
    </button>
  </header>

  {#if loading && !card}
    <div class="center muted">Cargando…</div>
  {:else if !card}
    <div class="center done">
      <div class="done-icon"><Icon name="check" size={36} /></div>
      <h1>¡Listo por ahora!</h1>
      <p class="muted">
        {#if sessionCount > 0}Repasaste {sessionCount} {sessionCount === 1 ? 'tarjeta' : 'tarjetas'} en esta sesión.{:else}No hay tarjetas pendientes en este mazo.{/if}
      </p>
      {#if streak !== null && streak > 0}
        <p class="streak"><Icon name="flame" size={20} /> {streak === 1 ? '1 día de racha' : `${streak} días seguidos`}</p>
      {/if}
      <button class="btn primary" onclick={() => go('/')}>Volver a los mazos</button>
    </div>
  {:else}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="flash card" onclick={reveal}>
      <div class="side">
        <p class="text front">{card.front}</p>
        {#if ttsSupported}
          <button class="icon-btn speak" aria-label="Escuchar" onclick={(e) => { e.stopPropagation(); say(card!.front, card!.frontLang) }}>
            <Icon name="volume" size={20} />
          </button>
        {/if}
      </div>
      {#if card.context}
        <p class="context muted small">{card.context}</p>
      {/if}
      {#if revealed}
        <hr />
        <div class="side">
          <p class="text back">{card.back}</p>
          {#if ttsSupported}
            <button class="icon-btn speak" aria-label="Escuchar" onclick={(e) => { e.stopPropagation(); say(card!.back, card!.backLang) }}>
              <Icon name="volume" size={20} />
            </button>
          {/if}
        </div>
      {:else}
        <p class="tap muted small">Pensá la respuesta y tocá para verla</p>
      {/if}
    </div>

    <footer class="actions">
      {#if !revealed}
        <button class="btn primary big block" onclick={reveal}>Mostrar respuesta</button>
      {:else}
        <div class="grades">
          {#each BUTTONS as b (b.grade)}
            <button class="grade {b.cls}" disabled={busy} onclick={() => rate(b.grade)}>
              <span class="ivl">{intervals?.[b.grade]}</span>
              <span class="lbl">{b.label}</span>
            </button>
          {/each}
        </div>
      {/if}
    </footer>
  {/if}
</div>

<style>
  .study {
    max-width: 560px;
    margin: 0 auto;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: max(12px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
  }

  header {
    margin-left: -8px;
  }

  .deck-name {
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 12px;
  }

  .done-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--accent-soft);
    color: var(--accent);
  }

  .streak {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: #ea580c;
  }

  .flash {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 16px;
    padding: 28px 20px;
    cursor: pointer;
    user-select: text;
  }

  .side {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    justify-content: center;
  }

  .text {
    font-size: 1.45rem;
    font-weight: 600;
    text-align: center;
    line-height: 1.35;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .back {
    color: var(--accent);
  }

  .speak {
    flex-shrink: 0;
  }

  .context {
    text-align: center;
    font-style: italic;
  }

  .tap {
    text-align: center;
  }

  hr {
    width: 100%;
    border: none;
    border-top: 1px dashed var(--border);
    margin: 4px 0;
  }

  .grades {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .grade {
    min-height: 64px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-weight: 650;
  }

  .grade:active {
    transform: scale(0.97);
  }

  .ivl {
    font-size: 0.78rem;
    color: var(--muted);
    font-weight: 500;
  }

  .again .lbl {
    color: var(--again);
  }

  .hard .lbl {
    color: var(--hard);
  }

  .good .lbl {
    color: var(--good);
  }

  .easy .lbl {
    color: var(--easy);
  }
</style>
