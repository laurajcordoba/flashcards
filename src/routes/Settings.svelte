<script lang="ts">
  import { exportBackup, downloadJson, parseBackup, restoreBackup } from '../lib/backup'
  import { db } from '../lib/db'
  import { replaceSettings, saveSettings, settings } from '../lib/settings.svelte'
  import { onVoicesChanged, speak, ttsSupported, voicesFor } from '../lib/tts'
  import { dayKey } from '../lib/stats'

  let voices = $state<SpeechSynthesisVoice[]>([])
  let message = $state('')
  let fileInput: HTMLInputElement | undefined = $state()

  $effect(() => onVoicesChanged(() => (voices = voicesFor('en'))))

  function clamp(n: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, Math.round(n || 0)))
  }

  function commit() {
    settings.newPerDay = clamp(settings.newPerDay, 0, 200)
    settings.maxReviewsPerDay = clamp(settings.maxReviewsPerDay, 0, 2000)
    saveSettings()
  }

  async function doExport() {
    const backup = await exportBackup(db, $state.snapshot(settings))
    downloadJson(backup, `flashcards-backup-${dayKey(Date.now())}.json`)
    message = `Backup descargado: ${backup.cards.length} tarjetas.`
  }

  async function doImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      const ok = confirm(
        `Esto reemplaza TODO lo que hay ahora por el backup (${backup.decks.length} mazos, ${backup.cards.length} tarjetas). ¿Seguir?`,
      )
      if (!ok) return
      await restoreBackup(db, backup)
      replaceSettings(backup.settings)
      message = 'Backup restaurado.'
    } catch (err) {
      message = err instanceof Error ? err.message : 'No se pudo leer el archivo.'
    } finally {
      if (fileInput) fileInput.value = ''
    }
  }
</script>

<div class="page">
  <header><h1>Ajustes</h1></header>

  <section class="card group">
    <h2>Repaso diario</h2>
    <label class="field">
      <span>Tarjetas nuevas por día (por mazo)</span>
      <input type="number" min="0" max="200" inputmode="numeric" bind:value={settings.newPerDay} onchange={commit} />
    </label>
    <label class="field">
      <span>Máximo de repasos por día (por mazo)</span>
      <input type="number" min="0" max="2000" inputmode="numeric" bind:value={settings.maxReviewsPerDay} onchange={commit} />
    </label>
    <label class="field">
      <span>Retención deseada: {Math.round(settings.retention * 100)}%</span>
      <input type="range" min="0.8" max="0.97" step="0.01" bind:value={settings.retention} onchange={commit} />
      <p class="muted small">Más alta = recordás más, pero repasás más seguido. 90% es lo recomendado.</p>
    </label>
  </section>

  <section class="card group">
    <h2>Pronunciación</h2>
    {#if !ttsSupported}
      <p class="muted small">Este navegador no tiene voz sintetizada.</p>
    {:else}
      <label class="check">
        <input type="checkbox" bind:checked={settings.autoPlay} onchange={commit} />
        Reproducir el inglés automáticamente
      </label>
      <label class="field">
        <span>Voz en inglés</span>
        <select bind:value={settings.voiceName} onchange={commit}>
          <option value="">Automática</option>
          {#each voices as v (v.name)}
            <option value={v.name}>{v.name} ({v.lang})</option>
          {/each}
        </select>
      </label>
      <label class="field">
        <span>Velocidad: {settings.speechRate.toFixed(2)}×</span>
        <input type="range" min="0.6" max="1.3" step="0.05" bind:value={settings.speechRate} onchange={commit} />
      </label>
      <button
        class="btn"
        onclick={() => speak("It depends on the client's priorities.", 'en-US', { voiceName: settings.voiceName, rate: settings.speechRate })}
      >
        Probar voz
      </button>
    {/if}
  </section>

  <section class="card group">
    <h2>Backup</h2>
    <p class="muted small">
      Tus tarjetas viven solo en este dispositivo. Descargá un backup de vez en cuando, sobre todo antes de cambiar de celular o borrar los datos del navegador.
    </p>
    <div class="row wrap">
      <button class="btn primary" onclick={doExport}>Descargar backup</button>
      <button class="btn" onclick={() => fileInput?.click()}>Restaurar backup</button>
      <input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={doImport} />
    </div>
    {#if message}<p class="small msg">{message}</p>{/if}
  </section>

  <section class="card group">
    <h2>Instalar en el celular</h2>
    <p class="muted small"><strong>iPhone (Safari):</strong> botón Compartir → "Agregar a inicio".</p>
    <p class="muted small"><strong>Android (Chrome):</strong> menú ⋮ → "Instalar app" o "Agregar a la pantalla principal".</p>
    <p class="muted small">Una vez instalada funciona sin internet.</p>
  </section>
</div>

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .wrap {
    flex-wrap: wrap;
  }

  input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }

  .msg {
    color: var(--accent);
    font-weight: 600;
  }
</style>
