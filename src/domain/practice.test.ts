/**
 * The practice merge arithmetic.
 *
 * The interesting case is the one a person actually hits: finish a breathing
 * exercise, then open the check-in and tick something extra. The seeded minutes
 * must survive, and the extra activity must not add zero.
 */

import { describe, expect, it } from 'vitest'

import {
  addPractice,
  clearActivity,
  clearDate,
  emptySeed,
  entriesForDate,
  mergeSeedWithChoice,
  seedForDate,
  type PracticeEntry,
  type PracticeLog,
} from './practice'

const entry = (
  activity: PracticeEntry['activity'],
  minutes: number,
  source: PracticeEntry['source'] = 'breathing',
): PracticeEntry => ({
  activity,
  minutes,
  completedAt: '2026-01-01T20:00:00.000Z',
  source,
})

describe('addPractice', () => {
  it('accumulates entries for the same activity', () => {
    const log = addPractice(addPractice({}, '2026-01-01', entry('breathing', 5)), '2026-01-01', entry('breathing', 3))
    expect(log['2026-01-01'].breathing).toHaveLength(2)
  })

  it('keeps different activities apart', () => {
    const log = addPractice(addPractice({}, '2026-01-01', entry('breathing', 5)), '2026-01-01', entry('grounding', 4, 'grounding'))
    expect(Object.keys(log['2026-01-01'])).toEqual(['breathing', 'grounding'])
  })

  it('keeps different dates apart', () => {
    const log = addPractice(addPractice({}, '2026-01-01', entry('breathing', 5)), '2026-01-02', entry('breathing', 2))
    expect(Object.keys(log)).toEqual(['2026-01-01', '2026-01-02'])
  })

  it('does not mutate the input log', () => {
    const original: PracticeLog = {}
    addPractice(original, '2026-01-01', entry('breathing', 5))
    expect(original).toEqual({})
  })
})

describe('clearActivity and clearDate', () => {
  it('removes one activity and leaves the rest', () => {
    const log = addPractice(addPractice({}, '2026-01-01', entry('breathing', 5)), '2026-01-01', entry('audio', 6, 'audio'))
    const cleared = clearActivity(log, '2026-01-01', 'breathing')
    expect(cleared['2026-01-01'].breathing).toBeUndefined()
    expect(cleared['2026-01-01'].audio).toHaveLength(1)
  })

  it('returns the same log when there is nothing to clear', () => {
    const log = addPractice({}, '2026-01-01', entry('breathing', 5))
    expect(clearActivity(log, '2026-01-01', 'walk')).toBe(log)
    expect(clearDate(log, '2026-02-02')).toBe(log)
  })

  it('drops a whole date', () => {
    const log = addPractice({}, '2026-01-01', entry('breathing', 5))
    expect(clearDate(log, '2026-01-01')).toEqual({})
  })
})

describe('entriesForDate', () => {
  it('is empty for an untouched date', () => {
    expect(entriesForDate({}, '2026-01-01')).toEqual([])
  })

  it('flattens every activity for the date', () => {
    const log = addPractice(addPractice({}, '2026-01-01', entry('breathing', 5)), '2026-01-01', entry('audio', 6, 'audio'))
    expect(entriesForDate(log, '2026-01-01')).toHaveLength(2)
  })
})

describe('seedForDate', () => {
  it('is empty with nothing pending', () => {
    expect(seedForDate({}, '2026-01-01')).toEqual(emptySeed())
  })

  it('sums minutes and lists activities in canonical order', () => {
    let log = addPractice({}, '2026-01-01', entry('audio', 6, 'audio'))
    log = addPractice(log, '2026-01-01', entry('breathing', 5))
    log = addPractice(log, '2026-01-01', entry('breathing', 2))
    const seed = seedForDate(log, '2026-01-01')
    expect(seed.activities).toEqual(['breathing', 'audio'])
    expect(seed.minutes).toBe(13)
    expect(seed.byActivity).toEqual({ breathing: 7, audio: 6 })
  })

  it('ignores another date', () => {
    const log = addPractice({}, '2026-01-02', entry('breathing', 5))
    expect(seedForDate(log, '2026-01-01').activities).toEqual([])
  })
})

describe('mergeSeedWithChoice', () => {
  const seed = {
    activities: ['breathing', 'audio'] as const,
    minutes: 11,
    byActivity: { breathing: 5, audio: 6 },
  }

  it('keeps the seeded minutes for chosen seeded activities', () => {
    expect(mergeSeedWithChoice(seed, ['breathing', 'audio'], 5).minutes).toBe(11)
  })

  it('adds the fallback for an activity the tools did not record', () => {
    const merged = mergeSeedWithChoice(seed, ['breathing', 'walk'], 5)
    expect(merged.minutes).toBe(10)
    expect(merged.activities).toEqual(['breathing', 'walk'])
  })

  it('drops minutes for a seeded activity that was unticked', () => {
    expect(mergeSeedWithChoice(seed, ['breathing'], 5).minutes).toBe(5)
  })

  it('never subtracts minutes for a negative fallback', () => {
    expect(mergeSeedWithChoice(emptySeed(), ['walk'], -10).minutes).toBe(0)
  })

  it('is empty when nothing is chosen', () => {
    expect(mergeSeedWithChoice(seed, [], 5)).toEqual({ activities: [], minutes: 0 })
  })
})
