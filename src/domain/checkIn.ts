/**
 * Check-in rules.
 *
 * Three behaviours decided up front and encoded here rather than in the screen:
 *
 * - Any day up to today can be filed or corrected, and a future day cannot. A
 *   forgotten evening can still be recorded the next morning.
 * - Adherence is shown against the days that have actually elapsed, because a
 *   fixed 30 day denominator in week one reads as failure and is a plausible
 *   reason to stop opening the app.
 * - A missed day is marked in words that describe the day rather than scolding
 *   the person.
 */

import {
  ACTIVITIES,
  PROGRAMME_LENGTH_DAYS,
  type Activity,
  type DailyCheckIn,
  type Mood,
} from './types'
import { MAX_NOTE_LENGTH } from './moods'
import {
  adherenceSummary,
  buildCalendar,
  currentStreak,
  dateOfProgrammeDay,
  daysBetween,
  today as localToday,
  type CalendarSlot,
} from './studyDay'

export type DayKind = 'future' | 'today' | 'past'

/** What kind of day a date is, compared as plain `YYYY-MM-DD` strings. */
export function dayKind(date: string, today: string = localToday()): DayKind {
  if (date > today) return 'future'
  if (date === today) return 'today'
  return 'past'
}

export function isEditable(date: string, today: string = localToday()): boolean {
  return dayKind(date, today) !== 'future'
}

export interface CheckInWindow {
  startDate: string
  earliest: string
  latest: string
  defaultDate: string
}

/** The dates a check-in may be filed for, bounded at both ends. */
export function checkInWindow(
  startDate: string,
  today: string = localToday(),
): CheckInWindow {
  const lastDay = dateOfProgrammeDay(startDate, PROGRAMME_LENGTH_DAYS)
  const latest = today < lastDay ? today : lastDay
  return {
    startDate,
    earliest: startDate,
    latest,
    defaultDate: latest < startDate ? startDate : latest,
  }
}

/** The programme day number for a date, or null outside the programme window. */
export function programmeDayFor(startDate: string, date: string): number | null {
  const day = daysBetween(startDate, date) + 1
  if (day < 1 || day > PROGRAMME_LENGTH_DAYS) return null
  return day
}

export interface CheckInFormValues {
  mood: Mood | null
  activities: Activity[]
  minutes: number
  note: string
}

export interface CheckInErrors {
  date?: string
  mood?: string
  activities?: string
  minutes?: string
  note?: string
}

export interface ValidatedCheckIn {
  date: string
  mood: Mood
  activities: Activity[]
  minutes: number
  note?: string
}

/**
 * Validate a check-in.
 *
 * A mood and at least one activity are required: the check-in exists to record
 * what was done, and a row with neither is not a record of anything. The note is
 * optional and capped.
 */
export function validateCheckIn(
  values: CheckInFormValues,
  date: string,
  today: string = localToday(),
):
  | { ok: true; values: ValidatedCheckIn }
  | { ok: false; errors: CheckInErrors } {
  const errors: CheckInErrors = {}

  if (!isEditable(date, today)) {
    errors.date = 'A future day cannot be recorded.'
  }
  if (!values.mood) {
    errors.mood = 'Choose the mood that fits today.'
  }
  if (values.activities.length === 0) {
    errors.activities = 'Pick at least one thing you did.'
  }
  if (!Number.isFinite(values.minutes) || values.minutes <= 0) {
    errors.minutes = 'Choose how long it took.'
  }
  const note = values.note.trim()
  if (note.length > MAX_NOTE_LENGTH) {
    errors.note = `Keep the note under ${MAX_NOTE_LENGTH} characters.`
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  const unique = ACTIVITIES.filter((activity) =>
    values.activities.includes(activity),
  )
  return {
    ok: true,
    values: {
      date,
      mood: values.mood as Mood,
      activities: unique,
      minutes: Math.round(values.minutes),
      note: note === '' ? undefined : note,
    },
  }
}

export interface AdherenceDisplay {
  loggedDays: number
  /** Elapsed days during the programme, 30 once it has finished. */
  denominator: number
  percent: number
  programmeComplete: boolean
  caption: string
}

/** How adherence is presented: out of days elapsed, then out of 30. */
export function adherenceDisplay(
  loggedDates: readonly string[],
  startDate: string | undefined,
  today: string,
): AdherenceDisplay {
  if (!startDate) {
    return {
      loggedDays: 0,
      denominator: 0,
      percent: 0,
      programmeComplete: false,
      caption: 'Not started',
    }
  }

  const elapsed = programmeDayFor(startDate, today) ?? PROGRAMME_LENGTH_DAYS
  const elapsedDays = Math.min(elapsed, PROGRAMME_LENGTH_DAYS)
  const programmeComplete = elapsedDays >= PROGRAMME_LENGTH_DAYS
  const denominator = programmeComplete ? PROGRAMME_LENGTH_DAYS : elapsedDays

  const windowEnd = dateOfProgrammeDay(startDate, elapsedDays)
  const logged = new Set(
    loggedDates.filter((date) => date >= startDate && date <= windowEnd),
  )
  const loggedDays = logged.size
  const percent =
    denominator > 0 ? Math.round((loggedDays / denominator) * 100) : 0

  return {
    loggedDays,
    denominator,
    percent,
    programmeComplete,
    caption: programmeComplete
      ? `${loggedDays} of ${PROGRAMME_LENGTH_DAYS} days recorded`
      : `${loggedDays} of ${denominator} days so far`,
  }
}

export type DayStatus = 'completed' | 'missed' | 'todayPending' | 'future'

export interface CalendarDay {
  dayNumber: number
  date: string
  status: DayStatus
  mood: Mood | null
  isToday: boolean
  editable: boolean
}

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  completed: 'Recorded',
  // Gentle, and about the day rather than about the person.
  missed: 'Not recorded',
  todayPending: 'Today, not yet recorded',
  future: 'Still to come',
}

/** Build the 30 day matrix, with the mood recorded on each logged day. */
export function buildCalendarDays(
  startDate: string | undefined,
  checkIns: readonly DailyCheckIn[],
  today: string,
): CalendarDay[] {
  const moodByDate = new Map(checkIns.map((entry) => [entry.date, entry.mood]))
  const slots: CalendarSlot[] = buildCalendar(
    startDate,
    [...moodByDate.keys()],
    today,
  )

  return slots.map((slot) => {
    const mood = slot.date ? (moodByDate.get(slot.date) ?? null) : null
    let status: DayStatus
    if (slot.completed) status = 'completed'
    else if (slot.isFuture) status = 'future'
    else if (slot.isToday) status = 'todayPending'
    else status = 'missed'

    return {
      dayNumber: slot.dayNumber,
      date: slot.date,
      status,
      mood,
      isToday: slot.isToday,
      editable: slot.date !== '' && slot.date <= today,
    }
  })
}

export function statusCounts(
  days: readonly CalendarDay[],
): Record<DayStatus, number> {
  const counts: Record<DayStatus, number> = {
    completed: 0,
    missed: 0,
    todayPending: 0,
    future: 0,
  }
  for (const day of days) counts[day.status] += 1
  return counts
}

export interface Badge {
  key: string
  label: string
  detail: string
}

/** Milestones worth noticing. Three, not thirty, so they stay meaningful. */
export function badgesFor(
  loggedDays: number,
  streak: number,
  programmeComplete: boolean,
): Badge[] {
  const badges: Badge[] = []
  if (streak >= 7) {
    badges.push({
      key: 'streak-7',
      label: 'Seven days running',
      detail: 'A full week of check-ins without a gap.',
    })
  }
  if (loggedDays >= 15) {
    badges.push({
      key: 'halfway',
      label: 'Halfway',
      detail: 'Fifteen days recorded.',
    })
  }
  if (programmeComplete && loggedDays >= PROGRAMME_LENGTH_DAYS) {
    badges.push({
      key: 'complete',
      label: 'Thirty days complete',
      detail: 'Every day of the programme has a record.',
    })
  }
  return badges
}

/** The most recorded mood across a set of check-ins, or null when there is none. */
export function mostCommonMood(
  checkIns: readonly DailyCheckIn[],
): Mood | null {
  if (checkIns.length === 0) return null
  const counts = new Map<Mood, number>()
  for (const entry of checkIns) {
    counts.set(entry.mood, (counts.get(entry.mood) ?? 0) + 1)
  }
  let best: Mood | null = null
  let bestCount = 0
  for (const [mood, count] of counts) {
    if (count > bestCount) {
      best = mood
      bestCount = count
    }
  }
  return best
}

export { currentStreak, adherenceSummary }
