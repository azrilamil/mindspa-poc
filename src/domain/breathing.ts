/**
 * Breathing pacer timing.
 *
 * Two patterns: 4-4-4 (inhale, hold, exhale) and 4-7-8. A cycle is 12 or 19
 * seconds. A session runs to the nearest whole cycle rather than to a hard clock,
 * because cutting somebody off mid inhale is a poor way to end a relaxation
 * exercise. The plan reports the overshoot so the screen can be honest about the
 * real length.
 */

export const BREATHING_MODES = ['4-4-4', '4-7-8'] as const
export type BreathingMode = (typeof BREATHING_MODES)[number]

export const BREATH_PHASES = ['inhale', 'hold', 'exhale'] as const
export type BreathPhase = (typeof BREATH_PHASES)[number]

export interface BreathingPattern {
  mode: BreathingMode
  seconds: Record<BreathPhase, number>
  cycleSeconds: number
  label: string
  description: string
}

export const BREATHING_PATTERNS: Record<BreathingMode, BreathingPattern> = {
  '4-4-4': {
    mode: '4-4-4',
    seconds: { inhale: 4, hold: 4, exhale: 4 },
    cycleSeconds: 12,
    label: '4-4-4',
    description: 'Breathe in for 4, hold for 4, out for 4. Even and unhurried.',
  },
  '4-7-8': {
    mode: '4-7-8',
    seconds: { inhale: 4, hold: 7, exhale: 8 },
    cycleSeconds: 19,
    label: '4-7-8',
    description: 'Breathe in for 4, hold for 7, out for 8. A longer exhale.',
  },
}

/** The durations offered, in minutes. */
export const DURATION_CHOICES = [2, 5, 10] as const

export function patternFor(mode: BreathingMode): BreathingPattern {
  return BREATHING_PATTERNS[mode]
}

export interface BreathingPlan {
  mode: BreathingMode
  cycles: number
  totalSeconds: number
  requestedSeconds: number
  overshootSeconds: number
}

/** How many whole cycles fit a requested duration. Rounds up, never down. */
export function planSession(
  mode: BreathingMode,
  requestedMinutes: number,
): BreathingPlan {
  const pattern = patternFor(mode)
  const requestedSeconds = Math.max(0, requestedMinutes * 60)
  const exact = requestedSeconds / pattern.cycleSeconds
  // The epsilon stops a duration that divides exactly from rounding up because
  // of floating point, which would add a whole unwanted cycle.
  const cycles = Math.max(1, Math.ceil(exact - 1e-9))
  const totalSeconds = cycles * pattern.cycleSeconds
  return {
    mode,
    cycles,
    totalSeconds,
    requestedSeconds,
    overshootSeconds: totalSeconds - requestedSeconds,
  }
}

export interface PhaseState {
  phase: BreathPhase
  /** 1 based cycle number, for the counter. */
  cycle: number
  secondsRemaining: number
  /** 0..1 progress through this phase, for the orb animation. */
  phaseProgress: number
  /** 0..1 progress through the whole session. */
  sessionProgress: number
}

/**
 * Resolve the breathing state at a moment in time.
 *
 * Pure, and driven by elapsed seconds rather than by accumulated animation
 * frames, so a dropped frame or a backgrounded tab cannot make the timer drift
 * away from the animation.
 */
export function phaseAt(plan: BreathingPlan, elapsedSeconds: number): PhaseState {
  const pattern = patternFor(plan.mode)
  const clamped = Math.max(0, Math.min(elapsedSeconds, plan.totalSeconds))
  const inCycle = clamped % pattern.cycleSeconds

  let boundary = 0
  let phase: BreathPhase = 'inhale'
  for (const candidate of BREATH_PHASES) {
    boundary += pattern.seconds[candidate]
    if (inCycle < boundary || candidate === 'exhale') {
      phase = candidate
      break
    }
  }
  const phaseStart = boundary - pattern.seconds[phase]
  const phaseElapsed = inCycle - phaseStart
  const phaseLength = pattern.seconds[phase]

  const cycle = Math.min(
    Math.floor(clamped / pattern.cycleSeconds) + 1,
    plan.cycles,
  )

  return {
    phase,
    cycle: clamped >= plan.totalSeconds ? plan.cycles : cycle,
    secondsRemaining: Math.max(1, Math.ceil(phaseLength - phaseElapsed)),
    phaseProgress: phaseLength > 0 ? phaseElapsed / phaseLength : 0,
    sessionProgress: plan.totalSeconds > 0 ? clamped / plan.totalSeconds : 1,
  }
}

export function phaseLabel(phase: BreathPhase): string {
  switch (phase) {
    case 'inhale':
      return 'Breathe in'
    case 'hold':
      return 'Hold'
    case 'exhale':
      return 'Breathe out'
  }
}

/**
 * The orb scale at a moment in the cycle: grows on the inhale, stays wide on the
 * hold, shrinks on the exhale. Range is 0.655 to 1.
 */
export function orbScale(
  plan: BreathingPlan,
  elapsedSeconds: number,
  minScale = 0.655,
): number {
  const { phase, phaseProgress } = phaseAt(plan, elapsedSeconds)
  const min = minScale
  const max = 1
  switch (phase) {
    case 'inhale':
      return min + (max - min) * easeInOut(phaseProgress)
    case 'hold':
      return max
    case 'exhale':
      return max - (max - min) * easeInOut(phaseProgress)
  }
}

/** Smoothstep, which starts and ends gently. */
export function easeInOut(value: number): number {
  const t = Math.max(0, Math.min(value, 1))
  return t * t * (3 - 2 * t)
}

/** `mm:ss`, for the elapsed readout. */
export function formatDuration(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const minutes = Math.floor(safe / 60)
  return `${minutes}:${String(safe % 60).padStart(2, '0')}`
}
