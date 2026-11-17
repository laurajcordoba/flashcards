<script lang="ts">
  type Values = { front: string; back: string; context: string; reversed: boolean }

  let {
    initial = { front: '', back: '', context: '', reversed: false },
    frontLabel,
    backLabel,
    submitLabel,
    showReversed = true,
    onsubmit,
    oncancel,
  }: {
    initial?: Values
    frontLabel: string
    backLabel: string
    submitLabel: string
    showReversed?: boolean
    onsubmit: (v: Values) => Promise<void> | void
    oncancel?: () => void
  } = $props()

  // svelte-ignore state_referenced_locally
  let values = $state({ ...initial })
  let frontInput: HTMLTextAreaElement | undefined = $state()
  const valid = $derived(values.front.trim() !== '' && values.back.trim() !== '')

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!valid) return
    await onsubmit({
      front: values.front.trim(),
      back: values.back.trim(),
      context: values.context.trim(),
      reversed: values.reversed,
    })
    values = { front: '', back: '', context: '', reversed: values.reversed }
    frontInput?.focus()
  }
</script>

<form class="form" onsubmit={submit}>
  <label class="field">
    <span>{frontLabel}</span>
    <textarea bind:this={frontInput} bind:value={values.front} rows="2" placeholder="Depende del cliente"></textarea>
  </label>
  <label class="field">
    <span>{backLabel}</span>
    <textarea bind:value={values.back} rows="2" placeholder="It depends on the client"></textarea>
  </label>
  <label class="field">
    <span>Contexto (opcional)</span>
    <input type="text" bind:value={values.context} placeholder="Entrevista, hablando de prioridades" />
  </label>
  {#if showReversed}
    <label class="check">
      <input type="checkbox" bind:checked={values.reversed} />
      Crear también la tarjeta inversa
    </label>
  {/if}
  <div class="row">
    {#if oncancel}
      <button type="button" class="btn ghost" onclick={oncancel}>Cancelar</button>
    {/if}
    <span class="spacer"></span>
    <button type="submit" class="btn primary" disabled={!valid}>{submitLabel}</button>
  </div>
</form>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>
