/**
 * The 5-4-3-2-1 grounding exercise.
 *
 * Five sensory steps that bring attention back to the room. The exercise asks you
 * to notice, not to type: there are no text fields, so nothing here records what
 * you saw or heard. The step count is declared as data so the wizard, the tests
 * and the progress summary all read one source of truth.
 */

import type { Sense } from './types'

export interface GroundingStep {
  /** 1 based step number. */
  step: number
  /** How many things to notice. */
  count: number
  sense: Sense
  /** The step prompt. */
  prompt: string
  /** A short, concrete example that keeps the instruction usable. */
  example: string
  /** One line shown after the step, marking progress. */
  affirmation: string
}

export const GROUNDING_STEPS: GroundingStep[] = [
  {
    step: 1,
    count: 5,
    sense: 'sight',
    prompt: 'Name five things you can see',
    example: 'The colour of a curtain, the grain of a desk, light on a wall.',
    affirmation: 'Attention is coming back to the room you are in.',
  },
  {
    step: 2,
    count: 4,
    sense: 'touch',
    prompt: 'Notice four things you can feel',
    example: 'Fabric on your arm, the temperature of a chair, your feet on the floor.',
    affirmation: 'Touch brings the mind back to the body.',
  },
  {
    step: 3,
    count: 3,
    sense: 'sound',
    prompt: 'Listen for three sounds',
    example: 'A fan, traffic far away, your own breathing.',
    affirmation: 'Sound marks that you are here, in this moment.',
  },
  {
    step: 4,
    count: 2,
    sense: 'smell',
    prompt: 'Find two things you can smell',
    example: 'Soap, coffee, fresh air after rain.',
    affirmation: 'Smell is an anchor to the place you are safe in.',
  },
  {
    step: 5,
    count: 1,
    sense: 'taste',
    prompt: 'Notice one thing you can taste',
    example: 'A sip of water, the last of a cup of tea, the air on your tongue.',
    affirmation:
      'You have finished 5-4-3-2-1. Notice how you feel now, without judging it.',
  },
]

/** How many steps the exercise has. */
export const GROUNDING_STEP_COUNT = GROUNDING_STEPS.length

/** How many items the whole exercise guides through: 5+4+3+2+1 = 15. */
export const GROUNDING_ITEM_COUNT = GROUNDING_STEPS.reduce(
  (total, step) => total + step.count,
  0,
)

export function stepAt(stepNumber: number): GroundingStep | null {
  return GROUNDING_STEPS.find((step) => step.step === stepNumber) ?? null
}

/** 1 based step number to the label shown, e.g. "Step 3 of 5". */
export function stepLabel(stepNumber: number): string {
  return `Step ${stepNumber} of ${GROUNDING_STEP_COUNT}`
}

/** 0..1 progress through the exercise, for the progress bar. */
export function groundingProgress(stepNumber: number): number {
  if (GROUNDING_STEP_COUNT === 0) return 1
  const clamped = Math.min(Math.max(stepNumber, 1), GROUNDING_STEP_COUNT)
  return clamped / GROUNDING_STEP_COUNT
}

/** The sense label shown beside the icon. */
export const SENSE_LABELS: Record<Sense, string> = {
  sight: 'Sight',
  touch: 'Touch',
  sound: 'Sound',
  smell: 'Smell',
  taste: 'Taste',
}
