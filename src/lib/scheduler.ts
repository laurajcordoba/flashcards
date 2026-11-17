import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Grade } from 'ts-fsrs'
import type { Card, FlashcardsDB } from './db'

export { Rating, State }
export type { Grade }

export interface Limits {
  newPerDay: number
  maxReviewsPerDay: number
  retention: number
}

/** Learning cards due within this window are shown when nothing else is left. */
export const LEARN_AHEAD_MS = 20 * 60 * 1000

export function startOfDay(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function scheduler(retention: number) {
  return fsrs(generatorParameters({ request_retention: retention, enable_fuzz: true }))
}

export async function todayCounts(db: FlashcardsDB, deckId: number, now: number) {
  const reviews = await db.reviews
    .where('[deckId+reviewedAt]')
    .between([deckId, startOfDay(now)], [deckId, now + 1])
    .toArray()
  return {
    newDone: reviews.filter((r) => r.prevState === State.New).length,
    reviewsDone: reviews.filter((r) => r.prevState === State.Review).length,
  }
}

async function dueCards(db: FlashcardsDB, deckId: number, until: number) {
  return db.cards
    .where('[deckId+due]')
    .between([deckId, 0], [deckId, until], true, true)
    .filter((c) => c.state !== State.New)
    .toArray()
}

export async function deckCounts(db: FlashcardsDB, deckId: number, limits: Limits, now: number) {
  const [{ newDone, reviewsDone }, due, newTotal] = await Promise.all([
    todayCounts(db, deckId, now),
    dueCards(db, deckId, now),
    db.cards.where('[deckId+state]').equals([deckId, State.New]).count(),
  ])
  const learning = due.filter((c) => c.state !== State.Review).length
  const reviews = due.length - learning
  const reviewRoom = Math.max(0, limits.maxReviewsPerDay - reviewsDone)
  const newRoom = Math.max(0, limits.newPerDay - newDone)
  return {
    newAvailable: Math.min(newTotal, newRoom),
    learning,
    reviews: Math.min(reviews, reviewRoom),
    newTotal,
  }
}

export async function nextCard(db: FlashcardsDB, deckId: number, limits: Limits, now: number): Promise<Card | null> {
  const { newDone, reviewsDone } = await todayCounts(db, deckId, now)
  const due = (await dueCards(db, deckId, now)).sort((a, b) => a.due - b.due)

  const learningDue = due.find((c) => c.state !== State.Review)
  if (learningDue) return learningDue

  if (reviewsDone < limits.maxReviewsPerDay) {
    const review = due.find((c) => c.state === State.Review)
    if (review) return review
  }

  if (newDone < limits.newPerDay) {
    const fresh = await db.cards
      .where('[deckId+state]')
      .equals([deckId, State.New])
      .sortBy('createdAt')
    if (fresh.length) return fresh[0]
  }

  const ahead = (await dueCards(db, deckId, now + LEARN_AHEAD_MS))
    .filter((c) => c.state === State.Learning || c.state === State.Relearning)
    .sort((a, b) => a.due - b.due)
  return ahead[0] ?? null
}

export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.round(h / 24)
  if (d < 30) return `${d} d`
  const months = Math.round(d / 30)
  if (d < 365) return `${months} ${months === 1 ? 'mes' : 'meses'}`
  const years = Math.round((d / 365) * 10) / 10
  return `${years} ${years === 1 ? 'año' : 'años'}`
}

export function previewIntervals(card: Card, retention: number, now: number): Record<Grade, string> {
  const result = scheduler(retention).repeat(card.fsrs, new Date(now))
  const grades = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]
  return Object.fromEntries(
    grades.map((g) => [g, formatInterval(result[g].card.due.getTime() - now)]),
  ) as Record<Grade, string>
}

export interface UndoEntry {
  before: Card
  reviewId: number
}

export async function answer(db: FlashcardsDB, card: Card, rating: Grade, retention: number, now: number): Promise<UndoEntry> {
  const { card: next } = scheduler(retention).next(card.fsrs, new Date(now), rating)
  return db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.update(card.id, { fsrs: next, due: next.due.getTime(), state: next.state })
    const reviewId = await db.reviews.add({
      cardId: card.id,
      deckId: card.deckId,
      rating,
      prevState: card.state,
      reviewedAt: now,
    } as never)
    return { before: card, reviewId: reviewId as number }
  })
}

export async function undo(db: FlashcardsDB, entry: UndoEntry) {
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put(entry.before)
    await db.reviews.delete(entry.reviewId)
  })
}

export interface NewCardInput {
  deckId: number
  front: string
  back: string
  context: string
  frontLang: string
  backLang: string
}

export function buildCard(input: NewCardInput, now: number): Omit<Card, 'id'> {
  const fsrsCard = createEmptyCard(new Date(now))
  return {
    ...input,
    createdAt: now,
    due: fsrsCard.due.getTime(),
    state: fsrsCard.state,
    fsrs: fsrsCard,
  }
}

export async function addCard(db: FlashcardsDB, input: NewCardInput, reversed: boolean, now = Date.now()) {
  const cards = [buildCard(input, now)]
  if (reversed) {
    cards.push(
      buildCard(
        { ...input, front: input.back, back: input.front, frontLang: input.backLang, backLang: input.frontLang },
        now + 1,
      ),
    )
  }
  await db.cards.bulkAdd(cards as Card[])
}
