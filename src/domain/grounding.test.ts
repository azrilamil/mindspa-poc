/**
 * Grounding steps.
 *
 * The count is the exercise, so it is asserted rather than trusted: five things,
 * four, three, two, one, fifteen in total, and five steps in the wizard.
 */

import { describe, expect, it } from 'vitest'

import {
  GROUNDING_ITEM_COUNT,
  GROUNDING_STEP_COUNT,
  GROUNDING_STEPS,
  SENSE_LABELS,
  groundingProgress,
  stepAt,
  stepLabel,
} from './grounding'
import type { Sense } from './types'

describe('grounding steps', () => {
  it('has five steps descending 5 4 3 2 1', () => {
    expect(GROUNDING_STEP_COUNT).toBe(5)
    expect(GROUNDING_STEPS.map((step) => step.count)).toEqual([5, 4, 3, 2, 1])
    expect(GROUNDING_ITEM_COUNT).toBe(15)
  })

  it('uses a distinct sense per step, in order', () => {
    const senses = GROUNDING_STEPS.map((step) => step.sense)
    expect(senses).toEqual(['sight', 'touch', 'sound', 'smell', 'taste'])
    expect(new Set(senses).size).toBe(GROUNDING_STEP_COUNT)
  })

  it('numbers the steps from one, contiguously', () => {
    expect(GROUNDING_STEPS.map((step) => step.step)).toEqual([1, 2, 3, 4, 5])
  })

  it('gives every step a prompt, an example and an affirmation', () => {
    for (const step of GROUNDING_STEPS) {
      expect(step.prompt.length).toBeGreaterThan(8)
      expect(step.example.length).toBeGreaterThan(8)
      expect(step.affirmation.length).toBeGreaterThan(8)
    }
  })

  it('writes the prompts in English', () => {
    const text = GROUNDING_STEPS.map(
      (step) => `${step.prompt} ${step.example} ${step.affirmation}`,
    ).join(' ')
    // A crude but effective guard: the reference app was written in Malay, and this
    // build is English only.
    expect(text).not.toMatch(/\b(yang|dan|anda|dengar|lihat|sentuh|hidu|rasa)\b/i)
  })
})

describe('stepAt', () => {
  it('finds a step by number', () => {
    expect(stepAt(1)?.count).toBe(5)
    expect(stepAt(5)?.count).toBe(1)
  })

  it('returns null outside the range', () => {
    expect(stepAt(0)).toBeNull()
    expect(stepAt(6)).toBeNull()
  })
})

describe('stepLabel', () => {
  it('reads as step X of 5', () => {
    expect(stepLabel(1)).toBe('Step 1 of 5')
    expect(stepLabel(5)).toBe('Step 5 of 5')
  })
})

describe('groundingProgress', () => {
  it('runs from one fifth to full', () => {
    expect(groundingProgress(1)).toBeCloseTo(0.2, 6)
    expect(groundingProgress(5)).toBe(1)
  })

  it('clamps out of range input', () => {
    expect(groundingProgress(0)).toBeCloseTo(0.2, 6)
    expect(groundingProgress(99)).toBe(1)
  })
})

describe('sense labels', () => {
  it('labels every sense', () => {
    const senses: Sense[] = ['sight', 'touch', 'sound', 'smell', 'taste']
    for (const sense of senses) {
      expect(SENSE_LABELS[sense].length).toBeGreaterThan(2)
    }
  })
})
