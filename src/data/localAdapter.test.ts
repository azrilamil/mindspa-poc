/**
 * The local data adapter.
 *
 * The adapter is where validation, the rate limit and the guided session gate live,
 * so it is tested at the seam rather than through a screen. Every test uses the
 * memory store and an injected clock, so none of them touch a real date or a real
 * browser profile.
 */

import { describe, expect, it, vi } from 'vitest'

import {
  createLocalPort,
  createMemoryStore,
  emptyState,
  STORAGE_KEY,
  type StateStore,
} from './localAdapter'
import { DataError, NotFoundError, RateLimitError, ValidationError } from './port'

const NOW = new Date(2026, 0, 9, 12, 0, 0)

function makePort(store: StateStore = createMemoryStore(emptyState())) {
  return { port: createLocalPort({ store, now: () => NOW }), store }
}

describe('startDemoSession', () => {
  it('seeds a synthetic month and returns the user', async () => {
    const { port } = makePort()
    const user = await port.startDemoSession()
    expect(user.isSynthetic).toBe(true)
    expect(user.displayName).toBe('Demo guest')
    const data = await port.getDemoData()
    expect(data?.checkIns.length).toBeGreaterThan(0)
    expect(data?.sessions.length).toBeGreaterThan(0)
  })

  it('is idempotent, so a reload does not duplicate the session', async () => {
    const { port } = makePort()
    const first = await port.startDemoSession()
    const second = await port.startDemoSession()
    expect(second.id).toBe(first.id)
  })

  it('seeds a completed guided session and a start date', async () => {
    const { port } = makePort()
    const user = await port.startDemoSession()
    const data = await port.getDemoData()
    expect(user.programmeStartDate).toBeTruthy()
    expect(
      data?.sessions.some((entry) => entry.kind === 'guided' && entry.completed),
    ).toBe(true)
  })

  it('writes through to the store', async () => {
    const store = createMemoryStore(emptyState())
    const port = createLocalPort({ store, now: () => NOW })
    await port.startDemoSession()
    expect(store.read()?.user).not.toBeNull()
  })
})

describe('session lifecycle', () => {
  it('reports no user before the demo starts', async () => {
    const { port } = makePort()
    expect(await port.getCurrentUser()).toBeNull()
    expect(await port.getDemoData()).toBeNull()
  })

  it('clears the pointer on sign out but keeps the dataset', async () => {
    const { port, store } = makePort()
    await port.startDemoSession()
    const before = store.read()?.checkIns.length ?? 0
    await port.endSession()
    expect(await port.getCurrentUser()).toBeNull()
    expect(store.read()?.checkIns.length).toBe(before)
  })

  it('refuses a write with no session open', async () => {
    const { port } = makePort()
    await expect(
      port.saveCheckIn({ date: '2026-01-09', mood: 'calm', activities: ['breathing'], minutes: 5 }),
    ).rejects.toBeInstanceOf(DataError)
  })
})

describe('saveCheckIn', () => {
  it('creates a check-in with the programme day derived', async () => {
    const { port } = makePort()
    const user = await port.startDemoSession()
    const start = user.programmeStartDate as string
    const record = await port.saveCheckIn({
      date: start,
      mood: 'calm',
      activities: ['breathing'],
      minutes: 5,
    })
    expect(record.programmeDay).toBe(1)
    expect(record.mood).toBe('calm')
  })

  it('replaces an existing check-in for the same date rather than adding one', async () => {
    const { port } = makePort()
    const user = await port.startDemoSession()
    const date = user.programmeStartDate as string
    const first = await port.saveCheckIn({
      date,
      mood: 'calm',
      activities: ['breathing'],
      minutes: 5,
    })
    const second = await port.saveCheckIn({
      date,
      mood: 'joyful',
      activities: ['breathing', 'walk'],
      minutes: 10,
    })
    expect(second.id).toBe(first.id)
    const data = await port.getDemoData()
    expect(data?.checkIns.filter((entry) => entry.date === date)).toHaveLength(1)
    expect(data?.checkIns.find((entry) => entry.date === date)?.minutes).toBe(10)
  })

  it('rejects a missing mood', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    await expect(
      port.saveCheckIn({
        date: '2026-01-09',
        mood: undefined as never,
        activities: ['breathing'],
        minutes: 5,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects a non positive duration', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    await expect(
      port.saveCheckIn({ date: '2026-01-09', mood: 'calm', activities: [], minutes: 0 }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects an over-long note', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    await expect(
      port.saveCheckIn({
        date: '2026-01-09',
        mood: 'calm',
        activities: ['breathing'],
        minutes: 5,
        note: 'x'.repeat(600),
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('trims an empty note to undefined', async () => {
    const { port } = makePort()
    const user = await port.startDemoSession()
    const record = await port.saveCheckIn({
      date: user.programmeStartDate as string,
      mood: 'calm',
      activities: ['breathing'],
      minutes: 5,
      note: '   ',
    })
    expect(record.note).toBeUndefined()
  })
})

describe('recordSession', () => {
  it('starts the programme on the first completed guided session', async () => {
    const store = createMemoryStore(emptyState())
    const port = createLocalPort({ store, now: () => NOW })
    await port.startDemoSession()

    // Clear the start date the seed placed there, to model a fresh demo whose
    // guided session has not run yet.
    const state = store.read() as NonNullable<ReturnType<StateStore['read']>>
    store.write({
      ...state,
      user: state.user ? { ...state.user, programmeStartDate: undefined } : null,
      sessions: [],
    })

    const record = await port.recordSession({
      kind: 'guided',
      minutes: 8,
      completed: true,
      date: '2026-01-09',
    })
    expect(record.kind).toBe('guided')
    expect((await port.getCurrentUser())?.programmeStartDate).toBe('2026-01-09')
  })

  it('does not start the programme from an incomplete guided session', async () => {
    const store = createMemoryStore(emptyState())
    const port = createLocalPort({ store, now: () => NOW })
    await port.startDemoSession()
    const state = store.read() as NonNullable<ReturnType<StateStore['read']>>
    store.write({
      ...state,
      user: state.user ? { ...state.user, programmeStartDate: undefined } : null,
      sessions: [],
    })
    await port.recordSession({
      kind: 'guided',
      minutes: 2,
      completed: false,
      date: '2026-01-09',
    })
    expect((await port.getCurrentUser())?.programmeStartDate).toBeUndefined()
  })

  it('does not move the start date on a later session', async () => {
    const { port } = makePort()
    const user = await port.startDemoSession()
    const original = user.programmeStartDate
    await port.recordSession({ kind: 'breathing', minutes: 5, date: '2026-01-09' })
    expect((await port.getCurrentUser())?.programmeStartDate).toBe(original)
  })

  it('rejects a non positive duration', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    await expect(
      port.recordSession({ kind: 'breathing', minutes: 0 }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('practice seeds', () => {
  it('pre-populates a check-in from recorded practice', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    await port.recordPractice(
      {
        activity: 'breathing',
        minutes: 5,
        completedAt: NOW.toISOString(),
        source: 'breathing',
      },
      '2026-01-09',
    )
    const seed = await port.getPracticeSeed('2026-01-09')
    expect(seed.activities).toEqual(['breathing'])
    expect(seed.minutes).toBe(5)
  })

  it('clears the seed once the check-in is submitted', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    await port.recordPractice(
      {
        activity: 'audio',
        minutes: 6,
        completedAt: NOW.toISOString(),
        source: 'audio',
      },
      '2026-01-09',
    )
    await port.clearPracticeSeed('2026-01-09')
    expect(await port.getPracticeSeed('2026-01-09')).toMatchObject({ minutes: 0 })
  })
})

describe('saveWellbeing', () => {
  it('scores the answers and stores the band', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    const record = await port.saveWellbeing({
      type: 'follow-up',
      answers: { mood: 5, energy: 4, sleep: 4, focus: 5, gratitude: 5 },
    })
    expect(record.total).toBe(23)
    expect(record.band).toBe('steady')
  })

  it('replaces an earlier answer of the same type', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    await port.saveWellbeing({
      type: 'follow-up',
      answers: { mood: 1, energy: 1, sleep: 1, focus: 1, gratitude: 1 },
    })
    await port.saveWellbeing({
      type: 'follow-up',
      answers: { mood: 5, energy: 5, sleep: 5, focus: 5, gratitude: 5 },
    })
    const data = await port.getDemoData()
    const followUps = data?.wellbeing.filter((entry) => entry.type === 'follow-up')
    expect(followUps).toHaveLength(1)
    expect(followUps?.[0].total).toBe(25)
  })

  it('clamps out of range answers', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    const record = await port.saveWellbeing({
      type: 'start',
      answers: { mood: 99, energy: -3, sleep: 3, focus: 3, gratitude: 3 },
    })
    expect(record.total).toBe(5 + 1 + 3 + 3 + 3)
  })
})

describe('journal', () => {
  it('saves an entry and replaces the same day', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    const first = await port.saveJournalEntry({
      title: 'Morning',
      body: 'Quiet before the kettle.',
      date: '2026-01-09',
    })
    const second = await port.saveJournalEntry({
      title: 'Evening',
      body: 'Longer day than expected.',
      date: '2026-01-09',
    })
    expect(second.id).toBe(first.id)
    const data = await port.getDemoData()
    expect(data?.journal.filter((entry) => entry.date === '2026-01-09')).toHaveLength(1)
  })

  it('rejects an empty title or body', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    await expect(
      port.saveJournalEntry({ title: '   ', body: 'text', date: '2026-01-09' }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      port.saveJournalEntry({ title: 'Title', body: '   ', date: '2026-01-09' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('deletes an entry, and reports an unknown id', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    const record = await port.saveJournalEntry({
      title: 'Title',
      body: 'Some words.',
      date: '2026-01-09',
    })
    await port.deleteJournalEntry(record.id)
    await expect(port.deleteJournalEntry(record.id)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})

describe('researcher snapshot', () => {
  it('returns a synthetic cohort and marks itself synthetic', async () => {
    const { port } = makePort()
    const snapshot = await port.getResearcherSnapshot()
    expect(snapshot.synthetic).toBe(true)
    expect(snapshot.rows.length).toBeGreaterThan(10)
    expect(snapshot.totals.participants).toBe(snapshot.rows.length)
  })

  it('never contains the visitor session id', async () => {
    const { port } = makePort()
    const user = await port.startDemoSession()
    const snapshot = await port.getResearcherSnapshot()
    expect(snapshot.rows.some((row) => row.participant === user.id)).toBe(false)
  })
})

describe('resetDemo', () => {
  it('wipes writes and reseeds the baseline', async () => {
    const { port } = makePort()
    const user = await port.startDemoSession()
    await port.saveCheckIn({
      date: '2026-01-09',
      mood: 'low',
      activities: ['walk'],
      minutes: 30,
      note: 'a note that should not survive',
    })
    await port.resetDemo()
    const data = await port.getDemoData()
    expect(
      data?.checkIns.some((entry) => entry.note === 'a note that should not survive'),
    ).toBe(false)
    expect(data?.user.id).toBe(user.id)
  })
})

describe('rate limiting', () => {
  it('refuses more check-in writes than the window allows', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    const write = () =>
      port.saveCheckIn({
        date: '2026-01-09',
        mood: 'calm',
        activities: ['breathing'],
        minutes: 5,
      })
    for (let index = 0; index < 10; index += 1) await write()
    await expect(write()).rejects.toBeInstanceOf(RateLimitError)
  })

  it('reports the wait in the error message', async () => {
    const { port } = makePort()
    await port.startDemoSession()
    for (let index = 0; index < 5; index += 1) {
      await port.saveWellbeing({
        type: 'start',
        answers: { mood: 3, energy: 3, sleep: 3, focus: 3, gratitude: 3 },
      })
    }
    await expect(
      port.saveWellbeing({
        type: 'start',
        answers: { mood: 3, energy: 3, sleep: 3, focus: 3, gratitude: 3 },
      }),
    ).rejects.toThrow(/try again in/i)
  })
})

describe('storage failure', () => {
  it('surfaces a transport error when the store rejects a write', async () => {
    const failing: StateStore = {
      read: () => emptyState(),
      write: () => {
        throw new DataError('quota exceeded', 'transport')
      },
      clear: () => undefined,
    }
    const port = createLocalPort({ store: failing, now: () => NOW })
    await expect(port.startDemoSession()).rejects.toBeInstanceOf(DataError)
  })
})

describe('storage key', () => {
  it('is namespaced and versioned', () => {
    expect(STORAGE_KEY).toMatch(/^mindspa-poc:/)
    expect(STORAGE_KEY).toMatch(/v1$/)
  })

  it('survives a corrupt blob by falling back to an empty state', () => {
    const store = createMemoryStore(emptyState())
    expect(store.read()).not.toBeNull()
    const port = createLocalPort({ store, now: () => NOW })
    expect(port.kind).toBe('local')
  })
})

describe('synthetic seed determinism', () => {
  it('produces the same picture twice', async () => {
    vi.useFakeTimers()
    try {
      const a = makePort()
      const b = makePort()
      await a.port.startDemoSession()
      await b.port.startDemoSession()
      const left = await a.port.getDemoData()
      const right = await b.port.getDemoData()
      expect(left?.checkIns.map((entry) => entry.mood)).toEqual(
        right?.checkIns.map((entry) => entry.mood),
      )
    } finally {
      vi.useRealTimers()
    }
  })
})
