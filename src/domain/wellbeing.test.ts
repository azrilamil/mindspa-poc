/**
 * Wellbeing scoring.
 *
 * The prompts are fresh for this build, and the scoring is a plain sum with three
 * descriptive bands. The tests pin both, so a copy change or a band boundary move
 * is visible rather than silent.
 */

import { describe, expect, it } from 'vitest'

import {
  BAND_COPY,
  WELLBEING_MAX,
  WELLBEING_MAX_TOTAL,
  WELLBEING_MIN,
  WELLBEING_MIN_TOTAL,
  WELLBEING_ORDER,
  WELLBEING_PROMPTS,
  bandFor,
  changeCopy,
  changeSince,
  clampAnswer,
  emptyAnswers,
  isComplete,
  scoreWellbeing,
} from './wellbeing'

describe('prompts', () => {
  it('asks exactly the five generic dimensions', () => {
    expect([...WELLBEING_ORDER]).toEqual([
      'mood',
      'energy',
      'sleep',
      'focus',
      'gratitude',
    ])
  })

  it('writes a question and two anchors for each dimension', () => {
    for (const dimension of WELLBEING_ORDER) {
      const prompt = WELLBEING_PROMPTS[dimension]
      expect(prompt.dimension).toBe(dimension)
      expect(prompt.question.endsWith('?')).toBe(true)
      expect(prompt.lowLabel.length).toBeGreaterThan(2)
      expect(prompt.highLabel.length).toBeGreaterThan(2)
    }
  })

  it('stays clear of clinical instrument names', () => {
    const text = WELLBEING_ORDER.map(
      (dimension) =>
        `${WELLBEING_PROMPTS[dimension].label} ${WELLBEING_PROMPTS[dimension].question}`,
    ).join(' ')
    // The reference build carried a clinical questionnaire. This build must not
    // inherit its name or its facet language.
    expect(text).not.toMatch(/FFMQ|Five Facet|facets?/i)
  })
})

describe('clampAnswer', () => {
  it('keeps values inside one to five', () => {
    expect(clampAnswer(0)).toBe(WELLBEING_MIN)
    expect(clampAnswer(1)).toBe(1)
    expect(clampAnswer(5)).toBe(5)
    expect(clampAnswer(9)).toBe(WELLBEING_MAX)
  })

  it('rounds a fractional answer', () => {
    expect(clampAnswer(3.4)).toBe(3)
    expect(clampAnswer(4.6)).toBe(5)
  })

  it('treats a non finite answer as the floor', () => {
    expect(clampAnswer(Number.NaN)).toBe(WELLBEING_MIN)
    expect(clampAnswer(Number.POSITIVE_INFINITY)).toBe(WELLBEING_MIN)
  })
})

describe('emptyAnswers', () => {
  it('starts every dimension at the midpoint', () => {
    const answers = emptyAnswers()
    expect(Object.keys(answers)).toHaveLength(WELLBEING_ORDER.length)
    expect(Object.values(answers).every((value) => value === 3)).toBe(true)
  })
})

describe('scoreWellbeing', () => {
  it('sums the five answers', () => {
    const scores = scoreWellbeing({
      mood: 4,
      energy: 3,
      sleep: 3,
      focus: 4,
      gratitude: 4,
    })
    expect(scores.total).toBe(18)
    expect(scores.band).toBe('mixed')
  })

  it('reports the full range as a percentage', () => {
    expect(
      scoreWellbeing({
        mood: 1,
        energy: 1,
        sleep: 1,
        focus: 1,
        gratitude: 1,
      }).percent,
    ).toBe(0)
    expect(
      scoreWellbeing({
        mood: 5,
        energy: 5,
        sleep: 5,
        focus: 5,
        gratitude: 5,
      }).percent,
    ).toBe(100)
  })

  it('clamps out of range answers before summing', () => {
    const scores = scoreWellbeing({
      mood: 99,
      energy: -4,
      sleep: 3,
      focus: 3,
      gratitude: 3,
    })
    expect(scores.total).toBe(5 + 1 + 3 + 3 + 3)
  })

  it('treats a missing answer as the floor', () => {
    const scores = scoreWellbeing({ mood: 5 })
    expect(scores.total).toBe(5 + 1 + 1 + 1 + 1)
  })

  it('keeps the total inside the declared range', () => {
    const scores = scoreWellbeing(emptyAnswers())
    expect(scores.total).toBeGreaterThanOrEqual(WELLBEING_MIN_TOTAL)
    expect(scores.total).toBeLessThanOrEqual(WELLBEING_MAX_TOTAL)
  })
})

describe('bandFor', () => {
  it('places the two cut points exactly', () => {
    expect(bandFor(20)).toBe('steady')
    expect(bandFor(19)).toBe('mixed')
    expect(bandFor(13)).toBe('mixed')
    expect(bandFor(12)).toBe('stretched')
  })

  it('has copy for every band', () => {
    for (const band of ['steady', 'mixed', 'stretched'] as const) {
      expect(BAND_COPY[band].label.length).toBeGreaterThan(2)
      expect(BAND_COPY[band].detail.length).toBeGreaterThan(20)
    }
  })
})

describe('isComplete', () => {
  it('is true only when every dimension is answered in range', () => {
    expect(isComplete(emptyAnswers())).toBe(true)
    expect(isComplete({ mood: 3 })).toBe(false)
    expect(isComplete({ ...emptyAnswers(), mood: 0 })).toBe(false)
    expect(isComplete({ ...emptyAnswers(), sleep: Number.NaN })).toBe(false)
  })
})

describe('changeSince and changeCopy', () => {
  it('returns null without an earlier total', () => {
    expect(changeSince(null, 18)).toBeNull()
    expect(changeCopy(null)).toMatch(/No earlier check/)
  })

  it('reports a rise, a fall and no change in words', () => {
    expect(changeSince(12, 18)).toBe(6)
    expect(changeCopy(6)).toBe('Up 6 points since your first check.')
    expect(changeCopy(1)).toBe('Up 1 point since your first check.')
    expect(changeCopy(-2)).toBe('Down 2 points since your first check.')
    expect(changeCopy(0)).toBe('Unchanged since your first check.')
  })
})
