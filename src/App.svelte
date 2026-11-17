<script lang="ts">
  import Icon from './lib/Icon.svelte'
  import { router } from './lib/state.svelte'
  import Deck from './routes/Deck.svelte'
  import Home from './routes/Home.svelte'
  import Settings from './routes/Settings.svelte'
  import Stats from './routes/Stats.svelte'
  import Study from './routes/Study.svelte'

  const route = $derived(router.route)
  const tab = $derived(route.name === 'deck' ? 'home' : route.name)
</script>

{#if route.name === 'study'}
  {#key route.deckId}<Study deckId={route.deckId} />{/key}
{:else}
  <main>
    {#if route.name === 'home'}
      <Home />
    {:else if route.name === 'deck'}
      {#key route.deckId}<Deck deckId={route.deckId} />{/key}
    {:else if route.name === 'stats'}
      <Stats />
    {:else if route.name === 'settings'}
      <Settings />
    {/if}
  </main>

  <nav class="tabbar" aria-label="Secciones">
    <a href="#/" class:active={tab === 'home'}><Icon name="cards" /><span>Mazos</span></a>
    <a href="#/stats" class:active={tab === 'stats'}><Icon name="chart" /><span>Estadísticas</span></a>
    <a href="#/settings" class:active={tab === 'settings'}><Icon name="settings" /><span>Ajustes</span></a>
  </nav>
{/if}

<style>
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    display: flex;
    justify-content: center;
    gap: 8px;
    background: color-mix(in srgb, var(--surface) 88%, transparent);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
  }

  .tabbar a {
    flex: 0 1 140px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--muted);
    text-decoration: none;
  }

  .tabbar a.active {
    color: var(--accent);
  }
</style>
