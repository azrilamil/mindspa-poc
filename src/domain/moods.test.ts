/**
 * Moods and activities.
 *
 * The mood table is the one place where colour carries meaning, so these tests pin
 * the things that keep it readable: a label on every mood, a face that differs in
 * shape rather than only in hue, and no leftover Malay from the reference build.
 */

import { describe, expect, it } from 'vitest'

import {
  CHECK_IN_ACTIVITIES,
  DURATION_PILLS,
  MAX_NOTE_LENGTH,
  MOOD_CHOICES,
  MOOD_DEFINITIONS,
  MOOD_ORDER,
  activityLabel,
  isMood,
  moodDefinition,
} from './moods'
import { ACTIVITIES, MOODS } from './types'

describe('moods', () => {
  it('exposes every declared mood exactly once', () => {
    expect(new Set(MOOD_ORDER).size).toBe(MOOD_ORDER.length)
    expect([...MOOD_ORDER].sort()).toEqual([...MOODS].sort())
  })

  it('gives every mood a label, a face and two class sets', () => {
    for (const mood of MOODS) {
      const definition = MOOD_DEFINITIONS[mood]
      expect(definition.mood).toBe(mood)
      expect(definition.label.length).toBeGreaterThan(2)
      expect(definition.expression).toBeTruthy()
      expect(definition.selectedClass.length).toBeGreaterThan(4)
      expect(definition.idleClass.length).toBeGreaterThan(4)
      expect(definition.dotClass.startsWith('bg-')).toBe(true)
    }
  })

  it('labels each mood with a distinct word', () => {
    const labels = MOOD_CHOICES.map((definition) => definition.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('uses every face expression', () => {
    const expressions = new Set(MOOD_CHOICES.map((definition) => definition.expression))
    expect(expressions.size).toBeGreaterThanOrEqual(5)
  })

  it('marks some moods pleasant and some not', () => {
    expect(MOOD_CHOICES.some((definition) => definition.pleasant)).toBe(true)
    expect(MOOD_CHOICES.some((definition) => !definition.pleasant)).toBe(true)
  })

  it('resolves a definition and recognises a mood string', () => {
    expect(moodDefinition('calm').label).toBe('Calm')
    expect(isMood('calm')).toBe(true)
    expect(isMood('tenang')).toBe(false)
    expect(isMood('')).toBe(false)
  })

  it('carries no Malay moods from the reference build', () => {
    const labelText = MOOD_CHOICES.map((definition) => definition.label).join(' ')
    expect(labelText).not.toMatch(
      /\b(marah|rimas|bosan|tenang|kecewa|gembala|gembira|cemas|mengantuk|sedih)\b/i,
    )
  })
})

describe('activities', () => {
  it('offers a distinct subset of the stored activities', () => {
    const offered = CHECK_IN_ACTIVITIES.map((definition) => definition.activity)
    expect(new Set(offered).size).toBe(offered.length)
    for (const activity of offered) expect(ACTIVITIES).toContain(activity)
  })

  it('gives every activity a label and a detail line', () => {
    for (const definition of CHECK_IN_ACTIVITIES) {
      expect(definition.label.length).toBeGreaterThan(2)
      expect(definition.detail.length).toBeGreaterThan(4)
    }
  })

  it('resolves a label, and falls back to the raw id', () => {
    expect(activityLabel('breathing')).toBe('Breathing exercise')
    expect(activityLabel('unknown-activity')).toBe('unknown-activity')
  })
})

describe('check-in constants', () => {
  it('offers four duration pills in ascending order', () => {
    expect([...DURATION_PILLS]).toEqual([5, 10, 15, 30])
  })

  it('caps the note at a size one row can hold', () => {
    expect(MAX_NOTE_LENGTH).toBeGreaterThan(100)
    expect(MAX_NOTE_LENGTH).toBeLessThanOrEqual(2000)
  })
})
