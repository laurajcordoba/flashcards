import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FlashcardsDB } from './db'
import { addCard, answer, deckCounts, formatInterval, nextCard, Rating, State, undo, type Grade } from './scheduler'
import { computeStats, computeStreak, dayKey } from './stats'

const limits = { newPerDay: 2, maxReviewsPerDay: 100, retention: 0.9 }
const T0 = new Date(2026, 10, 17, 10, 0, 0).getTime()
const MIN = 60_000
const DAY = 24 * 60 * MIN

let db: FlashcardsDB
let deckId: number

beforeEach(async () => {
  db = new FlashcardsDB(`test-${Math.random()}`)
  deckId = (await db.decks.add({ name: 'Inglés', frontLang: 'es-AR', backLang: 'en-US', createdAt: T0 } as never)) as number
  for (const [front, back] of [
    ['Depende del cliente', 'It depends on the client'],
    ['Estoy de acuerdo', 'I agree'],
    ['Actualmente', 'Currently'],
  ]) {
    await addCard(db, { deckId, front, back, context: '', frontLang: 'es-AR', backLang: 'en-US' }, false, T0)
  }
})

afterEach(async () => {
  db.close()
  await db.delete()
})

describe('scheduler', () => {
  it('limits new cards per day', async () => {
    const counts = await deckCounts(db, deckId, limits, T0)
    expect(counts).toMatchObject({ newAvailable: 2, learning: 0, reviews: 0, newTotal: 3 })

    for (let i = 0; i < 2; i++) {
      const c = await nextCard(db, deckId, limits, T0 + i)
      expect(c?.state).toBe(State.New)
      await answer(db, c!, Rating.Good as Grade, 0.9, T0 + i)
    }
    const after = await deckCounts(db, deckId, limits, T0 + 10)
    expect(after.newAvailable).toBe(0)
    expect(after.newTotal).toBe(1)
  })

  it('shows learning cards again within the learn-ahead window, then finishes', async () => {
    const first = (await nextCard(db, deckId, { ...limits, newPerDay: 1 }, T0))!
    await answer(db, first, Rating.Good as Grade, 0.9, T0)
    // Good on a new card schedules a ~10 min learning step: still in this session.
    const again = await nextCard(db, deckId, { ...limits, newPerDay: 1 }, T0 + MIN)
    expect(again?.id).toBe(first.id)
    await answer(db, again!, Rating.Easy as Grade, 0.9, T0 + MIN)
    expect(await nextCard(db, deckId, { ...limits, newPerDay: 1 }, T0 + 2 * MIN)).toBeNull()
  })

  it('brings review cards back once due and respects the review limit', async () => {
    const c = (await nextCard(db, deckId, limits, T0))!
    await answer(db, c, Rating.Easy as Grade, 0.9, T0)
    const stored = (await db.cards.get(c.id))!
    expect(stored.state).toBe(State.Review)
    expect(stored.due).toBeGreaterThan(T0 + DAY)

    const later = stored.due + MIN
    const counts = await deckCounts(db, deckId, limits, later)
    expect(counts.reviews).toBe(1)
    const none = await deckCounts(db, deckId, { ...limits, maxReviewsPerDay: 0 }, later)
    expect(none.reviews).toBe(0)
  })

  it('undo restores the card and removes the review', async () => {
    const c = (await nextCard(db, deckId, limits, T0))!
    const entry = await answer(db, c, Rating.Again as Grade, 0.9, T0)
    expect(await db.reviews.count()).toBe(1)
    await undo(db, entry)
    expect(await db.reviews.count()).toBe(0)
    expect((await db.cards.get(c.id))!.state).toBe(State.New)
  })

  it('creates the reversed card', async () => {
    await addCard(db, { deckId, front: 'Sin embargo', back: 'However', context: '', frontLang: 'es-AR', backLang: 'en-US' }, true, T0)
    const rev = await db.cards.filter((c) => c.front === 'However').first()
    expect(rev).toMatchObject({ back: 'Sin embargo', frontLang: 'en-US', backLang: 'es-AR' })
  })

  it('formats intervals in Spanish', () => {
    expect(formatInterval(10 * MIN)).toBe('10 min')
    expect(formatInterval(3 * 60 * MIN)).toBe('3 h')
    expect(formatInterval(4 * DAY)).toBe('4 d')
    expect(formatInterval(60 * DAY)).toBe('2 meses')
  })
})

describe('stats', () => {
  it('counts a streak that includes today or ended yesterday', () => {
    const today = T0
    const days = (offsets: number[]) => new Set(offsets.map((o) => dayKey(today - o * DAY)))
    expect(computeStreak(days([0, 1, 2]), today)).toBe(3)
    expect(computeStreak(days([1, 2]), today)).toBe(2)
    expect(computeStreak(days([2, 3]), today)).toBe(0)
    expect(computeStreak(new Set(), today)).toBe(0)
  })

  it('summarizes reviews', async () => {
    const c = (await nextCard(db, deckId, limits, T0))!
    await answer(db, c, Rating.Good as Grade, 0.9, T0)
    const s = await computeStats(db, T0 + MIN)
    expect(s).toMatchObject({ streak: 1, studiedToday: true, reviewsToday: 1, totalCards: 3, newCards: 2 })
    expect(s.last30).toHaveLength(30)
    expect(s.last30.at(-1)?.count).toBe(1)
  })
})
