/**
 * Canonical domain types for MindSpa POC.
 *
 * Everything the UI renders is derived from these shapes, and the local and
 * Convex data adapters both persist exactly these fields. There are no personal
 * identifiers anywhere in this model: a demo session is anonymous, and the only
 * identity it carries is the session id the browser minted.
 *
 * The app is a portfolio demo built on synthetic data. It is not a medical tool
 * and the wellbeing check is not a clinical instrument.
 */

export const MOODS = [
  'joyful',
  'calm',
  'hopeful',
  'grateful',
  'content',
  'curious',
  'tired',
  'restless',
  'anxious',
  'low',
  'frustrated',
  'overwhelmed',
  'lonely',
  'numb',
  'energised',
] as const
export type Mood = (typeof MOODS)[number]

export const ACTIVITIES = [
  'breathing',
  'grounding',
  'audio',
  'mindful-moment',
  'journal',
  'walk',
] as const
export type Activity = (typeof ACTIVITIES)[number]

export const SESSION_KINDS = [
  'guided',
  'breathing',
  'grounding',
  'informal',
  'audio',
] as const
export type SessionKind = (typeof SESSION_KINDS)[number]

export const SENSES = ['sight', 'touch', 'sound', 'smell', 'taste'] as const
export type Sense = (typeof SENSES)[number]

export const WELLBEING_DIMENSIONS = [
  'mood',
  'energy',
  'sleep',
  'focus',
  'gratitude',
] as const
export type WellbeingDimension = (typeof WELLBEING_DIMENSIONS)[number]

/** Study length in days. Day 1 is the day the first guided session completes. */
export const PROGRAMME_LENGTH_DAYS = 30

/** The three audio tiers the player can fall back through. */
export type AudioTier = 's3' | 'bundled' | 'generated'

export interface DemoUser {
  /** Anonymous session id. Never derived from a person. */
  id: string
  displayName: string
  /** Local calendar date, YYYY-MM-DD, of the first guided session. */
  programmeStartDate?: string
  isSynthetic: true
  createdAt: string
}

export interface DailyCheckIn {
  id: string
  date: string
  mood: Mood
  activities: Activity[]
  minutes: number
  note?: string
  /** 1..30, derived from the programme start date at write time. */
  programmeDay: number
  createdAt: string
}

export interface SessionRecord {
  id: string
  date: string
  kind: SessionKind
  minutes: number
  completed: boolean
  /** Which audio tier served the track, when the session had audio. */
  audioTier?: AudioTier
  trackKey?: string
  createdAt: string
}

export interface JournalEntry {
  id: string
  date: string
  title: string
  body: string
  mood?: Mood
  createdAt: string
}

/**
 * One self-report response set for the wellbeing check.
 *
 * Each dimension is a 1..5 rating. `total` is computed by `domain/wellbeing.ts`
 * from the raw answers, never entered by hand, so a scoring change does not
 * require a data migration.
 */
export interface WellbeingCheck {
  id: string
  date: string
  /** `start` before the programme, `follow-up` once it is under way. */
  type: 'start' | 'follow-up'
  answers: Record<WellbeingDimension, number>
  total: number
  band: WellbeingBand
  gratitudeNote?: string
  createdAt: string
}

export type WellbeingBand = 'steady' | 'mixed' | 'stretched'

/** A demo session: the anonymous user plus everything they produced. */
export interface DemoData {
  user: DemoUser
  checkIns: DailyCheckIn[]
  sessions: SessionRecord[]
  journal: JournalEntry[]
  wellbeing: WellbeingCheck[]
}

export interface CheckInInput {
  date: string
  mood: Mood
  activities: Activity[]
  minutes: number
  note?: string
}

export interface SessionInput {
  kind: SessionKind
  minutes: number
  completed?: boolean
  date?: string
  audioTier?: AudioTier
  trackKey?: string
}

export interface WellbeingInput {
  type?: 'start' | 'follow-up'
  answers: Record<WellbeingDimension, number>
  gratitudeNote?: string
}

export interface JournalInput {
  title: string
  body: string
  mood?: Mood
  date?: string
}

/** Row shape used by the researcher table, synthetic only. */
export interface ResearcherRow {
  participant: string
  day: number
  checkIns: number
  sessions: number
  minutes: number
  streak: number
  adherence: number
}

export interface ResearcherSnapshot {
  rows: ResearcherRow[]
  totals: {
    participants: number
    checkIns: number
    sessions: number
    minutes: number
    averageAdherence: number
  }
  /** Daily counts over the programme window, for the chart. */
  daily: { date: string; checkIns: number; sessions: number }[]
  generatedAt: string
  /** Always true. The dashboard refuses to show anything else. */
  synthetic: true
}
