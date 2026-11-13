/**
 * Synthetic demo data.
 *
 * Everything here is generated from a fixed seed, so the demo looks the same on
 * every device and a screenshot is reproducible. There is no real person behind
 * any row: the demo session is anonymous, the display name is a label rather than
 * an identity, and the researcher dashboard reads from a separate synthetic
 * cohort that never mixes with the visitor's own session.
 *
 * The generator is deterministic by design. A visitor who resets the demo gets
 * the same calm starting picture, which is what makes the "reset" control useful
 * rather than confusing.
 */

import {
  ACTIVITIES,
  MOODS,
  PROGRAMME_LENGTH_DAYS,
  type Activity,
  type DailyCheckIn,
  type DemoData,
  type DemoUser,
  type JournalEntry,
  type Mood,
  type ResearcherRow,
  type ResearcherSnapshot,
  type SessionKind,
  type SessionRecord,
  type WellbeingCheck,
} from '@/domain/types'
import { addDays, dateOfProgrammeDay, daysBetween } from '@/domain/studyDay'
import { GUIDED_TRACK_KEY } from '@/domain/audioTracks'
import { scoreWellbeing } from '@/domain/wellbeing'

/** A small, fast, deterministic PRNG (mulberry32). */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DEMO_SEED = 20261113

/** The label the demo session carries. Not a name, not an identity. */
export const DEMO_DISPLAY_NAME = 'Demo guest'

export const DEMO_USER_ID = 'demo-session-0001'

/** The synthetic cohort the researcher dashboard reads. */
export const COHORT_SIZE = 24

const PLEASANT_MOODS: Mood[] = [
  'joyful',
  'calm',
  'hopeful',
  'grateful',
  'content',
  'curious',
  'energised',
]

const HARDER_MOODS: Mood[] = [
  'tired',
  'restless',
  'anxious',
  'low',
  'frustrated',
  'overwhelmed',
  'lonely',
  'numb',
]

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length) % items.length]
}

/** A synthetic user whose programme began `daysAgo` days before `today`. */
export function createSyntheticUser(today: string, daysAgo = 0): DemoUser {
  return {
    id: DEMO_USER_ID,
    displayName: DEMO_DISPLAY_NAME,
    programmeStartDate: addDays(today, -daysAgo),
    isSynthetic: true,
    createdAt: `${addDays(today, -daysAgo)}T08:00:00.000Z`,
  }
}

export interface SeedOptions {
  /** Local date the demo is being viewed on. */
  today: string
  /** How many programme days have already passed, clamped to 1..30. */
  daysElapsed?: number
  /** Seed for the generator. */
  seed?: number
}

/**
 * Build the check-ins, sessions, journal and wellbeing rows for a demo user.
 *
 * The shape is deliberate: a mostly consistent practice with a couple of gaps, a
 * growing set of journal entries, and a wellbeing check that improves modestly.
 * That is enough to make the progress screen worth looking at without pretending
 * to be a study result.
 */
export function seedDemoData({
  today,
  daysElapsed = 9,
  seed = DEMO_SEED,
}: SeedOptions): DemoData {
  const random = createRandom(seed)
  // At least two days, so day one holds the guided session and day two holds a
  // check-in. The seed is meant to look like a programme already under way.
  const elapsed = Math.min(Math.max(daysElapsed, 2), PROGRAMME_LENGTH_DAYS - 1)
  const startDate = addDays(today, -(elapsed - 1))
  const user = createSyntheticUser(today, elapsed - 1)

  const checkIns: DailyCheckIn[] = []
  const sessions: SessionRecord[] = []
  const journal: JournalEntry[] = []

  // Two days are deliberately left out, so the calendar shows a real pattern
  // rather than an unbroken wall of green.
  const gaps = new Set<number>(
    elapsed >= 6 ? [3, elapsed >= 9 ? 6 : 5] : [],
  )

  for (let day = 1; day <= elapsed - 1; day += 1) {
    const date = dateOfProgrammeDay(startDate, day)
    const progress = (day - 1) / Math.max(1, elapsed - 2)

    if (day === 1) {
      // The guided session is what starts the programme, so the demo seed has to
      // contain one, or the demo would open on the gate it already passed.
      sessions.push({
        id: 'session-guided',
        date,
        kind: 'guided',
        minutes: 8,
        completed: true,
        audioTier: 'bundled',
        trackKey: GUIDED_TRACK_KEY,
        createdAt: `${date}T09:00:00.000Z`,
      })
    }

    if (!gaps.has(day)) {
      const pleasantChance = 0.45 + progress * 0.35
      const mood =
        random() < pleasantChance ? pick(random, PLEASANT_MOODS) : pick(random, HARDER_MOODS)
      const activityCount = 1 + Math.floor(random() * 3)
      const chosen: Activity[] = []
      for (let index = 0; index < activityCount; index += 1) {
        const candidate = pick(random, ACTIVITIES)
        if (!chosen.includes(candidate)) chosen.push(candidate)
      }
      checkIns.push({
        id: `checkin-${day}`,
        date,
        mood,
        activities: chosen,
        minutes: 5 + Math.floor(random() * 4) * 5,
        note:
          day % 4 === 0
            ? 'Short practice after lunch. Quieter than yesterday.'
            : undefined,
        programmeDay: day,
        createdAt: `${date}T19:30:00.000Z`,
      })
    }

    // One or two sessions per day, skipped on the same gaps and now and then.
    const sessionCount = gaps.has(day) ? 0 : random() < 0.75 ? 1 : 2
    for (let index = 0; index < sessionCount; index += 1) {
      const kind: SessionKind = pick(random, [
        'breathing',
        'grounding',
        'informal',
        'audio',
        'breathing',
      ])
      sessions.push({
        id: `session-${day}-${index}`,
        date,
        kind,
        minutes: kind === 'breathing' ? 2 + index * 3 : 3 + Math.floor(random() * 6),
        completed: true,
        audioTier: kind === 'audio' ? 'bundled' : undefined,
        trackKey: kind === 'audio' ? 'quiet-flute' : undefined,
        createdAt: `${date}T20:${String(10 + index * 7).padStart(2, '0')}:00.000Z`,
      })
    }

    if (day % 3 === 0) {
      journal.push({
        id: `journal-${day}`,
        date,
        title: day % 2 === 0 ? 'A quieter evening' : 'Noticing the small things',
        body:
          day % 2 === 0
            ? 'Walked home without headphones. Heard the same three sounds twice and it stopped feeling like a commute.'
            : 'Tea, no phone. The cup was warmer than I expected and I stayed with it for the whole cup.',
        mood: checkIns.find((entry) => entry.date === date)?.mood,
        createdAt: `${date}T21:05:00.000Z`,
      })
    }
  }

  const startAnswers = { mood: 2, energy: 2, sleep: 2, focus: 2, gratitude: 2 }
  const nowAnswers = { mood: 4, energy: 3, sleep: 3, focus: 4, gratitude: 4 }

  const wellbeing: WellbeingCheck[] = [
    {
      id: 'wellbeing-start',
      date: startDate,
      type: 'start',
      answers: startAnswers,
      ...scoreWellbeing(startAnswers),
      createdAt: `${startDate}T08:10:00.000Z`,
    },
    {
      id: 'wellbeing-follow-up',
      date: today,
      type: 'follow-up',
      answers: nowAnswers,
      ...scoreWellbeing(nowAnswers),
      gratitudeNote: 'The walk home, and the quiet before the kettle boils.',
      createdAt: `${today}T08:20:00.000Z`,
    },
  ]

  return { user, checkIns, sessions, journal, wellbeing }
}

/** An empty demo dataset: a session exists, nothing has been recorded yet. */
export function emptyDemoData(today: string): DemoData {
  return {
    user: {
      id: DEMO_USER_ID,
      displayName: DEMO_DISPLAY_NAME,
      isSynthetic: true,
      createdAt: `${today}T08:00:00.000Z`,
    },
    checkIns: [],
    sessions: [],
    journal: [],
    wellbeing: [],
  }
}

/**
 * The synthetic cohort behind the researcher dashboard.
 *
 * Generated from its own seed so the visitor's own session never leaks into the
 * aggregate, and so the table reads like a cohort rather than a single row
 * repeated.
 */
export function buildResearcherSnapshot(
  today: string,
  cohortSize = COHORT_SIZE,
  seed = DEMO_SEED + 101,
): ResearcherSnapshot {
  const random = createRandom(seed)
  const rows: ResearcherRow[] = []
  const dailyCounts = new Map<string, { checkIns: number; sessions: number }>()

  for (let index = 1; index <= cohortSize; index += 1) {
    const startOffset = 27 + Math.floor(random() * 3)
    const startDate = addDays(today, -startOffset)
    const elapsed = Math.min(daysBetween(startDate, today) + 1, PROGRAMME_LENGTH_DAYS)
    const adherenceBase = 0.55 + random() * 0.4

    let checkInsCount = 0
    let sessionsCount = 0
    let minutes = 0
    let streak = 0
    let streakOpen = true

    for (let day = elapsed; day >= 1; day -= 1) {
      const date = dateOfProgrammeDay(startDate, day)
      const logged = random() < adherenceBase
      const practised = logged && random() < 0.85
      if (logged) {
        checkInsCount += 1
        if (streakOpen) streak += 1
        const bucket = dailyCounts.get(date) ?? { checkIns: 0, sessions: 0 }
        bucket.checkIns += 1
        dailyCounts.set(date, bucket)
      } else {
        streakOpen = false
      }
      if (practised) {
        sessionsCount += 1
        minutes += 3 + Math.floor(random() * 8)
        const bucket = dailyCounts.get(date) ?? { checkIns: 0, sessions: 0 }
        bucket.sessions += 1
        dailyCounts.set(date, bucket)
      }
    }

    rows.push({
      participant: `S-${String(index).padStart(3, '0')}`,
      day: elapsed,
      checkIns: checkInsCount,
      sessions: sessionsCount,
      minutes,
      streak,
      adherence: Math.round((checkInsCount / elapsed) * 100),
    })
  }

  const daily = [...dailyCounts.entries()]
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalCheckIns = rows.reduce((sum, row) => sum + row.checkIns, 0)
  const totalSessions = rows.reduce((sum, row) => sum + row.sessions, 0)
  const totalMinutes = rows.reduce((sum, row) => sum + row.minutes, 0)
  const averageAdherence = Math.round(
    rows.reduce((sum, row) => sum + row.adherence, 0) / Math.max(1, rows.length),
  )

  return {
    rows,
    totals: {
      participants: rows.length,
      checkIns: totalCheckIns,
      sessions: totalSessions,
      minutes: totalMinutes,
      averageAdherence,
    },
    daily,
    generatedAt: `${today}T06:00:00.000Z`,
    synthetic: true,
  }
}

export { MOODS }
