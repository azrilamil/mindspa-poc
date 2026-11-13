/**
 * The informal mindfulness wizard.
 *
 * Four steps that turn an ordinary activity into a short practice: pause, engage
 * the senses, act with attention, then return without judging the wandering mind.
 * Four everyday activities are offered, and each carries its own sensory cue so
 * the guidance is concrete rather than a poster slogan.
 *
 * The step-one pause is a real countdown rather than a sentence asking you to
 * pause, because a stated pause is the part people skip.
 */

export const INFORMAL_ACTIVITY_IDS = [
  'drink',
  'walk',
  'wash',
  'tidy',
] as const
export type InformalActivityId = (typeof INFORMAL_ACTIVITY_IDS)[number]

export interface InformalActivity {
  id: InformalActivityId
  title: string
  description: string
  /** What to notice during the activity. */
  sensoryCue: string
  /** Where to place attention in the body. */
  actionCue: string
}

export const INFORMAL_ACTIVITIES: InformalActivity[] = [
  {
    id: 'drink',
    title: 'Drinking tea or water',
    description: 'One cup, without a screen in the other hand.',
    sensoryCue: 'Warmth through the cup, the first sip, the weight on your tongue.',
    actionCue: 'Lift slowly. Let the cup come down before you swallow.',
  },
  {
    id: 'walk',
    title: 'Walking a short distance',
    description: 'A corridor, a garden, the walk to the kitchen.',
    sensoryCue: 'The roll of each foot, the air on your face, the pace you keep.',
    actionCue: 'Let the pace be ordinary. Notice the change when you slow by a tenth.',
  },
  {
    id: 'wash',
    title: 'Washing up',
    description: 'Dishes, hands, or a face. Anything with water.',
    sensoryCue: 'Water temperature, the weight of a plate, the sound of the tap.',
    actionCue: 'One object at a time. Finish it before reaching for the next.',
  },
  {
    id: 'tidy',
    title: 'Tidying one surface',
    description: 'A desk, a shelf, one square metre of floor.',
    sensoryCue: 'Texture of what you move, the sound of it being set down.',
    actionCue: 'Put each thing where it belongs rather than moving it aside.',
  },
]

export interface InformalStep {
  step: number
  title: string
  instruction: string
}

export const INFORMAL_STEPS: InformalStep[] = [
  {
    step: 1,
    title: 'Pause for a moment',
    instruction:
      'Put the phone down and let your shoulders drop. Five slow breaths, then begin.',
  },
  {
    step: 2,
    title: 'Engage the senses',
    instruction:
      'Pick two sensations from the activity and stay with them while the rest happens.',
  },
  {
    step: 3,
    title: 'Do it with attention',
    instruction:
      'Do the activity at its normal speed. If your mind rehearses a conversation, that is fine.',
  },
  {
    step: 4,
    title: 'Return without judging',
    instruction:
      'When attention wanders, notice it, and bring it back to the next small action.',
  },
]

export const INFORMAL_STEP_COUNT = INFORMAL_STEPS.length

/** The pause countdown offered on step one, in seconds. */
export const INFORMAL_PAUSE_SECONDS = 5

export function informalActivityById(
  id: string,
): InformalActivity | undefined {
  return INFORMAL_ACTIVITIES.find((activity) => activity.id === id)
}

/** The step at a 1 based index, clamped so a bad index cannot blank the screen. */
export function informalStepAt(stepNumber: number): InformalStep {
  const index = Math.min(Math.max(stepNumber, 1), INFORMAL_STEP_COUNT) - 1
  return INFORMAL_STEPS[index]
}

export function informalProgress(stepNumber: number): number {
  const clamped = Math.min(Math.max(stepNumber, 1), INFORMAL_STEP_COUNT)
  return clamped / INFORMAL_STEP_COUNT
}

/** Ticks the countdown by one second. Returns the next value and whether it ran out. */
export function tickPause(
  secondsLeft: number,
): { secondsLeft: number; done: boolean } {
  if (secondsLeft <= 1) return { secondsLeft: 0, done: true }
  return { secondsLeft: secondsLeft - 1, done: false }
}
