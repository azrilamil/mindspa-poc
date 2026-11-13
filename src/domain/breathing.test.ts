/**
 * Breathing timing.
 *
 * The pacer is the part of the app where an off by one is immediately obvious to a
 * person mid exercise, so the arithmetic is pinned here rather than eyeballed in a
 * browser.
 */

import { describe, expect, it } from 'vitest'

import {
  BREATHING_MODES,
  BREATHING_PATTERNS,
  DURATION_CHOICES,
  easeInOut,
  formatDuration,
  orbScale,
  patternFor,
  phaseAt,
  phaseLabel,
  planSession,
} from './breathing'

describe('patterns', () => {
  it('defines both modes with the agreed cycle lengths', () => {
    expect(BREATHING_PATTERNS['4-4-4'].cycleSeconds).toBe(12)
    expect(BREATHING_PATTERNS['4-7-8'].cycleSeconds).toBe(19)
    expect(BREATHING_MODES).toEqual(['4-4-4', '4-7-8'])
  })

  it('adds the phase seconds back to the cycle length', () => {
    for (const mode of BREATHING_MODES) {
      const pattern = patternFor(mode)
      const sum =
        pattern.seconds.inhale + pattern.seconds.hold + pattern.seconds.exhale
      expect(sum).toBe(pattern.cycleSeconds)
    }
  })
})

describe('planSession', () => {
  it('rounds a five minute 4-4-4 session to whole cycles', () => {
    const plan = planSession('4-4-4', 5)
    expect(plan.cycles).toBe(25)
    expect(plan.totalSeconds).toBe(300)
    expect(plan.overshootSeconds).toBe(0)
  })

  it('rounds a five minute 4-7-8 session up rather than down', () => {
    const plan = planSession('4-7-8', 5)
    expect(plan.cycles).toBe(16)
    expect(plan.totalSeconds).toBe(304)
    expect(plan.overshootSeconds).toBe(4)
  })

  it('never plans zero cycles', () => {
    expect(planSession('4-4-4', 0).cycles).toBe(1)
    expect(planSession('4-4-4', -5).cycles).toBe(1)
  })

  it('does not over-round an exact division through floating point', () => {
    // 300 / 12 is exactly 25, and must not become 26.
    for (const minutes of DURATION_CHOICES) {
      const plan = planSession('4-4-4', minutes)
      expect(plan.cycles * 12).toBe(plan.totalSeconds)
      expect(plan.overshootSeconds).toBeLessThan(12)
    }
  })
})

describe('phaseAt', () => {
  const plan444 = planSession('4-4-4', 2)

  it('starts on the inhale of cycle one', () => {
    const state = phaseAt(plan444, 0)
    expect(state).toMatchObject({ phase: 'inhale', cycle: 1, secondsRemaining: 4 })
    expect(state.phaseProgress).toBe(0)
    expect(state.sessionProgress).toBe(0)
  })

  it('moves to the hold at four seconds', () => {
    expect(phaseAt(plan444, 4).phase).toBe('hold')
  })

  it('moves to the exhale at eight seconds', () => {
    expect(phaseAt(plan444, 8).phase).toBe('exhale')
  })

  it('rolls into the next cycle at twelve seconds', () => {
    const state = phaseAt(plan444, 12)
    expect(state.phase).toBe('inhale')
    expect(state.cycle).toBe(2)
  })

  it('holds the second position at the final instant', () => {
    const state = phaseAt(plan444, plan444.totalSeconds)
    expect(state.cycle).toBe(plan444.cycles)
    expect(state.sessionProgress).toBe(1)
  })

  it('clamps beyond the end rather than running past it', () => {
    const state = phaseAt(plan444, plan444.totalSeconds + 60)
    expect(state.sessionProgress).toBe(1)
    expect(state.cycle).toBe(plan444.cycles)
  })

  it('never reports zero seconds remaining', () => {
    for (let second = 0; second < plan444.totalSeconds; second += 0.5) {
      expect(phaseAt(plan444, second).secondsRemaining).toBeGreaterThan(0)
    }
  })

  it('walks the 4-7-8 phases at the right boundaries', () => {
    const plan = planSession('4-7-8', 2)
    expect(phaseAt(plan, 0).phase).toBe('inhale')
    expect(phaseAt(plan, 4).phase).toBe('hold')
    expect(phaseAt(plan, 11).phase).toBe('exhale')
    expect(phaseAt(plan, 19).phase).toBe('inhale')
  })
})

describe('orbScale', () => {
  const plan = planSession('4-4-4', 2)

  it('grows from the minimum to full on the inhale', () => {
    expect(orbScale(plan, 0)).toBeCloseTo(0.655, 3)
    expect(orbScale(plan, 3.9)).toBeGreaterThan(0.95)
  })

  it('stays full through the hold', () => {
    expect(orbScale(plan, 5)).toBe(1)
  })

  it('shrinks back on the exhale', () => {
    expect(orbScale(plan, 11.9)).toBeLessThan(0.7)
  })
})

describe('easeInOut', () => {
  it('is anchored at both ends', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(1)).toBe(1)
  })

  it('is symmetric about the midpoint', () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 6)
  })

  it('clamps out of range input', () => {
    expect(easeInOut(-1)).toBe(0)
    expect(easeInOut(2)).toBe(1)
  })
})

describe('labels and formatting', () => {
  it('labels each phase in plain English', () => {
    expect(phaseLabel('inhale')).toBe('Breathe in')
    expect(phaseLabel('hold')).toBe('Hold')
    expect(phaseLabel('exhale')).toBe('Breathe out')
  })

  it('formats a duration as minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(600)).toBe('10:00')
  })

  it('treats a bad duration as zero rather than printing NaN', () => {
    expect(formatDuration(Number.NaN)).toBe('0:00')
    expect(formatDuration(-4)).toBe('0:00')
  })
})
