import Dexie, { type EntityTable } from 'dexie'
import type { Card as FsrsCard } from 'ts-fsrs'

export interface Deck {
  id: number
  name: string
  frontLang: string
  backLang: string
  createdAt: number
}

export interface Card {
  id: number
  deckId: number
  front: string
  back: string
  context: string
  frontLang: string
  backLang: string
  createdAt: number
  /** Mirrors fsrs.due as epoch ms, indexed for queue queries. */
  due: number
  /** Mirrors fsrs.state (0 New, 1 Learning, 2 Review, 3 Relearning). */
  state: number
  fsrs: FsrsCard
}

export interface Review {
  id: number
  cardId: number
  deckId: number
  rating: number
  /** Card state before this review; 0 means the card was new. */
  prevState: number
  reviewedAt: number
}

export class FlashcardsDB extends Dexie {
  decks!: EntityTable<Deck, 'id'>
  cards!: EntityTable<Card, 'id'>
  reviews!: EntityTable<Review, 'id'>

  constructor(name = 'flashcards') {
    super(name)
    this.version(1).stores({
      decks: '++id, name, createdAt',
      cards: '++id, deckId, [deckId+state], [deckId+due], due, state, createdAt',
      reviews: '++id, cardId, deckId, reviewedAt, [deckId+reviewedAt]',
    })
  }
}

export const db = new FlashcardsDB()
