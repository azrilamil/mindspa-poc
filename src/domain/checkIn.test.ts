/**
 * Check-in rules.
 *
 * Three behaviours are pinned here because each one was a decision rather than an
 * obvious default: which dates are editable, what a valid check-in needs, and how
 * adherence is presented while the programme is still running.
 */

import { describe, expect, it } from 'vitest'

import {
  DAY_STATUS_LABELS,
  adherenceDisplay,
  badgesFor,
  buildCalendarDays,
  checkInWindow,
  dayKind,
  isEditable,
  mostCommonMood,
  programmeDayFor,
  statusCounts,
  validateCheckIn,
} from './checkIn'
import { MAX_NOTE_LENGTH } from './moods'
import type { DailyCheckIn } from './types'

const log = (date: string, mood: DailyCheckIn['mood'] = 'calm'): DailyCheckIn => ({
  id: `checkin-${date}`,
  date,
  mood,
  activities: ['breathing'],
  minutes: 5,
  programmeDay: 1,
  createdAt: `${date}T19:00:00.000Z`,
})

describe('dayKind and isEditable', () => {
  it('classifies past, today and future', () => {
    expect(dayKind('2026-01-01', '2026-01-02')).toBe('past')
    expect(dayKind('2026-01-02', '2026-01-02')).toBe('today')
    expect(dayKind('2026-01-03', '2026-01-02')).toBe('future')
  })

  it('allows today and earlier, and locks the future', () => {
    expect(isEditable('2026-01-01', '2026-01-02')).toBe(true)
    expect(isEditable('2026-01-02', '2026-01-02')).toBe(true)
    expect(isEditable('2026-01-03', '2026-01-02')).toBe(false)
  })
})

describe('checkInWindow', () => {
  it('opens on today, bounded by the programme start', () => {
    const window = checkInWindow('2026-01-01', '2026-01-04')
    expect(window.earliest).toBe('2026-01-01')
    expect(window.latest).toBe('2026-01-04')
    expect(window.defaultDate).toBe('2026-01-04')
  })

  it('stops at the final programme day', () => {
    const window = checkInWindow('2026-01-01', '2026-03-01')
    expect(window.latest).toBe('2026-01-30')
  })

  it('does not open before the programme starts', () => {
    const window = checkInWindow('2026-01-10', '2026-01-01')
    expect(window.latest).toBe('2026-01-01')
    expect(window.defaultDate).toBe('2026-01-10')
  })
})

describe('programmeDayFor', () => {
  it('numbers days from one', () => {
    expect(programmeDayFor('2026-01-01', '2026-01-01')).toBe(1)
    expect(programmeDayFor('2026-01-01', '2026-01-30')).toBe(30)
  })

  it('returns null outside the window', () => {
    expect(programmeDayFor('2026-01-01', '2025-12-31')).toBeNull()
    expect(programmeDayFor('2026-01-01', '2026-01-31')).toBeNull()
  })
})

describe('validateCheckIn', () => {
  const today = '2026-01-05'

  it('accepts a complete check-in', () => {
    const result = validateCheckIn(
      {
        mood: 'calm',
        activities: ['breathing', 'walk'],
        minutes: 10,
        note: '  a short practice  ',
      },
      '2026-01-05',
      today,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.values).toMatchObject({
      mood: 'calm',
      activities: ['breathing', 'walk'],
      minutes: 10,
      note: 'a short practice',
    })
  })

  it('requires a mood', () => {
    const result = validateCheckIn(
      { mood: null, activities: ['breathing'], minutes: 5, note: '' },
      today,
      today,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.mood).toBeTruthy()
  })

  it('requires at least one activity', () => {
    const result = validateCheckIn(
      { mood: 'calm', activities: [], minutes: 5, note: '' },
      today,
      today,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.activities).toBeTruthy()
  })

  it('requires a positive duration', () => {
    for (const minutes of [0, -3, Number.NaN]) {
      const result = validateCheckIn(
        { mood: 'calm', activities: ['breathing'], minutes, note: '' },
        today,
        today,
      )
      expect(result.ok).toBe(false)
    }
  })

  it('rejects a future date', () => {
    const result = validateCheckIn(
      { mood: 'calm', activities: ['breathing'], minutes: 5, note: '' },
      '2026-01-06',
      today,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.date).toBeTruthy()
  })

  it('rejects an over-long note', () => {
    const result = validateCheckIn(
      {
        mood: 'calm',
        activities: ['breathing'],
        minutes: 5,
        note: 'x'.repeat(MAX_NOTE_LENGTH + 1),
      },
      today,
      today,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.note).toBeTruthy()
  })

  it('rounds the duration and drops an empty note', () => {
    const result = validateCheckIn(
      { mood: 'calm', activities: ['breathing'], minutes: 7.6, note: '   ' },
      today,
      today,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.values.minutes).toBe(8)
    expect(result.values.note).toBeUndefined()
  })

  it('de-duplicates and orders the activities canonically', () => {
    const result = validateCheckIn(
      {
        mood: 'calm',
        activities: ['walk', 'breathing', 'walk'],
        minutes: 5,
        note: '',
      },
      today,
      today,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.values.activities).toEqual(['breathing', 'walk'])
  })
})

describe('adherenceDisplay', () => {
  it('is unstarted without a start date', () => {
    expect(adherenceDisplay([], undefined, '2026-01-05')).toMatchObject({
      loggedDays: 0,
      denominator: 0,
      percent: 0,
      caption: 'Not started',
    })
  })

  it('counts against elapsed days during the programme', () => {
    const display = adherenceDisplay(
      ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'],
      '2026-01-01',
      '2026-01-04',
    )
    expect(display.denominator).toBe(4)
    expect(display.percent).toBe(100)
    expect(display.caption).toBe('4 of 4 days so far')
  })

  it('switches to thirty once the programme ends', () => {
    const display = adherenceDisplay(
      ['2026-01-01', '2026-01-02'],
      '2026-01-01',
      '2026-02-10',
    )
    expect(display.denominator).toBe(30)
    expect(display.programmeComplete).toBe(true)
    expect(display.caption).toBe('2 of 30 days recorded')
  })

  it('ignores dates outside the window', () => {
    const display = adherenceDisplay(
      ['2025-12-30', '2026-01-01', '2026-04-01'],
      '2026-01-01',
      '2026-01-02',
    )
    expect(display.loggedDays).toBe(1)
  })
})

describe('buildCalendarDays', () => {
  it('produces thirty days with derived statuses', () => {
    const days = buildCalendarDays(
      '2026-01-01',
      [log('2026-01-01'), log('2026-01-02')],
      '2026-01-04',
    )
    expect(days).toHaveLength(30)
    expect(days[0].status).toBe('completed')
    expect(days[1].status).toBe('completed')
    expect(days[2].status).toBe('missed')
    expect(days[3].status).toBe('todayPending')
    expect(days[4].status).toBe('future')
  })

  it('carries the mood onto the matching day', () => {
    const days = buildCalendarDays('2026-01-01', [log('2026-01-01', 'joyful')], '2026-01-02')
    expect(days[0].mood).toBe('joyful')
    expect(days[1].mood).toBeNull()
  })

  it('marks only days up to today as editable', () => {
    const days = buildCalendarDays('2026-01-01', [], '2026-01-04')
    expect(days[0].editable).toBe(true)
    expect(days[3].editable).toBe(true)
    expect(days[4].editable).toBe(false)
  })

  it('locks every day before the programme starts', () => {
    const days = buildCalendarDays(undefined, [], '2026-01-04')
    expect(days.every((day) => day.editable === false)).toBe(true)
  })
})

describe('statusCounts', () => {
  it('counts each status and totals thirty', () => {
    const days = buildCalendarDays(
      '2026-01-01',
      [log('2026-01-01')],
      '2026-01-03',
    )
    const counts = statusCounts(days)
    expect(counts.completed).toBe(1)
    expect(counts.missed).toBe(1)
    expect(counts.todayPending).toBe(1)
    expect(counts.future).toBe(27)
  })
})

describe('day status labels', () => {
  it('names a missed day without scolding', () => {
    expect(DAY_STATUS_LABELS.missed).toBe('Not recorded')
    expect(DAY_STATUS_LABELS.missed).not.toMatch(/fail|broke|streak/i)
  })
})

describe('badgesFor', () => {
  it('awards nothing at the start', () => {
    expect(badgesFor(1, 1, false)).toEqual([])
  })

  it('awards the seven day badge on a seven day streak', () => {
    const badges = badgesFor(7, 7, false)
    expect(badges.map((badge) => badge.key)).toContain('streak-7')
  })

  it('awards halfway at fifteen days', () => {
    expect(badgesFor(15, 0, false).map((badge) => badge.key)).toContain('halfway')
  })

  it('awards completion only when the programme ends with thirty days', () => {
    expect(badgesFor(30, 0, false).map((badge) => badge.key)).not.toContain('complete')
    expect(badgesFor(30, 0, true).map((badge) => badge.key)).toContain('complete')
  })
})

describe('mostCommonMood', () => {
  it('is null with no check-ins', () => {
    expect(mostCommonMood([])).toBeNull()
  })

  it('finds the highest count', () => {
    expect(
      mostCommonMood([log('2026-01-01', 'calm'), log('2026-01-02', 'calm'), log('2026-01-03', 'low')]),
    ).toBe('calm')
  })
})
