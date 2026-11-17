import { State } from 'ts-fsrs'
import type { FlashcardsDB } from './db'
import { startOfDay } from './scheduler'

const DAY = 24 * 60 * 60 * 1000

/** Local calendar key, e.g. 2026-11-17. */
export function dayKey(ms: number): string {
  const d = new Date(ms)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function shiftDay(dayStart: number, days: number): number {
  const d = new Date(dayStart)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

/**
 * Consecutive days with at least one review. Today counts if studied; a streak
 * that ended yesterday is still alive until today ends.
 */
export function computeStreak(reviewDays: Set<string>, now: number): number {
  let day = startOfDay(now)
  if (!reviewDays.has(dayKey(day))) day = shiftDay(day, -1)
  let streak = 0
  while (reviewDays.has(dayKey(day))) {
    streak++
    day = shiftDay(day, -1)
  }
  return streak
}

export interface Stats {
  streak: number
  bestStreak: number
  studiedToday: boolean
  reviewsToday: number
  totalCards: number
  learnedCards: number
  newCards: number
  retention30: number | null
  last30: { key: string; label: string; count: number }[]
}

function bestStreakOf(reviewDays: Set<string>): number {
  const days = [...reviewDays].sort()
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const key of days) {
    const [y, m, d] = key.split('-').map(Number)
    const t = new Date(y, m - 1, d).getTime()
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = t
  }
  return best
}

export async function computeStats(db: FlashcardsDB, now: number): Promise<Stats> {
  const [reviews, totalCards, learnedCards, newCards] = await Promise.all([
    db.reviews.orderBy('reviewedAt').toArray(),
    db.cards.count(),
    db.cards.where('state').equals(State.Review).count(),
    db.cards.where('state').equals(State.New).count(),
  ])

  const perDay = new Map<string, number>()
  for (const r of reviews) {
    const k = dayKey(r.reviewedAt)
    perDay.set(k, (perDay.get(k) ?? 0) + 1)
  }
  const reviewDays = new Set(perDay.keys())
  const todayKey = dayKey(now)

  const today = startOfDay(now)
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const t = shiftDay(today, i - 29)
    const d = new Date(t)
    return { key: dayKey(t), label: `${d.getDate()}/${d.getMonth() + 1}`, count: perDay.get(dayKey(t)) ?? 0 }
  })

  const since = shiftDay(today, -29)
  const matured = reviews.filter((r) => r.reviewedAt >= since && r.prevState === State.Review)
  const retention30 = matured.length
    ? matured.filter((r) => r.rating !== 1).length / matured.length
    : null

  return {
    streak: computeStreak(reviewDays, now),
    bestStreak: bestStreakOf(reviewDays),
    studiedToday: reviewDays.has(todayKey),
    reviewsToday: perDay.get(todayKey) ?? 0,
    totalCards,
    learnedCards,
    newCards,
    retention30,
    last30,
  }
}
