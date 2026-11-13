/**
 * The moods offered on the daily check-in.
 *
 * Colour, face and label are declared together so a mood can never be rendered
 * with the wrong colour, and the calendar, the picker and the researcher table
 * all agree by construction.
 *
 * Colour alone never carries the meaning: every mood also renders its label and a
 * face that differs in shape, so the choice stays readable for anyone who cannot
 * separate the hues.
 */

import type { Activity, Mood } from './types'

export type MoodExpression =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'excited'
  | 'neutral'
  | 'uneasy'

export interface MoodDefinition {
  mood: Mood
  label: string
  expression: MoodExpression
  /** Tailwind classes for the selected state. */
  selectedClass: string
  /** Tailwind classes for the idle state. */
  idleClass: string
  /** A dot colour, used by the calendar day markers. */
  dotClass: string
  /** True for moods that read as pleasant, used by the progress summary. */
  pleasant: boolean
}

export const MOOD_ORDER: readonly Mood[] = [
  'joyful',
  'calm',
  'hopeful',
  'grateful',
  'content',
  'curious',
  'energised',
  'tired',
  'restless',
  'anxious',
  'low',
  'frustrated',
  'overwhelmed',
  'lonely',
  'numb',
]

const IDLE = 'border-purple-200 bg-white/70'

export const MOOD_DEFINITIONS: Record<Mood, MoodDefinition> = {
  joyful: {
    mood: 'joyful',
    label: 'Joyful',
    expression: 'happy',
    selectedClass: 'border-rose-deep bg-rose-soft',
    idleClass: IDLE,
    dotClass: 'bg-rose-deep',
    pleasant: true,
  },
  calm: {
    mood: 'calm',
    label: 'Calm',
    expression: 'happy',
    selectedClass: 'border-teal-500 bg-teal-100',
    idleClass: IDLE,
    dotClass: 'bg-teal-500',
    pleasant: true,
  },
  hopeful: {
    mood: 'hopeful',
    label: 'Hopeful',
    expression: 'happy',
    selectedClass: 'border-sunflower-500 bg-sunflower-300/60',
    idleClass: IDLE,
    dotClass: 'bg-sunflower-500',
    pleasant: true,
  },
  grateful: {
    mood: 'grateful',
    label: 'Grateful',
    expression: 'happy',
    selectedClass: 'border-pink-500 bg-pink-100',
    idleClass: IDLE,
    dotClass: 'bg-pink-500',
    pleasant: true,
  },
  content: {
    mood: 'content',
    label: 'Content',
    expression: 'happy',
    selectedClass: 'border-emerald-500 bg-emerald-100',
    idleClass: IDLE,
    dotClass: 'bg-emerald-500',
    pleasant: true,
  },
  curious: {
    mood: 'curious',
    label: 'Curious',
    expression: 'excited',
    selectedClass: 'border-violet-500 bg-violet-100',
    idleClass: IDLE,
    dotClass: 'bg-violet-500',
    pleasant: true,
  },
  energised: {
    mood: 'energised',
    label: 'Energised',
    expression: 'excited',
    selectedClass: 'border-indigo-500 bg-indigo-100',
    idleClass: IDLE,
    dotClass: 'bg-indigo-500',
    pleasant: true,
  },
  tired: {
    mood: 'tired',
    label: 'Tired',
    expression: 'neutral',
    selectedClass: 'border-cyan-600 bg-cyan-100',
    idleClass: IDLE,
    dotClass: 'bg-cyan-600',
    pleasant: false,
  },
  restless: {
    mood: 'restless',
    label: 'Restless',
    expression: 'uneasy',
    selectedClass: 'border-amber-600 bg-amber-100',
    idleClass: IDLE,
    dotClass: 'bg-amber-600',
    pleasant: false,
  },
  anxious: {
    mood: 'anxious',
    label: 'Anxious',
    expression: 'uneasy',
    selectedClass: 'border-purple-600 bg-purple-100',
    idleClass: IDLE,
    dotClass: 'bg-purple-600',
    pleasant: false,
  },
  low: {
    mood: 'low',
    label: 'Low',
    expression: 'sad',
    selectedClass: 'border-blue-500 bg-blue-100',
    idleClass: IDLE,
    dotClass: 'bg-blue-500',
    pleasant: false,
  },
  frustrated: {
    mood: 'frustrated',
    label: 'Frustrated',
    expression: 'angry',
    selectedClass: 'border-red-500 bg-red-100',
    idleClass: IDLE,
    dotClass: 'bg-red-500',
    pleasant: false,
  },
  overwhelmed: {
    mood: 'overwhelmed',
    label: 'Overwhelmed',
    expression: 'uneasy',
    selectedClass: 'border-lavender-600 bg-lavender-200',
    idleClass: IDLE,
    dotClass: 'bg-lavender-600',
    pleasant: false,
  },
  lonely: {
    mood: 'lonely',
    label: 'Lonely',
    expression: 'sad',
    selectedClass: 'border-tranquil-600 bg-tranquil-200',
    idleClass: IDLE,
    dotClass: 'bg-tranquil-600',
    pleasant: false,
  },
  numb: {
    mood: 'numb',
    label: 'Numb',
    expression: 'neutral',
    selectedClass: 'border-slate-500 bg-slate-100',
    idleClass: IDLE,
    dotClass: 'bg-slate-500',
    pleasant: false,
  },
}

export function moodDefinition(mood: Mood): MoodDefinition {
  return MOOD_DEFINITIONS[mood]
}

export const MOOD_CHOICES: MoodDefinition[] = MOOD_ORDER.map(moodDefinition)

export function isMood(value: string): value is Mood {
  return Object.prototype.hasOwnProperty.call(MOOD_DEFINITIONS, value)
}

export interface ActivityDefinition {
  activity: Activity
  label: string
  /** One line the check-in shows under the label. */
  detail: string
}

/**
 * The activities a person can tick on the check-in.
 *
 * The guided session is stored as a session record rather than a tickable
 * activity, because it happens once and the app already knows when.
 */
export const CHECK_IN_ACTIVITIES: ActivityDefinition[] = [
  {
    activity: 'breathing',
    label: 'Breathing exercise',
    detail: 'A few minutes following the orb',
  },
  {
    activity: 'grounding',
    label: 'Grounding 5-4-3-2-1',
    detail: 'Five senses, back to the room',
  },
  {
    activity: 'audio',
    label: 'Relaxation audio',
    detail: 'One of the guided tracks',
  },
  {
    activity: 'mindful-moment',
    label: 'Mindful moment',
    detail: 'Everyday activity, done with attention',
  },
  {
    activity: 'journal',
    label: 'Journaling',
    detail: 'A few lines about the day',
  },
  {
    activity: 'walk',
    label: 'Mindful walk',
    detail: 'Walking without a screen',
  },
]

export function activityLabel(activity: string): string {
  return (
    CHECK_IN_ACTIVITIES.find((entry) => entry.activity === activity)?.label ??
    activity
  )
}

/** The quick duration pills on the check-in. */
export const DURATION_PILLS = [5, 10, 15, 30] as const

/** The longest note we accept, so one log row cannot grow unbounded. */
export const MAX_NOTE_LENGTH = 500
