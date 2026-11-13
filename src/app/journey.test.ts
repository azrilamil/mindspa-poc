/**
 * The journey state machine.
 *
 * The gate that matters: nobody reaches the home screen with a running programme
 * unless the guided session completed. These tests assert that as a property of the
 * machine rather than as a guard on one screen.
 */

import { describe, expect, it } from 'vitest'

import {
  canOpen,
  canTransition,
  emptySnapshot,
  homeAction,
  isFollowUpDue,
  needsSession,
  nextPhaseAfter,
  programmeDay,
  resolvePhase,
  type JourneySnapshot,
} from './journey'

const base: JourneySnapshot = {
  hasSession: true,
  hasStartCheck: true,
  hasGuidedSession: true,
  hasFollowUpCheck: false,
  hasLoggedToday: false,
  startDate: '2026-01-01',
  today: '2026-01-04',
}

describe('emptySnapshot', () => {
  it('starts with nothing done', () => {
    const snapshot = emptySnapshot('2026-01-04')
    expect(snapshot).toMatchObject({
      hasSession: false,
      hasStartCheck: false,
      hasGuidedSession: false,
      hasLoggedToday: false,
      today: '2026-01-04',
    })
  })
})

describe('resolvePhase', () => {
  it('is the landing without a session', () => {
    expect(resolvePhase({ ...base, hasSession: false })).toBe('landing')
  })

  it('is the opening check before it is answered', () => {
    expect(resolvePhase({ ...base, hasStartCheck: false })).toBe('wellbeingStart')
  })

  it('is the guided session until it is finished', () => {
    expect(resolvePhase({ ...base, hasGuidedSession: false })).toBe('guided')
  })

  it('is the guided session when there is no start date yet', () => {
    expect(resolvePhase({ ...base, startDate: undefined })).toBe('guided')
  })

  it('is home once the programme has started', () => {
    expect(resolvePhase(base)).toBe('home')
  })
})

describe('programmeDay', () => {
  it('counts from one on the start date', () => {
    expect(programmeDay({ ...base, today: '2026-01-01' })).toBe(1)
    expect(programmeDay(base)).toBe(4)
  })

  it('is null before the guided session', () => {
    expect(programmeDay({ ...base, startDate: undefined })).toBeNull()
  })

  it('clamps at thirty', () => {
    expect(programmeDay({ ...base, today: '2026-06-01' })).toBe(30)
  })
})

describe('isFollowUpDue', () => {
  it('opens on day thirty', () => {
    expect(isFollowUpDue({ ...base, today: '2026-01-30' })).toBe(true)
    expect(isFollowUpDue({ ...base, today: '2026-01-29' })).toBe(false)
  })

  it('closes once the follow-up is submitted', () => {
    expect(
      isFollowUpDue({ ...base, today: '2026-02-01', hasFollowUpCheck: true }),
    ).toBe(false)
  })
})

describe('homeAction', () => {
  it('asks for the guided session when it is outstanding', () => {
    expect(homeAction({ ...base, hasGuidedSession: false })).toBe('guided')
  })

  it('asks for the check-in when today is unlogged', () => {
    expect(homeAction(base)).toBe('checkIn')
  })

  it('asks for a practice once today is logged', () => {
    expect(homeAction({ ...base, hasLoggedToday: true })).toBe('practice')
  })

  it('puts the follow-up ahead of the check-in once due', () => {
    expect(homeAction({ ...base, today: '2026-02-01' })).toBe('followUp')
  })
})

describe('transitions', () => {
  it('permits the linear path', () => {
    expect(canTransition('splash', 'landing')).toBe(true)
    expect(canTransition('landing', 'wellbeingStart')).toBe(true)
    expect(canTransition('wellbeingStart', 'guided')).toBe(true)
    expect(canTransition('guided', 'home')).toBe(true)
  })

  it('refuses to skip the start check', () => {
    expect(canTransition('landing', 'guided')).toBe(false)
    expect(canTransition('wellbeingStart', 'home')).toBe(false)
  })

  it('lets every tool return home', () => {
    for (const phase of ['checkIn', 'tools', 'audio', 'journal', 'learn', 'progress'] as const) {
      expect(canTransition(phase, 'home')).toBe(true)
    }
  })

  it('names the single successor where there is one', () => {
    expect(nextPhaseAfter('guided')).toBe('home')
    expect(nextPhaseAfter('wellbeingStart')).toBe('guided')
    expect(nextPhaseAfter('home')).toBeNull()
  })
})

describe('needsSession', () => {
  it('is false only for the two entry phases', () => {
    expect(needsSession('splash')).toBe(false)
    expect(needsSession('landing')).toBe(false)
    expect(needsSession('home')).toBe(true)
    expect(needsSession('progress')).toBe(true)
  })
})

describe('canOpen', () => {
  it('permits the destinations offered from home', () => {
    for (const destination of ['checkIn', 'tools', 'audio', 'journal', 'learn', 'progress'] as const) {
      expect(canOpen(base, destination)).toBe(true)
    }
  })

  it('refuses a destination from a pre-session phase', () => {
    expect(canOpen({ ...base, hasStartCheck: false }, 'tools')).toBe(false)
  })

  it('permits the pair between progress and the follow-up check', () => {
    expect(canOpen(base, 'wellbeing')).toBe(true)
    expect(
      canOpen({ ...base, hasLoggedToday: true }, 'progress'),
    ).toBe(true)
  })
})
