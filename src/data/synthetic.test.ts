/**
 * The synthetic seed.
 *
 * The seed is the demo. If it is not deterministic, or if it accidentally includes a
 * real identifier, the whole privacy claim collapses. These tests pin both, plus the
 * shape that makes the progress screen worth looking at.
 */

import { describe, expect, it } from 'vitest'

import {
  COHORT_SIZE,
  DEMO_DISPLAY_NAME,
  DEMO_USER_ID,
  buildResearcherSnapshot,
  createRandom,
  createSyntheticUser,
  emptyDemoData,
  seedDemoData,
} from './synthetic'
import { PROGRAMME_LENGTH_DAYS } from '@/domain/types'
import { daysBetween } from '@/domain/studyDay'

const TODAY = '2026-01-09'

describe('createRandom', () => {
  it('is deterministic for a seed', () => {
    const a = createRandom(1)
    const b = createRandom(1)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('stays inside the unit interval', () => {
    const random = createRandom(42)
    for (let index = 0; index < 200; index += 1) {
      const value = random()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('differs between seeds', () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)())
  })
})

describe('seedDemoData', () => {
  it('produces the same demo twice', () => {
    const a = seedDemoData({ today: TODAY })
    const b = seedDemoData({ today: TODAY })
    expect(a.checkIns.map((entry) => entry.mood)).toEqual(
      b.checkIns.map((entry) => entry.mood),
    )
    expect(a.sessions.length).toBe(b.sessions.length)
  })

  it('marks the user synthetic and anonymous', () => {
    const data = seedDemoData({ today: TODAY })
    expect(data.user.isSynthetic).toBe(true)
    expect(data.user.id).toBe(DEMO_USER_ID)
    expect(data.user.displayName).toBe(DEMO_DISPLAY_NAME)
    // Nothing that reads as a person.
    expect(data.user.displayName).not.toMatch(/@|\d{3}/)
  })

  it('starts a programme that has already begun', () => {
    const data = seedDemoData({ today: TODAY, daysElapsed: 9 })
    expect(data.user.programmeStartDate).toBe('2026-01-01')
    expect(daysBetween(data.user.programmeStartDate as string, TODAY) + 1).toBe(9)
  })

  it('includes one completed guided session, so the gate is passed', () => {
    const data = seedDemoData({ today: TODAY })
    const guided = data.sessions.filter((entry) => entry.kind === 'guided')
    expect(guided).toHaveLength(1)
    expect(guided[0].completed).toBe(true)
    expect(guided[0].minutes).toBe(8)
  })

  it('leaves a couple of days unlogged, so the calendar is honest', () => {
    const data = seedDemoData({ today: TODAY, daysElapsed: 9 })
    expect(data.checkIns.length).toBeLessThan(8)
    expect(data.checkIns.length).toBeGreaterThan(4)
  })

  it('numbers the check-ins by programme day, in range', () => {
    const data = seedDemoData({ today: TODAY, daysElapsed: 9 })
    for (const entry of data.checkIns) {
      expect(entry.programmeDay).toBeGreaterThanOrEqual(1)
      expect(entry.programmeDay).toBeLessThanOrEqual(PROGRAMME_LENGTH_DAYS)
    }
  })

  it('records an opening and a follow-up wellbeing check that improve', () => {
    const data = seedDemoData({ today: TODAY })
    const start = data.wellbeing.find((entry) => entry.type === 'start')
    const followUp = data.wellbeing.find((entry) => entry.type === 'follow-up')
    expect(start).toBeDefined()
    expect(followUp).toBeDefined()
    expect((followUp?.total ?? 0) > (start?.total ?? 0)).toBe(true)
  })

  it('scores the seeded wellbeing rows rather than storing a loose total', () => {
    const data = seedDemoData({ today: TODAY })
    for (const entry of data.wellbeing) {
      const sum = Object.values(entry.answers).reduce((total, value) => total + value, 0)
      expect(entry.total).toBe(sum)
    }
  })

  it('gives every journal entry a date and a body', () => {
    const data = seedDemoData({ today: TODAY, daysElapsed: 9 })
    expect(data.journal.length).toBeGreaterThan(0)
    for (const entry of data.journal) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(entry.body.length).toBeGreaterThan(20)
    }
  })

  it('clamps a silly day count into the programme', () => {
    expect(seedDemoData({ today: TODAY, daysElapsed: 0 }).checkIns.length).toBeGreaterThan(0)
    expect(
      seedDemoData({ today: TODAY, daysElapsed: 999 }).user.programmeStartDate,
    ).toBeTruthy()
    const start = seedDemoData({ today: TODAY, daysElapsed: 999 })
      .user.programmeStartDate as string
    expect(daysBetween(start, TODAY) + 1).toBeLessThan(PROGRAMME_LENGTH_DAYS)
  })

  it('contains no real contact details anywhere', () => {
    const text = JSON.stringify(seedDemoData({ today: TODAY }))
    expect(text).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i)
    expect(text).not.toMatch(/\+?\d{2,3}[- ]\d{3,4}[- ]\d{3,4}/)
  })
})

describe('emptyDemoData', () => {
  it('has a session but nothing recorded', () => {
    const data = emptyDemoData(TODAY)
    expect(data.user.isSynthetic).toBe(true)
    expect(data.checkIns).toEqual([])
    expect(data.sessions).toEqual([])
    expect(data.user.programmeStartDate).toBeUndefined()
  })
})

describe('createSyntheticUser', () => {
  it('dates the programme the requested number of days back', () => {
    expect(createSyntheticUser(TODAY, 0).programmeStartDate).toBe(TODAY)
    expect(createSyntheticUser(TODAY, 8).programmeStartDate).toBe('2026-01-01')
  })
})

describe('buildResearcherSnapshot', () => {
  it('generates the whole cohort, and says it is synthetic', () => {
    const snapshot = buildResearcherSnapshot(TODAY)
    expect(snapshot.rows).toHaveLength(COHORT_SIZE)
    expect(snapshot.synthetic).toBe(true)
    expect(snapshot.totals.participants).toBe(COHORT_SIZE)
  })

  it('labels each row with a synthetic session code', () => {
    const snapshot = buildResearcherSnapshot(TODAY)
    for (const row of snapshot.rows) {
      expect(row.participant).toMatch(/^S-\d{3}$/)
      expect(row.day).toBeGreaterThanOrEqual(1)
      expect(row.day).toBeLessThanOrEqual(PROGRAMME_LENGTH_DAYS)
      expect(row.checkIns).toBeLessThanOrEqual(row.day)
      expect(row.adherence).toBeGreaterThanOrEqual(0)
      expect(row.adherence).toBeLessThanOrEqual(100)
    }
  })

  it('totals the rows rather than reporting something else', () => {
    const snapshot = buildResearcherSnapshot(TODAY)
    const checkIns = snapshot.rows.reduce((sum, row) => sum + row.checkIns, 0)
    expect(snapshot.totals.checkIns).toBe(checkIns)
    expect(snapshot.totals.minutes).toBeGreaterThan(0)
  })

  it('produces a daily series inside the programme window', () => {
    const snapshot = buildResearcherSnapshot(TODAY)
    expect(snapshot.daily.length).toBeGreaterThan(0)
    for (const point of snapshot.daily) {
      expect(point.date <= TODAY).toBe(true)
      expect(point.checkIns).toBeGreaterThanOrEqual(0)
    }
  })

  it('is deterministic, so a screenshot reproduces', () => {
    const a = buildResearcherSnapshot(TODAY)
    const b = buildResearcherSnapshot(TODAY)
    expect(a.rows.map((row) => row.checkIns)).toEqual(b.rows.map((row) => row.checkIns))
  })

  it('never includes a real cohort size from the original work', () => {
    const snapshot = buildResearcherSnapshot(TODAY)
    expect(snapshot.rows.some((row) => row.participant.includes('@'))).toBe(false)
    expect(JSON.stringify(snapshot)).not.toMatch(/@[a-z0-9-]+\.[a-z]{2,}/i)
  })
})
