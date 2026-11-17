import type { Card, Deck, FlashcardsDB, Review } from './db'
import type { Settings } from './settings.svelte'

export interface Backup {
  app: 'flashcards'
  version: 1
  exportedAt: string
  settings: Settings
  decks: Deck[]
  cards: Card[]
  reviews: Review[]
}

export async function exportBackup(db: FlashcardsDB, settings: Settings): Promise<Backup> {
  const [decks, cards, reviews] = await Promise.all([db.decks.toArray(), db.cards.toArray(), db.reviews.toArray()])
  return { app: 'flashcards', version: 1, exportedAt: new Date().toISOString(), settings, decks, cards, reviews }
}

function reviveCard(c: Card): Card {
  const f = c.fsrs
  return {
    ...c,
    fsrs: {
      ...f,
      due: new Date(f.due),
      last_review: f.last_review ? new Date(f.last_review) : undefined,
    },
  }
}

export function parseBackup(text: string): Backup {
  const data = JSON.parse(text)
  if (data?.app !== 'flashcards' || data.version !== 1 || !Array.isArray(data.cards)) {
    throw new Error('El archivo no es un backup de esta app.')
  }
  return { ...data, cards: data.cards.map(reviveCard) }
}

/** Replaces everything in the database with the backup's contents. */
export async function restoreBackup(db: FlashcardsDB, backup: Backup) {
  await db.transaction('rw', db.decks, db.cards, db.reviews, async () => {
    await Promise.all([db.decks.clear(), db.cards.clear(), db.reviews.clear()])
    await db.decks.bulkAdd(backup.decks)
    await db.cards.bulkAdd(backup.cards)
    await db.reviews.bulkAdd(backup.reviews)
  })
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
