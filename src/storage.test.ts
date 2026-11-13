import { afterEach, describe, expect, it } from 'vitest'
import { averageAnswers, loadEntries, addEntry, resetDemoData } from './storage'
import { SYNTHETIC_ENTRIES } from './data/synthetic'
import { CHECK_IN_QUESTIONS } from './data/prompts'

describe('averageAnswers', () => {
  it('averages the four check-in ratings to one decimal', () => {
    expect(averageAnswers({ settled: 3, clear: 4, kind: 3, present: 4 })).toBe(3.5)
    expect(averageAnswers({ settled: 5, clear: 5, kind: 5, present: 5 })).toBe(5)
    expect(averageAnswers({})).toBe(0)
  })
})

describe('local progress store', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('seeds synthetic sample data on first load', () => {
    const entries = loadEntries()
    expect(entries).toHaveLength(SYNTHETIC_ENTRIES.length)
    expect(entries.every((e) => e.synthetic)).toBe(true)
  })

  it('prepends a new check-in without dropping sample rows', () => {
    loadEntries()
    const next = addEntry({
      kind: 'check-in',
      at: '2026-11-13T07:00:00.000Z',
      answers: { settled: 4, clear: 4, kind: 4, present: 4 },
      average: 4,
    })
    expect(next[0]?.kind).toBe('check-in')
    expect(next[0]?.synthetic).toBeUndefined()
    expect(next).toHaveLength(SYNTHETIC_ENTRIES.length + 1)
  })

  it('resets back to the synthetic sample set', () => {
    addEntry({ kind: 'session', at: '2026-11-13T08:00:00.000Z', durationSeconds: 120 })
    const reset = resetDemoData()
    expect(reset).toEqual(SYNTHETIC_ENTRIES)
  })
})

describe('prompts', () => {
  it('covers every question id used by the average helper', () => {
    expect(CHECK_IN_QUESTIONS.map((q) => q.id).sort()).toEqual(
      ['clear', 'kind', 'present', 'settled'].sort(),
    )
  })
})
