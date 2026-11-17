<script lang="ts">
  type Name =
    | 'cards'
    | 'chart'
    | 'settings'
    | 'plus'
    | 'back'
    | 'trash'
    | 'edit'
    | 'volume'
    | 'close'
    | 'undo'
    | 'flame'
    | 'check'
    | 'search'

  let { name, size = 22 }: { name: Name; size?: number } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'cards'}
    <rect x="3" y="6" width="14" height="15" rx="2" /><path d="M7 3h12a2 2 0 0 1 2 2v12" />
  {:else if name === 'chart'}
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  {:else if name === 'settings'}
    <circle cx="12" cy="12" r="3" /><path
      d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
    />
  {:else if name === 'plus'}
    <path d="M12 5v14M5 12h14" />
  {:else if name === 'back'}
    <path d="M15 18l-6-6 6-6" />
  {:else if name === 'trash'}
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  {:else if name === 'edit'}
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
  {:else if name === 'volume'}
    <path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
  {:else if name === 'close'}
    <path d="M18 6L6 18M6 6l12 12" />
  {:else if name === 'undo'}
    <path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  {:else if name === 'flame'}
    <path
      d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3.2.3 1.6 1.4 2.7 2.5 2.7z"
    />
  {:else if name === 'check'}
    <path d="M20 6L9 17l-5-5" />
  {:else if name === 'search'}
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  {/if}
</svg>
