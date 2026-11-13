/**
 * Programme calendar arithmetic.
 *
 * Day 1 is the local calendar date on which the first guided session finished.
 * All arithmetic runs on local calendar dates rather than instants, because the
 * day boundary is midnight where the person is, not midnight UTC. Parsing
 * `YYYY-MM-DD` by parts avoids the classic bug where `new Date('2026-03-01')`
 * lands on the previous local day west of Greenwich.
 */

import { PROGRAMME_LENGTH_DAYS } from './types'

const MS_PER_DAY = 86_400_000

/** Format a Date as a local calendar date, YYYY-MM-DD. */
export function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Today as a local calendar date, YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  return toDateString(now)
}

/** Parse YYYY-MM-DD into a Date at local midnight. */
export function fromDateString(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) throw new Error(`Invalid date, expected YYYY-MM-DD: ${date}`)
  const [, y, m, d] = match
  return new Date(Number(y), Number(m) - 1, Number(d))
}

export function addDays(date: string, days: number): string {
  const parsed = fromDateString(date)
  parsed.setDate(parsed.getDate() + days)
  return toDateString(parsed)
}

/** Whole local days from `from` to `to`. Negative when `to` precedes `from`. */
export function daysBetween(from: string, to: string): number {
  const start = fromDateString(from)
  const end = fromDateString(to)
  // Snap to local noon so a daylight saving transition cannot produce 0.958 of
  // a day and round to the wrong integer.
  start.setHours(12, 0, 0, 0)
  end.setHours(12, 0, 0, 0)
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
}

/** The programme day number on `date`, or null before the programme started. */
export function programmeDayNumber(
  startDate: string | undefined,
  date: string,
): number | null {
  if (!startDate) return null
  return daysBetween(startDate, date) + 1
}

/** The calendar date of programme day `dayNumber` (1 based). */
export function dateOfProgrammeDay(startDate: string, dayNumber: number): string {
  return addDays(startDate, dayNumber - 1)
}

/** Days elapsed up to and including `date`, clamped to 0..PROGRAMME_LENGTH_DAYS. */
export function elapsedDays(startDate: string | undefined, date: string): number {
  const day = programmeDayNumber(startDate, date)
  if (day === null) return 0
  return Math.min(Math.max(day, 0), PROGRAMME_LENGTH_DAYS)
}

/** True once the final day of the programme has been reached. */
export function isFollowUpDue(
  startDate: string | undefined,
  date: string,
): boolean {
  const day = programmeDayNumber(startDate, date)
  return day !== null && day >= PROGRAMME_LENGTH_DAYS
}

export interface CalendarSlot {
  dayNumber: number
  date: string
  completed: boolean
  isToday: boolean
  isFuture: boolean
  isMissed: boolean
}

/** The 30 slot adherence matrix the progress screen renders. */
export function buildCalendar(
  startDate: string | undefined,
  loggedDates: readonly string[],
  todayDate: string,
): CalendarSlot[] {
  const logged = new Set(loggedDates)
  return Array.from({ length: PROGRAMME_LENGTH_DAYS }, (_, index) => {
    const dayNumber = index + 1
    if (!startDate) {
      return {
        dayNumber,
        date: '',
        completed: false,
        isToday: false,
        isFuture: true,
        isMissed: false,
      }
    }
    const date = dateOfProgrammeDay(startDate, dayNumber)
    const isFuture = date > todayDate
    const isToday = date === todayDate
    const completed = logged.has(date)
    return {
      dayNumber,
      date,
      completed,
      isToday,
      isFuture,
      // Today is never a missed day: the day is not over yet.
      isMissed: !completed && !isFuture && !isToday,
    }
  })
}

/**
 * Consecutive logged days ending today, or ending yesterday when today has not
 * been logged yet.
 *
 * The rule in full: take the most recent logged day. The streak is the run of
 * consecutive logged days ending at that date, and it only counts if that date
 * is today or yesterday. A gap that already spans a whole missed day ends the
 * streak rather than being forgiven.
 */
export function currentStreak(
  startDate: string | undefined,
  loggedDates: readonly string[],
  todayDate: string,
): number {
  if (!startDate) return 0
  const logged = new Set(loggedDates)
  const lastElapsed = elapsedDays(startDate, todayDate)
  if (lastElapsed < 1) return 0

  const asOf = dateOfProgrammeDay(startDate, lastElapsed)
  const grace = dateOfProgrammeDay(startDate, lastElapsed - 1)

  let cursor: number
  if (logged.has(asOf)) cursor = lastElapsed
  else if (lastElapsed > 1 && logged.has(grace)) cursor = lastElapsed - 1
  else return 0

  let streak = 0
  while (cursor >= 1 && logged.has(dateOfProgrammeDay(startDate, cursor))) {
    streak += 1
    cursor -= 1
  }
  return streak
}

export interface AdherenceSummary {
  elapsedDays: number
  loggedDays: number
  adherencePercent: number
  streak: number
  programmeComplete: boolean
}

export function adherenceSummary(
  startDate: string | undefined,
  loggedDates: readonly string[],
  todayDate: string,
): AdherenceSummary {
  const elapsed = elapsedDays(startDate, todayDate)
  if (!startDate || elapsed === 0) {
    return {
      elapsedDays: 0,
      loggedDays: 0,
      adherencePercent: 0,
      streak: 0,
      programmeComplete: false,
    }
  }
  const windowEnd = dateOfProgrammeDay(
    startDate,
    Math.min(elapsed, PROGRAMME_LENGTH_DAYS),
  )
  const inWindow = new Set(
    loggedDates.filter((date) => date >= startDate && date <= windowEnd),
  )
  return {
    elapsedDays: elapsed,
    loggedDays: inWindow.size,
    adherencePercent: Math.round((inWindow.size / elapsed) * 100),
    streak: currentStreak(startDate, loggedDates, todayDate),
    programmeComplete: elapsed >= PROGRAMME_LENGTH_DAYS,
  }
}

/** Human label for a programme day, e.g. "Day 4 of 30". */
export function programmeDayLabel(
  startDate: string | undefined,
  todayDate: string,
): string {
  const day = programmeDayNumber(startDate, todayDate)
  if (day === null) return 'Not started'
  const clamped = Math.min(Math.max(day, 1), PROGRAMME_LENGTH_DAYS)
  return `Day ${clamped} of ${PROGRAMME_LENGTH_DAYS}`
}

/** A short list of the last `count` local dates, oldest first, ending today. */
export function recentDates(count: number, todayDate: string): string[] {
  return Array.from({ length: count }, (_, index) =>
    addDays(todayDate, index - (count - 1)),
  )
}
