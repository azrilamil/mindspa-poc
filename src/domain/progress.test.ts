/**
 * Progress summary.
 *
 * The screen renders whatever this returns, so the arithmetic is tested here and
 * nowhere else: totals, the longest run, the weekly buckets and the wellbeing
 * comparison.
 */

import { describe, expect, it } from 'vitest'

import {
  formatMinutes,
  longestStreak,
  summariseProgress,
  weeklyCheckIns,
} from './progress'
import type {
  DailyCheckIn,
  JournalEntry,
  SessionRecord,
  WellbeingCheck,
} from './types'

function checkIn(date: string, day: number, mood: DailyCheckIn['mood'] = 'calm'): DailyCheckIn {
  return {
    id: `checkin-${day}`,
    date,
    mood,
    activities: ['breathing'],
    minutes: 5,
    programmeDay: day,
    createdAt: `${date}T19:00:00.000Z`,
  }
}

function session(date: string, minutes: number): SessionRecord {
  return {
    id: `session-${date}-${minutes}`,
    date,
    kind: 'breathing',
    minutes,
    completed: true,
    createdAt: `${date}T20:00:00.000Z`,
  }
}

function journal(date: string): JournalEntry {
  return {
    id: `journal-${date}`,
    date,
    title: 'Title',
    body: 'Body',
    createdAt: `${date}T21:00:00.000Z`,
  }
}

function wellbeing(
  type: 'start' | 'follow-up',
  total: number,
  createdAt: string,
): WellbeingCheck {
  return {
    id: `wellbeing-${type}`,
    date: createdAt.slice(0, 10),
    type,
    answers: { mood: 3, energy: 3, sleep: 3, focus: 3, gratitude: 3 },
    total,
    band: 'mixed',
    createdAt,
  }
}

describe('longestStreak', () => {
  it('is zero without a start date', () => {
    expect(longestStreak(undefined, [checkIn('2026-01-01', 1)])).toBe(0)
  })

  it('finds the longest run, not the last one', () => {
    const rows = [1, 2, 3, 4, 7, 8].map((day) =>
      checkIn(`2026-01-0${day}`, day),
    )
    expect(longestStreak('2026-01-01', rows)).toBe(4)
  })

  it('is zero with no check-ins', () => {
    expect(longestStreak('2026-01-01', [])).toBe(0)
  })
})

describe('weeklyCheckIns', () => {
  it('always returns five buckets', () => {
    expect(weeklyCheckIns([])).toEqual([0, 0, 0, 0, 0])
  })

  it('puts days one to six in the first bucket, thirty in the last', () => {
    const rows = [1, 6, 7, 12, 13, 18, 19, 24, 25, 30].map((day) =>
      checkIn(`2026-01-${String(day).padStart(2, '0')}`, day),
    )
    const buckets = weeklyCheckIns(rows)
    expect(buckets).toHaveLength(5)
    expect(buckets.reduce((sum, value) => sum + value, 0)).toBe(rows.length)
    expect(buckets[4]).toBe(2)
  })

  it('ignores days outside the programme', () => {
    const rows = [0, 31, -4].map((day) => checkIn('2026-01-01', day))
    expect(weeklyCheckIns(rows)).toEqual([0, 0, 0, 0, 0])
  })
})

describe('summariseProgress', () => {
  const today = '2026-01-05'
  const startDate = '2026-01-01'

  it('totals minutes from both sessions and check-ins', () => {
    const summary = summariseProgress({
      startDate,
      today,
      checkIns: [checkIn('2026-01-01', 1), checkIn('2026-01-02', 2)],
      sessions: [session('2026-01-01', 5), session('2026-01-02', 10)],
      journal: [journal('2026-01-02')],
      wellbeing: [],
    })
    expect(summary.totalMinutes).toBe(10 + 15)
    expect(summary.sessionCount).toBe(2)
    expect(summary.journalCount).toBe(1)
    expect(summary.averageMinutes).toBe(13)
  })

  it('reports the streak and the longest run separately', () => {
    const summary = summariseProgress({
      startDate,
      today,
      checkIns: [
        checkIn('2026-01-01', 1),
        checkIn('2026-01-02', 2),
        checkIn('2026-01-04', 4),
        checkIn('2026-01-05', 5),
      ],
      sessions: [],
      journal: [],
      wellbeing: [],
    })
    expect(summary.streak).toBe(2)
    expect(summary.longestStreak).toBe(2)
  })

  it('builds a thirty day calendar', () => {
    const summary = summariseProgress({
      startDate,
      today,
      checkIns: [checkIn('2026-01-01', 1)],
      sessions: [],
      journal: [],
      wellbeing: [],
    })
    expect(summary.calendar).toHaveLength(30)
    expect(summary.calendar[0].status).toBe('completed')
  })

  it('computes the wellbeing delta against the opening check', () => {
    const summary = summariseProgress({
      startDate,
      today,
      checkIns: [],
      sessions: [],
      journal: [],
      wellbeing: [
        wellbeing('start', 12, '2026-01-01T08:00:00.000Z'),
        wellbeing('follow-up', 19, '2026-01-05T08:00:00.000Z'),
      ],
    })
    expect(summary.wellbeing?.delta).toBe(7)
    expect(summary.wellbeing?.copy).toMatch(/Up 7 points/)
  })

  it('reports no delta when the follow-up is missing', () => {
    const summary = summariseProgress({
      startDate,
      today,
      checkIns: [],
      sessions: [],
      journal: [],
      wellbeing: [wellbeing('start', 12, '2026-01-01T08:00:00.000Z')],
    })
    expect(summary.wellbeing?.delta).toBeNull()
    expect(summary.wellbeing?.copy).toMatch(/No earlier check/)
  })

  it('uses the latest follow-up when there are several', () => {
    const summary = summariseProgress({
      startDate,
      today,
      checkIns: [],
      sessions: [],
      journal: [],
      wellbeing: [
        wellbeing('start', 10, '2026-01-01T08:00:00.000Z'),
        wellbeing('follow-up', 14, '2026-01-04T08:00:00.000Z'),
        wellbeing('follow-up', 20, '2026-01-05T08:00:00.000Z'),
      ],
    })
    expect(summary.wellbeing?.latest?.total).toBe(20)
    expect(summary.wellbeing?.delta).toBe(10)
  })

  it('survives an empty dataset', () => {
    const summary = summariseProgress({
      startDate: undefined,
      today,
      checkIns: [],
      sessions: [],
      journal: [],
      wellbeing: [],
    })
    expect(summary.loggedDays).toBe(0)
    expect(summary.streak).toBe(0)
    expect(summary.averageMinutes).toBe(0)
    expect(summary.adherencePercent).toBe(0)
  })
})

describe('formatMinutes', () => {
  it('reads in minutes under an hour', () => {
    expect(formatMinutes(0)).toBe('0 min')
    expect(formatMinutes(45)).toBe('45 min')
  })

  it('reads in whole hours with no remainder', () => {
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(120)).toBe('2 h')
  })

  it('reads in hours and minutes together', () => {
    expect(formatMinutes(80)).toBe('1 h 20 min')
  })

  it('never prints a negative duration', () => {
    expect(formatMinutes(-4)).toBe('0 min')
  })
})
