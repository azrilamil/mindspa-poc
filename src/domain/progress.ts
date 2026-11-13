/**
 * The progress summary.
 *
 * Everything the progress screen shows is derived here from the raw rows, so the
 * screen holds no arithmetic of its own and the numbers can be tested without
 * rendering anything.
 */

import type {
  DailyCheckIn,
  JournalEntry,
  SessionRecord,
  WellbeingCheck,
} from './types'
import { PROGRAMME_LENGTH_DAYS } from './types'
import {
  adherenceSummary,
  buildCalendarDays,
  currentStreak,
  type CalendarDay,
} from './checkIn'
import { changeCopy, changeSince } from './wellbeing'

export interface ProgressSummary {
  calendar: CalendarDay[]
  streak: number
  longestStreak: number
  loggedDays: number
  elapsedDays: number
  adherencePercent: number
  programmeComplete: boolean
  totalMinutes: number
  sessionCount: number
  journalCount: number
  /** The average minutes per recorded day, rounded. */
  averageMinutes: number
  /** Check-ins per programme week, oldest first. */
  weeklyCheckIns: number[]
  wellbeing?: {
    start?: WellbeingCheck
    latest?: WellbeingCheck
    delta: number | null
    copy: string
  }
}

/** The longest run of consecutive logged dates inside the programme window. */
export function longestStreak(
  startDate: string | undefined,
  checkIns: readonly DailyCheckIn[],
): number {
  if (!startDate || checkIns.length === 0) return 0
  const days = new Set(checkIns.map((entry) => entry.programmeDay))
  let best = 0
  let run = 0
  for (let day = 1; day <= PROGRAMME_LENGTH_DAYS; day += 1) {
    if (days.has(day)) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  return best
}

/** Check-ins bucketed into the programme's five weeks of six days. */
export function weeklyCheckIns(
  checkIns: readonly DailyCheckIn[],
): number[] {
  const buckets = [0, 0, 0, 0, 0]
  for (const entry of checkIns) {
    const day = entry.programmeDay
    if (day < 1 || day > PROGRAMME_LENGTH_DAYS) continue
    const index = Math.min(buckets.length - 1, Math.floor((day - 1) / 6))
    buckets[index] += 1
  }
  return buckets
}

export interface ProgressInput {
  startDate: string | undefined
  today: string
  checkIns: readonly DailyCheckIn[]
  sessions: readonly SessionRecord[]
  journal: readonly JournalEntry[]
  wellbeing: readonly WellbeingCheck[]
}

export function summariseProgress({
  startDate,
  today,
  checkIns,
  sessions,
  journal,
  wellbeing,
}: ProgressInput): ProgressSummary {
  const adherence = adherenceSummary(
    startDate,
    checkIns.map((entry) => entry.date),
    today,
  )
  const calendar = buildCalendarDays(startDate, checkIns, today)
  const totalMinutes =
    sessions.reduce((sum, session) => sum + session.minutes, 0) +
    checkIns.reduce((sum, entry) => sum + entry.minutes, 0)
  const start = wellbeing.find((entry) => entry.type === 'start')
  const latestFollowUp = [...wellbeing]
    .filter((entry) => entry.type === 'follow-up')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .at(-1)
  const delta = latestFollowUp
    ? changeSince(start?.total ?? null, latestFollowUp.total)
    : null

  return {
    calendar,
    streak: currentStreak(
      startDate,
      checkIns.map((entry) => entry.date),
      today,
    ),
    longestStreak: longestStreak(startDate, checkIns),
    loggedDays: adherence.loggedDays,
    elapsedDays: adherence.elapsedDays,
    adherencePercent: adherence.adherencePercent,
    programmeComplete: adherence.programmeComplete,
    totalMinutes,
    sessionCount: sessions.length,
    journalCount: journal.length,
    averageMinutes:
      checkIns.length > 0 ? Math.round(totalMinutes / checkIns.length) : 0,
    weeklyCheckIns: weeklyCheckIns(checkIns),
    wellbeing: {
      start,
      latest: latestFollowUp,
      delta,
      copy: changeCopy(delta),
    },
  }
}

/** Minutes as a friendly label: "1 h 20 min", "45 min", "0 min". */
export function formatMinutes(total: number): string {
  const safe = Math.max(0, Math.round(total))
  const hours = Math.floor(safe / 60)
  const minutes = safe % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} min`
}
