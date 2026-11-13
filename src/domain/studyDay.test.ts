/**
 * Programme calendar arithmetic.
 *
 * These tests pin the behaviour that the whole progress screen depends on: local
 * date maths, the streak rule with its one day grace, and an adherence figure that
 * counts against elapsed days rather than a fixed thirty.
 */

import { describe, expect, it } from 'vitest'

import {
  addDays,
  adherenceSummary,
  buildCalendar,
  currentStreak,
  dateOfProgrammeDay,
  daysBetween,
  elapsedDays,
  fromDateString,
  isFollowUpDue,
  programmeDayLabel,
  programmeDayNumber,
  recentDates,
  toDateString,
  today,
} from './studyDay'

describe('toDateString and today', () => {
  it('formats a local date with zero padding', () => {
    expect(toDateString(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })

  it('reads the local day, not the UTC one', () => {
    // 23:30 local on the 5th is the 6th in UTC for most offsets, and the local
    // answer is the one the programme uses.
    expect(today(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
  })
})

describe('fromDateString', () => {
  it('parses at local midnight', () => {
    const parsed = fromDateString('2026-03-01')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(2)
    expect(parsed.getDate()).toBe(1)
    expect(parsed.getHours()).toBe(0)
  })

  it('rejects a malformed date rather than guessing', () => {
    expect(() => fromDateString('01/03/2026')).toThrow(/YYYY-MM-DD/)
    expect(() => fromDateString('2026-3-1')).toThrow(/YYYY-MM-DD/)
    expect(() => fromDateString('')).toThrow()
  })
})

describe('addDays and daysBetween', () => {
  it('crosses a month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('crosses a year boundary backwards', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('counts whole local days', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30)
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
  })

  it('is stable across a daylight saving transition', () => {
    // Late March in the northern hemisphere and late October in the south: both
    // are around 90 days and neither may come back as 89 or 91.
    expect(daysBetween('2026-03-01', '2026-06-01')).toBe(92)
    expect(daysBetween('2026-10-01', '2027-01-01')).toBe(92)
  })
})

describe('programmeDayNumber', () => {
  it('returns null before the programme starts', () => {
    expect(programmeDayNumber(undefined, '2026-01-01')).toBeNull()
  })

  it('counts day one as the start date', () => {
    expect(programmeDayNumber('2026-01-01', '2026-01-01')).toBe(1)
    expect(programmeDayNumber('2026-01-01', '2026-01-11')).toBe(11)
  })

  it('goes below one before the start date', () => {
    expect(programmeDayNumber('2026-01-10', '2026-01-05')).toBe(-4)
  })
})

describe('dateOfProgrammeDay and elapsedDays', () => {
  it('round trips with the day number', () => {
    const start = '2026-02-20'
    for (const day of [1, 7, 30]) {
      expect(programmeDayNumber(start, dateOfProgrammeDay(start, day))).toBe(day)
    }
  })

  it('clamps elapsed days to the programme length', () => {
    expect(elapsedDays('2026-01-01', '2026-01-01')).toBe(1)
    expect(elapsedDays('2026-01-01', '2026-06-01')).toBe(30)
    expect(elapsedDays(undefined, '2026-01-01')).toBe(0)
  })
})

describe('isFollowUpDue', () => {
  it('opens exactly on day 30', () => {
    expect(isFollowUpDue('2026-01-01', '2026-01-29')).toBe(false)
    expect(isFollowUpDue('2026-01-01', '2026-01-30')).toBe(true)
    expect(isFollowUpDue('2026-01-01', '2026-02-10')).toBe(true)
  })

  it('is never due before the programme starts', () => {
    expect(isFollowUpDue(undefined, '2026-01-30')).toBe(false)
  })
})

describe('buildCalendar', () => {
  it('returns thirty locked slots before the programme starts', () => {
    const slots = buildCalendar(undefined, [], '2026-01-10')
    expect(slots).toHaveLength(30)
    expect(slots.every((slot) => slot.isFuture && slot.date === '')).toBe(true)
  })

  it('marks today as neither completed nor missed', () => {
    const slots = buildCalendar('2026-01-01', [], '2026-01-03')
    expect(slots[0]).toMatchObject({ completed: false, isMissed: true })
    expect(slots[2]).toMatchObject({ isToday: true, isMissed: false, isFuture: false })
    expect(slots[3].isFuture).toBe(true)
  })

  it('marks a logged day as completed', () => {
    const slots = buildCalendar('2026-01-01', ['2026-01-02'], '2026-01-04')
    expect(slots[1].completed).toBe(true)
    expect(slots[1].isMissed).toBe(false)
  })
})

describe('currentStreak', () => {
  const start = '2026-01-01'

  it('is zero with no logs', () => {
    expect(currentStreak(start, [], '2026-01-05')).toBe(0)
  })

  it('counts a run that ends today', () => {
    expect(
      currentStreak(start, ['2026-01-01', '2026-01-02', '2026-01-03'], '2026-01-03'),
    ).toBe(3)
  })

  it('counts a run that ends yesterday while today is still open', () => {
    expect(
      currentStreak(start, ['2026-01-01', '2026-01-02'], '2026-01-03'),
    ).toBe(2)
  })

  it('breaks once a whole day has been missed', () => {
    // Day 2 is missing, and today is day 3, so the run ending on day 1 is stale.
    expect(currentStreak(start, ['2026-01-01'], '2026-01-03')).toBe(0)
  })

  it('stops at the oldest gap in a longer run', () => {
    expect(
      currentStreak(
        start,
        ['2026-01-01', '2026-01-03', '2026-01-04', '2026-01-05'],
        '2026-01-05',
      ),
    ).toBe(3)
  })

  it('is zero when nothing has elapsed yet', () => {
    expect(currentStreak(start, [], '2025-12-30')).toBe(0)
  })
})

describe('adherenceSummary', () => {
  const start = '2026-01-01'

  it('counts against elapsed days, not thirty', () => {
    const summary = adherenceSummary(
      start,
      ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04'],
      '2026-01-04',
    )
    expect(summary.elapsedDays).toBe(4)
    expect(summary.loggedDays).toBe(4)
    expect(summary.adherencePercent).toBe(100)
    expect(summary.programmeComplete).toBe(false)
  })

  it('ignores dates outside the programme window', () => {
    const summary = adherenceSummary(
      start,
      ['2025-12-31', '2026-01-01', '2026-03-01'],
      '2026-01-02',
    )
    expect(summary.loggedDays).toBe(1)
    expect(summary.adherencePercent).toBe(50)
  })

  it('switches to a thirty day denominator once the programme ends', () => {
    const summary = adherenceSummary(start, ['2026-01-01'], '2026-02-15')
    expect(summary.elapsedDays).toBe(30)
    expect(summary.programmeComplete).toBe(true)
    expect(summary.adherencePercent).toBe(3)
  })

  it('returns a zeroed summary before the programme starts', () => {
    const summary = adherenceSummary(undefined, ['2026-01-01'], '2026-01-05')
    expect(summary).toMatchObject({
      elapsedDays: 0,
      loggedDays: 0,
      adherencePercent: 0,
      streak: 0,
      programmeComplete: false,
    })
  })
})

describe('labels and helpers', () => {
  it('labels a programme day', () => {
    expect(programmeDayLabel('2026-01-01', '2026-01-04')).toBe('Day 4 of 30')
    expect(programmeDayLabel(undefined, '2026-01-04')).toBe('Not started')
  })

  it('clamps the label after day thirty', () => {
    expect(programmeDayLabel('2026-01-01', '2026-03-01')).toBe('Day 30 of 30')
  })

  it('lists recent dates oldest first, ending today', () => {
    expect(recentDates(3, '2026-01-10')).toEqual([
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
    ])
  })
})
