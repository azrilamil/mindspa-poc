/**
 * The wellbeing check.
 *
 * Five short prompts written for this demo: mood, energy, sleep, focus and
 * gratitude. Each is a 1..5 rating with plain English anchors, and the last one
 * invites an optional line about what went well.
 *
 * This is deliberately NOT a clinical instrument and it is not a validated
 * questionnaire. It exists so the demo can show a before and after self report.
 * The scoring below is a simple sum with three descriptive bands, and the wording
 * never claims to diagnose anything.
 */

import type { WellbeingBand, WellbeingDimension } from './types'

export interface WellbeingPrompt {
  dimension: WellbeingDimension
  label: string
  /** The question shown above the scale. */
  question: string
  /** Anchors for the bottom and top of the 1..5 scale. */
  lowLabel: string
  highLabel: string
}

export const WELLBEING_ORDER: readonly WellbeingDimension[] = [
  'mood',
  'energy',
  'sleep',
  'focus',
  'gratitude',
]

export const WELLBEING_PROMPTS: Record<WellbeingDimension, WellbeingPrompt> = {
  mood: {
    dimension: 'mood',
    label: 'Mood',
    question: 'Over the last few days, how has your mood mostly been?',
    lowLabel: 'Flat or heavy',
    highLabel: 'Bright and steady',
  },
  energy: {
    dimension: 'energy',
    label: 'Energy',
    question: 'How much energy have you had for an ordinary day?',
    lowLabel: 'Running on empty',
    highLabel: 'Plenty to spare',
  },
  sleep: {
    dimension: 'sleep',
    label: 'Sleep',
    question: 'How rested have you felt on waking?',
    lowLabel: 'Not rested',
    highLabel: 'Well rested',
  },
  focus: {
    dimension: 'focus',
    label: 'Focus',
    question: 'How easily have you been able to settle on one thing?',
    lowLabel: 'Scattered',
    highLabel: 'Settled',
  },
  gratitude: {
    dimension: 'gratitude',
    label: 'Gratitude',
    question: 'How easy has it been to notice something good in the day?',
    lowLabel: 'Hard to see any',
    highLabel: 'Easy to notice',
  },
}

export const WELLBEING_MIN = 1
export const WELLBEING_MAX = 5
export const WELLBEING_ITEM_COUNT = WELLBEING_ORDER.length
export const WELLBEING_MAX_TOTAL = WELLBEING_MAX * WELLBEING_ITEM_COUNT
export const WELLBEING_MIN_TOTAL = WELLBEING_MIN * WELLBEING_ITEM_COUNT

export interface WellbeingScores {
  total: number
  band: WellbeingBand
  /** 0..100, for the researcher table. */
  percent: number
}

/** Clamp a raw answer into the accepted range, rounding a stray float. */
export function clampAnswer(value: number): number {
  if (!Number.isFinite(value)) return WELLBEING_MIN
  return Math.min(WELLBEING_MAX, Math.max(WELLBEING_MIN, Math.round(value)))
}

/** A blank answer set, all at the neutral midpoint. */
export function emptyAnswers(): Record<WellbeingDimension, number> {
  return {
    mood: 3,
    energy: 3,
    sleep: 3,
    focus: 3,
    gratitude: 3,
  }
}

/**
 * Score a response set.
 *
 * Bands: 20 or above is steady, 13 to 19 is mixed, 12 or below is stretched.
 * On a 5 item, 1..5 scale those cut points sit at 80 per cent and 48 per cent.
 */
export function scoreWellbeing(
  answers: Partial<Record<WellbeingDimension, number>>,
): WellbeingScores {
  const total = WELLBEING_ORDER.reduce(
    (sum, dimension) => sum + clampAnswer(answers[dimension] ?? WELLBEING_MIN),
    0,
  )
  const percent = Math.round(
    ((total - WELLBEING_MIN_TOTAL) /
      (WELLBEING_MAX_TOTAL - WELLBEING_MIN_TOTAL)) *
      100,
  )
  return { total, band: bandFor(total), percent }
}

export function bandFor(total: number): WellbeingBand {
  if (total >= 20) return 'steady'
  if (total >= 13) return 'mixed'
  return 'stretched'
}

export const BAND_COPY: Record<WellbeingBand, { label: string; detail: string }> =
  {
    steady: {
      label: 'Steady',
      detail: 'Most days felt workable. Keep the practice you already have.',
    },
    mixed: {
      label: 'Mixed',
      detail: 'Some days easier than others. A short daily practice can help.',
    },
    stretched: {
      label: 'Stretched',
      detail:
        'Things have been hard lately. A few minutes a day is worth trying, and talking to someone helps too.',
    },
  }

/** True when every dimension has a whole answer in range. */
export function isComplete(
  answers: Partial<Record<WellbeingDimension, number>>,
): boolean {
  return WELLBEING_ORDER.every((dimension) => {
    const value = answers[dimension]
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= WELLBEING_MIN &&
      value <= WELLBEING_MAX
    )
  })
}

/** The difference between two totals, for the "since day 1" line. */
export function changeSince(
  previousTotal: number | null,
  currentTotal: number,
): number | null {
  if (previousTotal === null) return null
  return currentTotal - previousTotal
}

/** A neutral, non-diagnostic sentence describing a change. */
export function changeCopy(delta: number | null): string {
  if (delta === null) return 'No earlier check to compare with yet.'
  if (delta > 0) return `Up ${delta} point${delta === 1 ? '' : 's'} since your first check.`
  if (delta < 0)
    return `Down ${Math.abs(delta)} point${Math.abs(delta) === 1 ? '' : 's'} since your first check.`
  return 'Unchanged since your first check.'
}
