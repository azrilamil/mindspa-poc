/**
 * Practices finished in the tools, waiting to be reported.
 *
 * The tools record what actually happened, and the daily check-in stays the
 * person's own record. Rather than asking them to type the same thing twice, a
 * finished practice leaves a pending entry that pre-populates the check-in. It can
 * still be changed or removed before submitting, so the check-in stays a self
 * report and never becomes something the app asserted on their behalf.
 *
 * Pure and separate from storage, so the merge arithmetic is testable without a
 * browser.
 */

import { ACTIVITIES, type Activity } from './types'

export interface PracticeEntry {
  activity: Activity
  minutes: number
  completedAt: string
  source: 'breathing' | 'grounding' | 'audio' | 'informal'
}

/** Pending entries keyed by date, then by activity. */
export type PracticeLog = Record<string, Partial<Record<Activity, PracticeEntry[]>>>

export interface CheckInSeed {
  activities: Activity[]
  minutes: number
  byActivity: Partial<Record<Activity, number>>
}

export function emptySeed(): CheckInSeed {
  return { activities: [], minutes: 0, byActivity: {} }
}

/**
 * Add an entry to the log.
 *
 * Entries accumulate rather than replace: practising twice in a day is two
 * practices, and the check-in should offer the combined time.
 */
export function addPractice(
  log: PracticeLog,
  date: string,
  entry: PracticeEntry,
): PracticeLog {
  const forDate = log[date] ?? {}
  const forActivity = forDate[entry.activity] ?? []
  return {
    ...log,
    [date]: { ...forDate, [entry.activity]: [...forActivity, entry] },
  }
}

/** Drop one activity's entries for a date, when a person unticks it. */
export function clearActivity(
  log: PracticeLog,
  date: string,
  activity: Activity,
): PracticeLog {
  const forDate = log[date]
  if (!forDate || !forDate[activity]) return log
  const next = { ...forDate }
  delete next[activity]
  return { ...log, [date]: next }
}

/** Drop everything pending for a date, once the check-in has been submitted. */
export function clearDate(log: PracticeLog, date: string): PracticeLog {
  if (!log[date]) return log
  const next = { ...log }
  delete next[date]
  return next
}

export function entriesForDate(log: PracticeLog, date: string): PracticeEntry[] {
  const forDate = log[date]
  if (!forDate) return []
  return Object.values(forDate).flat()
}

/**
 * The pre-population for a check-in.
 *
 * Activities are listed in canonical order rather than in the order they were
 * practised, so the check-in looks the same every time and nobody has to hunt for
 * a checkbox that moved.
 */
export function seedForDate(log: PracticeLog, date: string): CheckInSeed {
  const forDate = log[date]
  if (!forDate) return emptySeed()

  const byActivity: Partial<Record<Activity, number>> = {}
  let minutes = 0
  for (const [activity, entries] of Object.entries(forDate)) {
    if (!entries || entries.length === 0) continue
    const total = entries.reduce((sum, entry) => sum + entry.minutes, 0)
    byActivity[activity as Activity] = total
    minutes += total
  }

  return {
    activities: ACTIVITIES.filter((activity) => (byActivity[activity] ?? 0) > 0),
    minutes,
    byActivity,
  }
}

/**
 * Merge the seed with what the person has chosen.
 *
 * When somebody adds an activity the tools did not record, its minutes are
 * unknown, so the minimum is used rather than zero. A zero would look like the
 * activity took no time, and the check-in requires a duration.
 */
export function mergeSeedWithChoice(
  seed: CheckInSeed,
  chosen: readonly Activity[],
  fallbackMinutes: number,
): { activities: Activity[]; minutes: number } {
  const chosenSet = new Set(chosen)
  const seededTotal = seed.activities
    .filter((activity) => chosenSet.has(activity))
    .reduce((sum, activity) => sum + (seed.byActivity[activity] ?? 0), 0)

  const unseeded = chosen.filter(
    (activity) => (seed.byActivity[activity] ?? 0) === 0,
  )

  return {
    activities: [...chosen],
    minutes: seededTotal + unseeded.length * Math.max(0, fallbackMinutes),
  }
}
