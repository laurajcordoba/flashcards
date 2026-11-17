import { liveQuery } from 'dexie'

export type Route =
  | { name: 'home' }
  | { name: 'deck'; deckId: number }
  | { name: 'study'; deckId: number }
  | { name: 'stats' }
  | { name: 'settings' }

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/')
  const id = Number(parts[1])
  if (parts[0] === 'deck' && id) return { name: 'deck', deckId: id }
  if (parts[0] === 'study' && id) return { name: 'study', deckId: id }
  if (parts[0] === 'stats') return { name: 'stats' }
  if (parts[0] === 'settings') return { name: 'settings' }
  return { name: 'home' }
}

export const router = $state({ route: parse(location.hash) })

window.addEventListener('hashchange', () => {
  router.route = parse(location.hash)
  window.scrollTo(0, 0)
})

export function go(path: string) {
  location.hash = path
}

/** A clock that ticks every 30 s so due counts stay fresh. */
export const clock = $state({ now: Date.now() })
setInterval(() => (clock.now = Date.now()), 30_000)

/**
 * Subscribes to a Dexie live query for as long as the calling component lives.
 * Reactive values read in `deps` re-run the query when they change; the query
 * also re-runs whenever the tables it reads change.
 */
export function live<T, D = void>(deps: () => D, query: (d: D) => Promise<T> | T, initial: T) {
  const box = $state({ value: initial, loaded: false })
  $effect(() => {
    const d = deps()
    const sub = liveQuery(() => query(d)).subscribe({
      next: (v) => {
        box.value = v
        box.loaded = true
      },
      error: (e) => console.error(e),
    })
    return () => sub.unsubscribe()
  })
  return box
}
